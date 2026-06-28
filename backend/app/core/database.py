from supabase import create_client, Client
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

_supabase: Client | None = None


def get_supabase() -> Client:
    global _supabase
    if _supabase is None:
        _supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    return _supabase


async def init_db():
    """Run Supabase schema migrations on startup."""
    client = get_supabase()
    try:
        # Verify connection
        client.table("users").select("id").limit(1).execute()
        logger.info("Supabase connection verified.")
    except Exception as e:
        logger.warning(f"Supabase init warning: {e}")
