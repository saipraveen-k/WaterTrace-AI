from fastapi import APIRouter, Depends
from app.core.security import get_current_user
from app.core.supabase import get_supabase_admin

router = APIRouter()


@router.get("")
async def get_notifications(current_user: dict = Depends(get_current_user)):
    supabase = get_supabase_admin()
    result = (
        supabase.table("notifications")
        .select("*")
        .eq("user_id", current_user["sub"])
        .order("created_at", desc=True)
        .limit(50)
        .execute()
    )
    return result.data or []


@router.patch("/{notification_id}/read")
async def mark_read(notification_id: str, current_user: dict = Depends(get_current_user)):
    supabase = get_supabase_admin()
    supabase.table("notifications").update({"is_read": True}).eq(
        "id", notification_id
    ).eq("user_id", current_user["sub"]).execute()
    return {"message": "Marked as read"}


@router.patch("/read-all")
async def mark_all_read(current_user: dict = Depends(get_current_user)):
    supabase = get_supabase_admin()
    supabase.table("notifications").update({"is_read": True}).eq(
        "user_id", current_user["sub"]
    ).execute()
    return {"message": "All notifications marked as read"}
