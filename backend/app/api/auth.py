from fastapi import APIRouter, Depends
from app.core.auth import get_current_user

router = APIRouter()


@router.get("/me")
async def me(user=Depends(get_current_user)):
    """Return current authenticated user info."""
    return user
