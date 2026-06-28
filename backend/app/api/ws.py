"""
WebSocket endpoint — streams Claude Code execution output to the browser in real time.
Sends structured events: start, assistant, tool_use, tool_result, done, error.
"""
import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from app.core.database import get_supabase
from app.services.container import container_service

logger = logging.getLogger(__name__)
router = APIRouter()


async def verify_ws_token(token: str) -> dict | None:
    try:
        client = get_supabase()
        response = client.auth.get_user(token)
        if response and response.user:
            return {"id": response.user.id, "email": response.user.email}
    except Exception as e:
        logger.warning(f"WS token error: {e}")
    return None


@router.websocket("/stream/{project_id}")
async def stream_claude_code(
    websocket: WebSocket,
    project_id: str,
    token: str = Query(...),
):
    user = await verify_ws_token(token)
    if not user:
        await websocket.close(code=4001)
        return

    await websocket.accept()
    logger.info(f"WS connected: user={user['id']} project={project_id}")

    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)

            if msg.get("type") == "prompt":
                prompt = msg.get("prompt", "")
                if not prompt.strip():
                    continue

                # Persist user message
                db = get_supabase()
                db.table("chat_sessions").insert({
                    "project_id": project_id,
                    "role": "user",
                    "message": prompt,
                }).execute()

                await websocket.send_json({"type": "start", "message": "Claude Code starting..."})

                full_text_parts = []

                async def send_event(event: dict):
                    """Forward structured stream events to the client."""
                    event_type = event.get("event", "text")

                    if event_type == "assistant":
                        text = event.get("text", "")
                        if text:
                            full_text_parts.append(text)
                            await websocket.send_json({
                                "type": "chunk",
                                "event": "assistant",
                                "text": text,
                            })

                    elif event_type == "tool_use":
                        tool_info = f"\n🔧 Using tool: {event.get('tool', 'unknown')}\n"
                        full_text_parts.append(tool_info)
                        await websocket.send_json({
                            "type": "chunk",
                            "event": "tool_use",
                            "tool": event.get("tool", ""),
                            "input": event.get("input", {}),
                            "text": tool_info,
                        })

                    elif event_type == "tool_result":
                        content = event.get("content", "")
                        is_error = event.get("is_error", False)
                        prefix = "❌ " if is_error else "✅ "
                        result_text = f"\n{prefix}{content}\n"
                        full_text_parts.append(result_text)
                        await websocket.send_json({
                            "type": "chunk",
                            "event": "tool_result",
                            "content": content,
                            "is_error": is_error,
                            "text": result_text,
                        })

                    elif event_type == "result":
                        result_text = event.get("text", "")
                        if result_text:
                            full_text_parts.append(result_text)
                        await websocket.send_json({
                            "type": "chunk",
                            "event": "result",
                            "text": result_text,
                            "cost_usd": event.get("cost_usd"),
                            "duration_ms": event.get("duration_ms"),
                        })

                    elif event_type == "error":
                        err_text = f"\n[ERROR]: {event.get('text', 'Unknown error')}\n"
                        full_text_parts.append(err_text)
                        await websocket.send_json({
                            "type": "chunk",
                            "event": "error",
                            "text": err_text,
                        })

                    else:
                        # Raw text
                        text = event.get("text", "")
                        if text:
                            full_text_parts.append(text)
                            await websocket.send_json({
                                "type": "chunk",
                                "event": "text",
                                "text": text,
                            })

                await container_service.exec_claude_code(
                    project_id=project_id,
                    prompt=prompt,
                    user_id=user["id"],
                    stream_callback=send_event,
                )

                full_response = "".join(full_text_parts)

                # Persist assistant response
                if full_response.strip():
                    db.table("chat_sessions").insert({
                        "project_id": project_id,
                        "role": "assistant",
                        "message": full_response[:50000],  # cap at 50k chars
                    }).execute()

                # Get updated file tree
                files = await container_service.get_file_tree(project_id, user["id"])

                await websocket.send_json({
                    "type": "done",
                    "files": files,
                })

            elif msg.get("type") == "read_file":
                filepath = msg.get("path", "")
                content = await container_service.read_file(project_id, user["id"], filepath)
                await websocket.send_json({"type": "file_content", "path": filepath, "content": content})

            elif msg.get("type") == "ping":
                await websocket.send_json({"type": "pong"})

    except WebSocketDisconnect:
        logger.info(f"WS disconnected: project={project_id}")
    except Exception as e:
        logger.error(f"WS error: {e}")
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass
