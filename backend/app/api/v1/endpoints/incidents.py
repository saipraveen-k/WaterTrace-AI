from fastapi import APIRouter, Depends, HTTPException, Query
from app.core.security import get_current_user, get_optional_user, require_role
from app.core.supabase import get_supabase_admin
from app.schemas.incidents import (
    IncidentResponse, IncidentListResponse, IncidentStatusUpdate,
    IncidentMapItem, IncidentEvent
)
from app.intelligence.clustering import run_clustering_pipeline
from datetime import datetime, timezone

router = APIRouter()


def _extract_coords_from_incident(inc: dict) -> dict:
    loc = inc.pop("center_location", None)
    lat, lon = None, None
    if loc and isinstance(loc, str):
        try:
            from shapely import wkb
            import binascii
            raw = binascii.unhexlify(loc)
            point = wkb.loads(raw, include_srid=True)
            lat, lon = point.y, point.x
        except Exception:
            pass
    inc["latitude"] = lat
    inc["longitude"] = lon
    return inc


@router.get("", response_model=IncidentListResponse)
async def list_incidents(
    status_filter: str | None = Query(None, alias="status"),
    min_confidence: float | None = Query(None),
    current_user: dict | None = Depends(get_optional_user),
):
    supabase = get_supabase_admin()
    query = supabase.table("incidents").select("*", count="exact")

    # Guests and citizens see only public statuses
    role = (current_user or {}).get("role", "guest")
    if role not in ("admin", "maintenance"):
        query = query.in_("status", ["DETECTED", "NEEDS_REVIEW", "UNDER_INVESTIGATION", "ACTION_INITIATED", "RESOLVED"])

    if status_filter:
        query = query.eq("status", status_filter)
    if min_confidence is not None:
        query = query.gte("evidence_confidence", min_confidence)

    result = query.order("investigation_priority", desc=True).execute()
    items = [_extract_coords_from_incident(r) for r in (result.data or [])]
    return {"items": items, "total": result.count or 0}


@router.get("/map", response_model=list[IncidentMapItem])
async def get_map_incidents(
    current_user: dict | None = Depends(get_optional_user),
):
    """Lightweight incident list for map rendering — public endpoint."""
    supabase = get_supabase_admin()
    result = (
        supabase.table("incidents")
        .select(
            "id, title, center_location, affected_radius_meters, status, "
            "primary_categories, independent_reporter_count, evidence_confidence, "
            "investigation_priority, detection_time"
        )
        .in_("status", ["DETECTED", "NEEDS_REVIEW", "UNDER_INVESTIGATION", "ACTION_INITIATED", "RESOLVED"])
        .execute()
    )

    items = []
    for inc in result.data or []:
        inc = _extract_coords_from_incident(inc)
        if inc.get("latitude") and inc.get("longitude"):
            items.append(inc)
    return items


@router.get("/{incident_id}", response_model=IncidentResponse)
async def get_incident(
    incident_id: str,
    current_user: dict | None = Depends(get_optional_user),
):
    supabase = get_supabase_admin()
    result = supabase.table("incidents").select("*").eq("id", incident_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Incident not found")

    inc = result.data
    role = (current_user or {}).get("role", "guest")

    if inc["status"] == "REJECTED" and role not in ("admin", "maintenance"):
        raise HTTPException(status_code=404, detail="Incident not found")

    return _extract_coords_from_incident(inc)


@router.get("/{incident_id}/reports")
async def get_incident_reports(
    incident_id: str,
    current_user: dict | None = Depends(get_optional_user),
):
    """Get the reports contributing to an incident."""
    supabase = get_supabase_admin()

    links = (
        supabase.table("incident_reports")
        .select("report_id")
        .eq("incident_id", incident_id)
        .execute()
    )
    if not links.data:
        return []

    report_ids = [r["report_id"] for r in links.data]
    result = (
        supabase.table("reports")
        .select("id, issue_category, occurrence_time, location_description, ai_explanation, processing_status, is_demo")
        .in_("id", report_ids)
        .execute()
    )
    return result.data or []


@router.get("/{incident_id}/history", response_model=list[IncidentEvent])
async def get_incident_history(
    incident_id: str,
    current_user: dict = Depends(get_current_user),
):
    supabase = get_supabase_admin()
    result = (
        supabase.table("incident_events")
        .select("*")
        .eq("incident_id", incident_id)
        .order("created_at")
        .execute()
    )
    return result.data or []


@router.post("/analyze")
async def trigger_analysis(
    current_user: dict = Depends(require_role("admin", "maintenance")),
):
    """Trigger the spatial-temporal clustering pipeline."""
    result = run_clustering_pipeline()
    return result


@router.patch("/{incident_id}/status")
async def update_incident_status(
    incident_id: str,
    payload: IncidentStatusUpdate,
    current_user: dict = Depends(require_role("admin", "maintenance")),
):
    """Update incident status with audit log entry."""
    supabase = get_supabase_admin()

    existing = supabase.table("incidents").select("status").eq("id", incident_id).single().execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Incident not found")

    old_status = existing.data["status"]
    updates = {"status": payload.status.value}
    if payload.resolution_notes := getattr(payload, "resolution_notes", None):
        updates["resolution_notes"] = payload.resolution_notes
    if payload.assigned_to:
        updates["assigned_to"] = payload.assigned_to

    supabase.table("incidents").update(updates).eq("id", incident_id).execute()

    # Audit event
    supabase.table("incident_events").insert(
        {
            "incident_id": incident_id,
            "actor_id": current_user["sub"],
            "event_type": "STATUS_CHANGE",
            "from_status": old_status,
            "to_status": payload.status.value,
            "notes": payload.notes,
        }
    ).execute()

    return {"message": f"Status updated to {payload.status.value}"}
