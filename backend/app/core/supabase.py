from supabase import create_client, Client
from app.core.config import settings
from functools import lru_cache


@lru_cache(maxsize=1)
def get_supabase_admin() -> Client:
    """
    Admin client using the service-role key.
    Use ONLY in server-side FastAPI code. Never expose to browser.
    """
    return create_client(
        settings.supabase_url,
        settings.supabase_service_role_key,
    )


@lru_cache(maxsize=1)
def get_supabase_public() -> Client:
    """
    Public client using the anon key.
    Safe for read-only public operations.
    """
    return create_client(
        settings.supabase_url,
        settings.supabase_anon_key,
    )
