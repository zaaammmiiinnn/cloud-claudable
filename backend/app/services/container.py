"""
ContainerService — manages isolated Docker workspaces per project.
Each project gets its own container running Claude Code.
"""
import asyncio
import docker
import json
import logging
import os
from typing import Optional, Callable, Awaitable
from datetime import datetime, timedelta

from app.core.config import settings
from app.core.database import get_supabase

logger = logging.getLogger(__name__)


class ContainerService:
    def __init__(self):
        self._client: Optional[docker.DockerClient] = None
        self._active: dict[str, dict] = {}  # project_id -> {container, last_used}

    @property
    def client(self) -> docker.DockerClient:
        if self._client is None:
            self._client = docker.from_env()
        return self._client

    async def get_or_create_container(self, project_id: str, user_id: str) -> dict:
        """Return running container info, creating one if needed."""
        if project_id in self._active:
            entry = self._active[project_id]
            entry["last_used"] = datetime.utcnow()
            try:
                entry["container"].reload()
                if entry["container"].status == "running":
                    return entry
            except Exception:
                pass  # container gone, recreate below

        container = await self._create_container(project_id, user_id)
        entry = {"container": container, "last_used": datetime.utcnow(), "project_id": project_id}
        self._active[project_id] = entry
        return entry

    async def _create_container(self, project_id: str, user_id: str):
        """Spin up an isolated Docker workspace."""
        workspace = f"{settings.WORKSPACE_BASE_PATH}/{user_id}/{project_id}"
        os.makedirs(workspace, exist_ok=True)

        name = f"claudable-{project_id[:8]}"

        # Remove old container with same name if it exists
        try:
            old = self.client.containers.get(name)
            old.remove(force=True)
        except docker.errors.NotFound:
            pass

        container = self.client.containers.run(
            image=settings.DOCKER_BASE_IMAGE,
            name=name,
            command="tail -f /dev/null",  # keep alive, commands sent via exec
            detach=True,
            environment={
                "ANTHROPIC_API_KEY": settings.ANTHROPIC_API_KEY,
                "PROJECT_ID": project_id,
                "USER_ID": user_id,
            },
            mem_limit=settings.CONTAINER_MEMORY_LIMIT,
            nano_cpus=int(settings.CONTAINER_CPU_LIMIT * 1e9),
            volumes={workspace: {"bind": "/workspace", "mode": "rw"}},
            working_dir="/workspace",
            network_mode="bridge",
            labels={"claudable.project": project_id, "claudable.user": user_id},
        )
        logger.info(f"Created container {name} for project {project_id}")
        return container

    async def exec_claude_code(
        self,
        project_id: str,
        prompt: str,
        user_id: str,
        stream_callback: Callable[[dict], Awaitable[None]],
    ):
        """
        Run Claude Code with the given prompt and stream structured output.

        Claude Code with --output-format stream-json emits one JSON object per line:
          {"type":"assistant","content":[{"type":"text","text":"..."}]}
          {"type":"tool_use","name":"Write","input":{...}}
          {"type":"tool_result","content":"..."}
          {"type":"result","result":"...","duration_ms":...,"cost_usd":...}
        """
        entry = await self.get_or_create_container(project_id, user_id)
        container = entry["container"]

        # Escape prompt for shell safety
        safe_prompt = prompt.replace("'", "'\\''")

        cmd = (
            f"claude --dangerously-skip-permissions --print '{safe_prompt}' "
            f"--output-format stream-json 2>&1"
        )

        def _run_sync():
            """Run Docker exec in a thread to avoid blocking the event loop."""
            exec_result = container.exec_run(
                cmd=["sh", "-c", cmd],
                stream=True,
                tty=False,
                workdir="/workspace",
            )
            return exec_result.output  # generator

        try:
            # Get the streaming generator in a thread-safe way
            output_gen = await asyncio.to_thread(_run_sync)

            buffer = ""
            for chunk in output_gen:
                text = chunk.decode("utf-8", errors="replace")
                buffer += text

                # Process complete lines
                while "\n" in buffer:
                    line, buffer = buffer.split("\n", 1)
                    line = line.strip()
                    if not line:
                        continue

                    parsed = self._parse_stream_line(line)
                    await stream_callback(parsed)

            # Process remaining buffer
            if buffer.strip():
                parsed = self._parse_stream_line(buffer.strip())
                await stream_callback(parsed)

        except Exception as e:
            logger.error(f"Exec error for {project_id}: {e}")
            await stream_callback({
                "event": "error",
                "text": str(e),
            })

    def _parse_stream_line(self, line: str) -> dict:
        """Parse a single line of Claude Code stream-json output into a structured event."""
        try:
            data = json.loads(line)
            msg_type = data.get("type", "")

            if msg_type == "assistant":
                # Extract text content from assistant message
                content_parts = data.get("content", [])
                texts = []
                for part in content_parts:
                    if isinstance(part, dict) and part.get("type") == "text":
                        texts.append(part.get("text", ""))
                    elif isinstance(part, str):
                        texts.append(part)
                return {
                    "event": "assistant",
                    "text": "".join(texts),
                    "subtype": data.get("subtype", ""),
                }

            elif msg_type == "tool_use":
                return {
                    "event": "tool_use",
                    "tool": data.get("name", "unknown"),
                    "input": data.get("input", {}),
                }

            elif msg_type == "tool_result":
                content = data.get("content", "")
                if isinstance(content, list):
                    content = "\n".join(
                        p.get("text", str(p)) if isinstance(p, dict) else str(p)
                        for p in content
                    )
                return {
                    "event": "tool_result",
                    "content": str(content)[:2000],  # cap large outputs
                    "is_error": data.get("is_error", False),
                }

            elif msg_type == "result":
                return {
                    "event": "result",
                    "text": data.get("result", ""),
                    "cost_usd": data.get("cost_usd"),
                    "duration_ms": data.get("duration_ms"),
                    "num_turns": data.get("num_turns"),
                }

            elif msg_type == "system":
                return {
                    "event": "system",
                    "text": data.get("message", data.get("text", line)),
                }

            else:
                # Unknown type — pass as raw
                return {"event": "text", "text": line}

        except json.JSONDecodeError:
            # Not valid JSON — treat as raw text output
            return {"event": "text", "text": line}

    async def get_file_tree(self, project_id: str, user_id: str) -> list:
        """Return list of files in the workspace."""
        entry = await self.get_or_create_container(project_id, user_id)
        container = entry["container"]
        result = container.exec_run(
            "find /workspace -type f -not -path '*/.git/*' -not -path '*/node_modules/*' -not -path '*/__pycache__/*'",
            workdir="/workspace",
        )
        output = result.output.decode("utf-8", errors="replace")
        files = [f.replace("/workspace/", "") for f in output.strip().split("\n") if f.strip()]
        return sorted(files)

    async def read_file(self, project_id: str, user_id: str, filepath: str) -> str:
        """Read a file from the workspace."""
        entry = await self.get_or_create_container(project_id, user_id)
        container = entry["container"]
        safe_path = filepath.lstrip("/").replace("..", "")
        result = container.exec_run(f"cat /workspace/{safe_path}", workdir="/workspace")
        return result.output.decode("utf-8", errors="replace")

    async def stop_container(self, project_id: str):
        """Stop and remove a container."""
        if project_id in self._active:
            try:
                self._active[project_id]["container"].remove(force=True)
            except Exception as e:
                logger.warning(f"Stop container error: {e}")
            del self._active[project_id]

    async def cleanup_idle(self):
        """Stop containers idle longer than CONTAINER_IDLE_TIMEOUT seconds."""
        cutoff = datetime.utcnow() - timedelta(seconds=settings.CONTAINER_IDLE_TIMEOUT)
        idle = [pid for pid, e in self._active.items() if e["last_used"] < cutoff]
        for pid in idle:
            logger.info(f"Cleaning up idle container for project {pid}")
            await self.stop_container(pid)

    def get_active_count(self) -> int:
        """Return count of active containers."""
        return len(self._active)


container_service = ContainerService()
