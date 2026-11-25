from fastapi import APIRouter, Depends
from app.core.security import get_current_user
from app.core.supabase import get_supabase_admin
from collections import defaultdict
from datetime import datetime, timezone, timedelta

router = APIRouter()


@router.get("/dashboard/summary")
async def dashboard_summary(current_user: dict = Depends(get_current_user)):
    """High-level summary metrics for the operations dashboard."""
    supabase = get_supabase_admin()

    reports_result = supabase.table("reports").select("id", count="exact").execute()
    incidents_result = supabase.table("incidents").select("id, status", count="exact").execute()
    active_incidents = [
        i for i in (incidents_result.data or [])
        if i["status"] in ("DETECTED", "NEEDS_REVIEW", "UNDER_INVESTIGATION", "ACTION_INITIATED")
    ]
    resolved_incidents = [i for i in (incidents_result.data or []) if i["status"] == "RESOLVED"]

    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    recent_reports = supabase.table("reports").select("id", count="exact").gte("submitted_at", week_ago).execute()

    return {
        "total_reports": reports_result.count or 0,
        "reports_last_7_days": recent_reports.count or 0,
        "total_incidents": incidents_result.count or 0,
        "active_incidents": len(active_incidents),
        "resolved_incidents": len(resolved_incidents),
    }


@router.get("/analytics/categories")
async def reports_by_category(current_user: dict = Depends(get_current_user)):
    """Report count grouped by issue category."""
    supabase = get_supabase_admin()
    result = supabase.table("reports").select("issue_category").execute()
    counts: dict[str, int] = defaultdict(int)
    for row in result.data or []:
        counts[row["issue_category"]] += 1
    return [{"category": k, "count": v} for k, v in sorted(counts.items(), key=lambda x: -x[1])]


@router.get("/analytics/trends")
async def report_trends(current_user: dict = Depends(get_current_user)):
    """Daily report submission counts for the last 14 days."""
    supabase = get_supabase_admin()
    since = (datetime.now(timezone.utc) - timedelta(days=14)).isoformat()
    result = supabase.table("reports").select("submitted_at").gte("submitted_at", since).execute()

    daily: dict[str, int] = defaultdict(int)
    for row in result.data or []:
        date_str = row["submitted_at"][:10]
        daily[date_str] += 1

    return [{"date": k, "count": v} for k, v in sorted(daily.items())]


@router.get("/analytics/hotspots")
async def incident_hotspots(current_user: dict = Depends(get_current_user)):
    """Return high-priority incidents for hotspot map."""
    supabase = get_supabase_admin()
    result = (
        supabase.table("incidents")
        .select("id, title, center_location, evidence_confidence, investigation_priority, status, primary_categories")
        .gte("investigation_priority", 0.5)
        .in_("status", ["DETECTED", "NEEDS_REVIEW", "UNDER_INVESTIGATION", "ACTION_INITIATED"])
        .order("investigation_priority", desc=True)
        .limit(20)
        .execute()
    )

    items = []
    for inc in result.data or []:
        loc = inc.pop("center_location", None)
        lat, lon = None, None
        if loc:
            try:
                from shapely import wkb
                import binascii
                point = wkb.loads(binascii.unhexlify(loc), include_srid=True)
                lat, lon = point.y, point.x
            except Exception:
                pass
        inc["latitude"] = lat
        inc["longitude"] = lon
        if lat and lon:
            items.append(inc)
    return items
