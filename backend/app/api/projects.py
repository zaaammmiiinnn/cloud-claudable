from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
import uuid
from datetime import datetime

from app.core.auth import get_current_user
from app.core.database import get_supabase
from app.services.container import container_service
from app.services.storage import storage_service
from app.core.config import settings
import os

router = APIRouter()


class CreateProjectRequest(BaseModel):
    project_name: str
    description: Optional[str] = ""


@router.post("")
async def create_project(body: CreateProjectRequest, user=Depends(get_current_user)):
    db = get_supabase()
    project_id = str(uuid.uuid4())
    workspace_path = f"{settings.WORKSPACE_BASE_PATH}/{user['id']}/{project_id}"
    os.makedirs(workspace_path, exist_ok=True)

    result = db.table("projects").insert({
        "id": project_id,
        "user_id": user["id"],
        "project_name": body.project_name,
        "description": body.description,
        "status": "active",
        "workspace_path": workspace_path,
    }).execute()

    return result.data[0]


@router.get("")
async def list_projects(user=Depends(get_current_user)):
    db = get_supabase()
    result = db.table("projects").select("*").eq("user_id", user["id"]).order("created_at", desc=True).execute()
    return result.data


@router.get("/{project_id}")
async def get_project(project_id: str, user=Depends(get_current_user)):
    db = get_supabase()
    result = db.table("projects").select("*").eq("id", project_id).eq("user_id", user["id"]).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Project not found")
    return result.data


@router.delete("/{project_id}")
async def delete_project(project_id: str, user=Depends(get_current_user)):
    await container_service.stop_container(project_id)
    db = get_supabase()
    db.table("projects").update({"status": "deleted"}).eq("id", project_id).eq("user_id", user["id"]).execute()
    return {"deleted": True}


@router.get("/{project_id}/files")
async def list_files(project_id: str, user=Depends(get_current_user)):
    files = await container_service.get_file_tree(project_id, user["id"])
    return {"files": files}


@router.get("/{project_id}/files/content")
async def get_file_content(project_id: str, path: str, user=Depends(get_current_user)):
    content = await container_service.read_file(project_id, user["id"], path)
    return {"path": path, "content": content}


@router.post("/{project_id}/download")
async def download_project(project_id: str, user=Depends(get_current_user)):
    db = get_supabase()
    proj = db.table("projects").select("workspace_path").eq("id", project_id).eq("user_id", user["id"]).single().execute()
    if not proj.data:
        raise HTTPException(status_code=404, detail="Project not found")

    url = await storage_service.upload_project(project_id, user["id"], proj.data["workspace_path"])
    return {"download_url": url}


@router.get("/{project_id}/history")
async def get_chat_history(project_id: str, user=Depends(get_current_user)):
    db = get_supabase()
    result = db.table("chat_sessions").select("*").eq("project_id", project_id).order("timestamp").execute()
    return result.data
