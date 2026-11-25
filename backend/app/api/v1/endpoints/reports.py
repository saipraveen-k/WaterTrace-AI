from fastapi import APIRouter, Depends, HTTPException, status, Query
from app.core.security import get_current_user, require_role
from app.core.supabase import get_supabase_admin
from app.schemas.reports import ReportCreate, ReportUpdate, ReportResponse, ReportListResponse
from app.intelligence.classifier import classify_report
import uuid

router = APIRouter()


def _serialize_report(r: dict) -> dict:
    """Extract lat/lon from PostGIS geometry for API response."""
    loc = r.pop("location", None)
    lat, lon = None, None
    if loc and isinstance(loc, str):
        try:
            from shapely import wkb as shapely_wkb
            import binascii
            raw = binascii.unhexlify(loc)
            from shapely import wkb
            point = wkb.loads(raw, include_srid=True)
            lat, lon = point.y, point.x
        except Exception:
            pass
    r["latitude"] = lat
    r["longitude"] = lon
    return r


@router.post("", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
async def create_report(
    payload: ReportCreate,
    current_user: dict = Depends(get_current_user),
):
    """Submit a new water issue report."""
    supabase = get_supabase_admin()
    user_id = current_user["sub"]

    # Run AI classification
    classification = await classify_report(payload.description)

    report_data = {
        "user_id": user_id,
        "issue_category": payload.issue_category.value,
        "description": payload.description,
        "location": f"SRID=4326;POINT({payload.location.longitude} {payload.location.latitude})",
        "location_description": payload.location.description,
        "occurrence_time": payload.occurrence_time.isoformat(),
        "ai_category": classification.get("category"),
        "ai_confidence": classification.get("confidence"),
        "ai_symptoms": classification.get("symptoms", []),
        "ai_explanation": classification.get("explanation"),
        "processing_status": "CLASSIFIED",
        "is_demo": False,
    }

    result = supabase.table("reports").insert(report_data).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create report")

    return _serialize_report(result.data[0])


@router.get("", response_model=ReportListResponse)
async def list_reports(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    category: str | None = Query(None),
    status_filter: str | None = Query(None, alias="status"),
    current_user: dict = Depends(get_current_user),
):
    """List reports. Citizens see their own; staff see all."""
    supabase = get_supabase_admin()
    user_id = current_user["sub"]
    role = current_user.get("role", "citizen")

    query = supabase.table("reports").select("*", count="exact")

    if role == "citizen":
        query = query.eq("user_id", user_id)

    if category:
        query = query.eq("issue_category", category)
    if status_filter:
        query = query.eq("processing_status", status_filter)

    offset = (page - 1) * per_page
    query = query.order("submitted_at", desc=True).range(offset, offset + per_page - 1)
    result = query.execute()

    items = [_serialize_report(r) for r in (result.data or [])]
    return {"items": items, "total": result.count or 0, "page": page, "per_page": per_page}


@router.get("/{report_id}", response_model=ReportResponse)
async def get_report(
    report_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get a single report. Citizens can only view their own."""
    supabase = get_supabase_admin()
    user_id = current_user["sub"]
    role = current_user.get("role", "citizen")

    result = supabase.table("reports").select("*").eq("id", report_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Report not found")

    report = result.data
    if role == "citizen" and report["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    return _serialize_report(report)


@router.patch("/{report_id}", response_model=ReportResponse)
async def update_report(
    report_id: str,
    payload: ReportUpdate,
    current_user: dict = Depends(get_current_user),
):
    """Update a report. Citizens can correct their own PENDING reports."""
    supabase = get_supabase_admin()
    user_id = current_user["sub"]
    role = current_user.get("role", "citizen")

    result = supabase.table("reports").select("*").eq("id", report_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Report not found")

    report = result.data

    if role == "citizen":
        if report["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        if report["processing_status"] not in ("PENDING", "CLASSIFIED"):
            raise HTTPException(status_code=400, detail="Report cannot be edited at this stage")

    updates = payload.model_dump(exclude_none=True)
    if "issue_category" in updates:
        updates["issue_category"] = updates["issue_category"].value
    if "confirmed_category" in updates:
        updates["confirmed_category"] = updates["confirmed_category"].value

    updated = supabase.table("reports").update(updates).eq("id", report_id).execute()
    return _serialize_report(updated.data[0])


@router.post("/{report_id}/confirm")
async def confirm_classification(
    report_id: str,
    confirmed_category: str,
    current_user: dict = Depends(get_current_user),
):
    """Citizen confirms or corrects the AI classification."""
    supabase = get_supabase_admin()
    user_id = current_user["sub"]

    result = supabase.table("reports").select("user_id").eq("id", report_id).single().execute()
    if not result.data or result.data["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    supabase.table("reports").update(
        {"confirmed_category": confirmed_category, "user_confirmed": True}
    ).eq("id", report_id).execute()

    return {"message": "Classification confirmed"}
