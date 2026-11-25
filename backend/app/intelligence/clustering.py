"""
WaterTrace AI — Spatial-Temporal Incident Correlation Engine

Pipeline:
  1. Load recent unlinked reports from Supabase
  2. Geographic candidate filtering (PostGIS ST_DWithin)
  3. Temporal proximity check
  4. Category compatibility scoring
  5. DBSCAN clustering on (lat, lon, time_normalized)
  6. Evidence confidence calculation (transparent formula)
  7. Investigation priority calculation
  8. Human-readable explanation generation
  9. Persist candidate incidents

Design principles:
  - Never count multiple reports from same user as independent confirmations
  - Preserve original reports if a cluster is later rejected
  - All weights are labelled as prototype parameters, not validated science
"""

import math
import hashlib
from datetime import datetime, timezone, timedelta
from collections import defaultdict
from typing import Optional

import numpy as np
from sklearn.cluster import DBSCAN
import pandas as pd

from app.core.config import settings
# get_supabase_admin imported lazily inside functions to allow offline unit testing


# ---------------------------------------------------------------------------
# Category compatibility matrix
# A score of 1.0 = strong relationship, 0.0 = unlikely relationship
# These are initial prototype heuristics, not validated infrastructure rules.
# ---------------------------------------------------------------------------
COMPATIBILITY: dict[tuple[str, str], float] = {
    ("NO_SUPPLY", "NO_SUPPLY"): 1.0,
    ("NO_SUPPLY", "LOW_PRESSURE"): 0.8,
    ("NO_SUPPLY", "INTERMITTENT_SUPPLY"): 0.7,
    ("NO_SUPPLY", "LEAKAGE"): 0.6,
    ("LOW_PRESSURE", "LOW_PRESSURE"): 1.0,
    ("LOW_PRESSURE", "INTERMITTENT_SUPPLY"): 0.8,
    ("LOW_PRESSURE", "LEAKAGE"): 0.6,
    ("LEAKAGE", "LEAKAGE"): 1.0,
    ("LEAKAGE", "INFRASTRUCTURE_DAMAGE"): 0.9,
    ("LEAKAGE", "DISCOLOURED_WATER"): 0.5,
    ("DISCOLOURED_WATER", "DISCOLOURED_WATER"): 1.0,
    ("DISCOLOURED_WATER", "UNUSUAL_SMELL"): 0.7,
    ("UNUSUAL_SMELL", "UNUSUAL_SMELL"): 1.0,
    ("INFRASTRUCTURE_DAMAGE", "INFRASTRUCTURE_DAMAGE"): 1.0,
    ("INTERMITTENT_SUPPLY", "INTERMITTENT_SUPPLY"): 1.0,
}


def _get_compatibility(cat_a: str, cat_b: str) -> float:
    """Return compatibility score between two categories (symmetric)."""
    if cat_a == cat_b:
        return 1.0
    return max(
        COMPATIBILITY.get((cat_a, cat_b), 0.2),
        COMPATIBILITY.get((cat_b, cat_a), 0.2),
    )


def _haversine_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate geographic distance in meters using Haversine formula."""
    R = 6_371_000  # Earth radius in meters
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _extract_coordinates(location_wkb: str) -> tuple[float, float] | None:
    """
    Extract lat/lon from PostGIS EWKB hex string.
    Supabase returns geography as WKB hex.
    Returns (latitude, longitude) or None.
    """
    try:
        from shapely import wkb as shapely_wkb
        import binascii
        raw = binascii.unhexlify(location_wkb)
        point = shapely_wkb.loads(raw, include_srid=True)
        # PostGIS POINT(lon, lat)
        return (point.y, point.x)
    except Exception:
        return None


def _load_recent_reports(hours_back: int = 48) -> list[dict]:
    """Load unlinked reports from Supabase within the recent time window."""
    from app.core.supabase import get_supabase_admin
    supabase = get_supabase_admin()
    since = (datetime.now(timezone.utc) - timedelta(hours=hours_back)).isoformat()

    result = (
        supabase.table("reports")
        .select("id, user_id, issue_category, occurrence_time, location, is_demo")
        .gte("occurrence_time", since)
        .in_("processing_status", ["PENDING", "CLASSIFIED"])
        .execute()
    )
    return result.data or []


def _build_dataframe(reports: list[dict]) -> pd.DataFrame:
    """Convert raw report rows into a structured DataFrame with coordinates."""
    rows = []
    for r in reports:
        coords = _extract_coordinates(r.get("location", ""))
        if not coords:
            continue
        lat, lon = coords
        occ = r.get("occurrence_time")
        if isinstance(occ, str):
            occ = datetime.fromisoformat(occ.replace("Z", "+00:00"))

        rows.append(
            {
                "id": r["id"],
                "user_id": r["user_id"],
                "category": r.get("issue_category", "OTHER"),
                "lat": lat,
                "lon": lon,
                "occurrence_ts": occ.timestamp() if occ else 0.0,
                "is_demo": r.get("is_demo", False),
            }
        )
    return pd.DataFrame(rows)


def _run_dbscan(df: pd.DataFrame) -> np.ndarray:
    """
    Run DBSCAN on a normalized feature matrix.

    Features:
      - lat, lon converted to approximate meters offset from centroid
      - time normalized so that cluster_time_window_minutes == cluster_radius_meters

    eps is set to cluster_radius_meters in the normalized space.
    """
    if len(df) < 2:
        return np.full(len(df), -1)

    # Convert lat/lon to approximate meters (local projection around centroid)
    lat0, lon0 = df["lat"].mean(), df["lon"].mean()
    meters_per_lat = 111_320.0
    meters_per_lon = 111_320.0 * math.cos(math.radians(lat0))

    x = (df["lat"] - lat0) * meters_per_lat
    y = (df["lon"] - lon0) * meters_per_lon

    # Normalize time: scale time window to equal the spatial radius
    # So 1 meter spatially == 1 "meter" temporally at the boundary
    radius_m = settings.cluster_radius_meters
    time_window_s = settings.cluster_time_window_minutes * 60
    t_scaled = (df["occurrence_ts"] - df["occurrence_ts"].min()) / time_window_s * radius_m

    features = np.column_stack([x.values, y.values, t_scaled.values])

    db = DBSCAN(
        eps=radius_m,
        min_samples=settings.cluster_min_reports,
        metric="euclidean",
    )
    return db.fit_predict(features)


def _calculate_evidence_confidence(
    report_ids: list[str],
    users: list[str],
    categories: list[str],
    distances: list[float],
    time_diffs_min: list[float],
    radius: float,
    time_window: float,
) -> float:
    """
    Transparent evidence confidence formula.
    All weights are prototype parameters.

    Score components:
      - Independent reporters (0–0.35): unique users relative to report count
      - Geographic concentration (0–0.25): how tight the cluster is
      - Temporal concentration (0–0.20): how close in time
      - Category compatibility (0–0.20): how related the symptoms are
    """
    n = len(report_ids)
    unique_users = len(set(users))

    # Independent reporter score
    reporter_ratio = min(unique_users / max(n, 1), 1.0)
    reporter_score = reporter_ratio * 0.35

    # Geographic concentration: mean distance / radius (inverted)
    if distances:
        mean_dist = sum(distances) / len(distances)
        geo_score = max(0.0, (1.0 - mean_dist / radius)) * 0.25
    else:
        geo_score = 0.25

    # Temporal concentration
    if time_diffs_min:
        mean_time = sum(time_diffs_min) / len(time_diffs_min)
        time_score = max(0.0, (1.0 - mean_time / time_window)) * 0.20
    else:
        time_score = 0.20

    # Category compatibility: mean pairwise compatibility
    compat_scores = []
    for i in range(len(categories)):
        for j in range(i + 1, len(categories)):
            compat_scores.append(_get_compatibility(categories[i], categories[j]))
    compat_score = (sum(compat_scores) / max(len(compat_scores), 1)) * 0.20

    total = reporter_score + geo_score + time_score + compat_score
    return round(min(total, 1.0), 3)


def _calculate_priority(
    unique_users: int,
    evidence_confidence: float,
    categories: list[str],
    radius: float,
    latest_report_age_hours: float,
) -> float:
    """
    Transparent investigation priority formula.
    Prototype weights only — not scientifically validated.
    """
    # Severity map (prototype)
    severity_map = {
        "LEAKAGE": 0.9,
        "INFRASTRUCTURE_DAMAGE": 0.9,
        "NO_SUPPLY": 0.8,
        "DISCOLOURED_WATER": 0.7,
        "UNUSUAL_SMELL": 0.7,
        "LOW_PRESSURE": 0.5,
        "INTERMITTENT_SUPPLY": 0.4,
        "OTHER": 0.3,
    }
    max_severity = max((severity_map.get(c, 0.3) for c in categories), default=0.3)

    reporter_factor = min(unique_users / 10, 1.0) * 0.30
    confidence_factor = evidence_confidence * 0.25
    severity_factor = max_severity * 0.25
    recency_factor = max(0.0, (1.0 - latest_report_age_hours / 24)) * 0.20

    return round(min(reporter_factor + confidence_factor + severity_factor + recency_factor, 1.0), 3)


def _generate_explanation(
    categories: list[str],
    unique_users: int,
    total_reports: int,
    radius: float,
    time_window_min: float,
    evidence_confidence: float,
) -> str:
    """Generate a transparent, data-driven human-readable explanation."""
    cat_counts: dict[str, int] = defaultdict(int)
    for c in categories:
        cat_counts[c] += 1

    top_cats = sorted(cat_counts.items(), key=lambda x: -x[1])[:3]
    cat_summary = ", ".join(
        f"{count} report{'s' if count > 1 else ''} of {cat.replace('_', ' ').title()}"
        for cat, count in top_cats
    )

    conf_label = (
        "high" if evidence_confidence >= 0.7
        else "moderate" if evidence_confidence >= 0.45
        else "low"
    )

    return (
        f"{total_reports} report{'s' if total_reports > 1 else ''} "
        f"from {unique_users} independent reporter{'s' if unique_users > 1 else ''} "
        f"were submitted within approximately {int(radius)} metres "
        f"over a {int(time_window_min)}-minute period. "
        f"Reported issues include: {cat_summary}. "
        f"Evidence confidence is {conf_label} ({evidence_confidence:.0%}). "
        f"These observations may represent a shared infrastructure issue and warrant investigation. "
        f"This is a candidate incident generated by automated analysis — not a confirmed infrastructure failure."
    )


def run_clustering_pipeline() -> dict:
    """
    Full clustering pipeline. Called by the API /incidents/analyze endpoint.
    Returns a summary of incidents created or updated.
    """
    from app.core.supabase import get_supabase_admin
    supabase = get_supabase_admin()
    reports = _load_recent_reports(hours_back=72)

    if len(reports) < settings.cluster_min_reports:
        return {"incidents_created": 0, "incidents_updated": 0, "reports_processed": len(reports)}

    df = _build_dataframe(reports)
    if len(df) < settings.cluster_min_reports:
        return {"incidents_created": 0, "incidents_updated": 0, "reports_processed": len(reports)}

    labels = _run_dbscan(df)
    df["cluster"] = labels

    incidents_created = 0
    incidents_updated = 0

    for cluster_id in set(labels):
        if cluster_id == -1:
            continue  # Noise — not enough to form a candidate incident

        cluster_df = df[df["cluster"] == cluster_id]

        report_ids = cluster_df["id"].tolist()
        users = cluster_df["user_id"].tolist()
        categories = cluster_df["category"].tolist()
        unique_users = len(set(users))

        # Compute centroid
        center_lat = cluster_df["lat"].mean()
        center_lon = cluster_df["lon"].mean()

        # Distances from centroid
        distances = [
            _haversine_meters(center_lat, center_lon, row["lat"], row["lon"])
            for _, row in cluster_df.iterrows()
        ]
        affected_radius = max(distances) if distances else 0.0

        # Time window
        time_diffs = []
        occ_times = cluster_df["occurrence_ts"].tolist()
        min_t = min(occ_times)
        for t in occ_times:
            time_diffs.append((t - min_t) / 60)
        time_window = max(time_diffs) if time_diffs else 0.0

        # Latest report age
        latest_ts = max(occ_times)
        age_hours = (datetime.now(timezone.utc).timestamp() - latest_ts) / 3600

        evidence_confidence = _calculate_evidence_confidence(
            report_ids=report_ids,
            users=users,
            categories=categories,
            distances=distances,
            time_diffs_min=time_diffs,
            radius=settings.cluster_radius_meters,
            time_window=settings.cluster_time_window_minutes,
        )

        priority = _calculate_priority(
            unique_users=unique_users,
            evidence_confidence=evidence_confidence,
            categories=categories,
            radius=affected_radius,
            latest_report_age_hours=age_hours,
        )

        explanation = _generate_explanation(
            categories=categories,
            unique_users=unique_users,
            total_reports=len(report_ids),
            radius=affected_radius or settings.cluster_radius_meters,
            time_window_min=time_window or settings.cluster_time_window_minutes,
            evidence_confidence=evidence_confidence,
        )

        primary_categories = list(
            {c for c in categories}
        )

        is_demo = bool(cluster_df["is_demo"].any())

        # Build a stable cluster fingerprint to avoid duplicate incidents
        sorted_ids = sorted(report_ids)
        fingerprint = hashlib.md5(",".join(sorted_ids).encode()).hexdigest()

        # Check if incident with these exact reports already exists
        # (simple approach: check by looking for incident_reports overlap)
        existing = (
            supabase.table("incident_reports")
            .select("incident_id")
            .in_("report_id", report_ids)
            .execute()
        )

        incident_id_set = {row["incident_id"] for row in (existing.data or [])}

        if incident_id_set:
            # Update existing incident
            incident_id = list(incident_id_set)[0]
            supabase.table("incidents").update(
                {
                    "total_report_count": len(report_ids),
                    "independent_reporter_count": unique_users,
                    "evidence_confidence": evidence_confidence,
                    "investigation_priority": priority,
                    "explanation": explanation,
                    "affected_radius_meters": affected_radius,
                    "primary_categories": primary_categories,
                }
            ).eq("id", incident_id).execute()
            incidents_updated += 1
        else:
            # Create new candidate incident
            top_category = max(set(categories), key=categories.count)
            title = f"Possible {top_category.replace('_', ' ').title()} — {unique_users} Reporter{'s' if unique_users > 1 else ''}"

            new_incident = supabase.table("incidents").insert(
                {
                    "title": title,
                    "center_location": f"SRID=4326;POINT({center_lon} {center_lat})",
                    "affected_radius_meters": affected_radius,
                    "primary_categories": primary_categories,
                    "independent_reporter_count": unique_users,
                    "total_report_count": len(report_ids),
                    "evidence_confidence": evidence_confidence,
                    "investigation_priority": priority,
                    "explanation": explanation,
                    "status": "DETECTED",
                    "is_demo": is_demo,
                }
            ).execute()

            if new_incident.data:
                incident_id = new_incident.data[0]["id"]

                # Link reports to incident
                links = [
                    {"incident_id": incident_id, "report_id": rid}
                    for rid in report_ids
                ]
                supabase.table("incident_reports").insert(links).execute()

                # Update report processing status
                supabase.table("reports").update(
                    {"processing_status": "INCIDENT_LINKED"}
                ).in_("id", report_ids).execute()

                incidents_created += 1

    return {
        "incidents_created": incidents_created,
        "incidents_updated": incidents_updated,
        "reports_processed": len(df),
        "clusters_found": len([l for l in set(labels) if l != -1]),
    }
