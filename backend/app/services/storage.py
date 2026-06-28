"""
StorageService — zips workspace files and pushes to Supabase Storage.
"""
import io
import zipfile
import os
import logging
from app.core.database import get_supabase
from app.core.config import settings

logger = logging.getLogger(__name__)


class StorageService:
    def zip_directory(self, directory: str) -> bytes:
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
            for root, dirs, files in os.walk(directory):
                dirs[:] = [d for d in dirs if d not in (".git", "node_modules", "__pycache__")]
                for file in files:
                    full = os.path.join(root, file)
                    arcname = os.path.relpath(full, directory)
                    zf.write(full, arcname)
        return buf.getvalue()

    async def upload_project(self, project_id: str, user_id: str, workspace_path: str) -> str:
        """Zip and upload project; return public URL."""
        data = self.zip_directory(workspace_path)
        path = f"{user_id}/{project_id}/project.zip"
        client = get_supabase()
        try:
            client.storage.from_(settings.STORAGE_BUCKET).remove([path])
        except Exception:
            pass
        client.storage.from_(settings.STORAGE_BUCKET).upload(
            path, data, file_options={"content-type": "application/zip"}
        )
        url = client.storage.from_(settings.STORAGE_BUCKET).get_public_url(path)
        logger.info(f"Uploaded project {project_id} to storage")
        return url

    async def get_download_url(self, project_id: str, user_id: str) -> str | None:
        path = f"{user_id}/{project_id}/project.zip"
        client = get_supabase()
        try:
            url = client.storage.from_(settings.STORAGE_BUCKET).create_signed_url(path, 3600)
            return url.get("signedURL")
        except Exception as e:
            logger.error(f"Download URL error: {e}")
            return None


storage_service = StorageService()
