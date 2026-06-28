const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function fetchApi(path: string, opts: RequestInit = {}, token?: string) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "API error");
  }
  return res.json();
}

export const api = {
  // Projects
  listProjects: (token: string) => fetchApi("/api/projects", {}, token),
  createProject: (token: string, body: { project_name: string; description?: string }) =>
    fetchApi("/api/projects", { method: "POST", body: JSON.stringify(body) }, token),
  getProject: (token: string, id: string) => fetchApi(`/api/projects/${id}`, {}, token),
  deleteProject: (token: string, id: string) =>
    fetchApi(`/api/projects/${id}`, { method: "DELETE" }, token),
  listFiles: (token: string, id: string) => fetchApi(`/api/projects/${id}/files`, {}, token),
  getFileContent: (token: string, id: string, path: string) =>
    fetchApi(`/api/projects/${id}/files/content?path=${encodeURIComponent(path)}`, {}, token),
  downloadProject: (token: string, id: string) =>
    fetchApi(`/api/projects/${id}/download`, { method: "POST" }, token),
  getChatHistory: (token: string, id: string) =>
    fetchApi(`/api/projects/${id}/history`, {}, token),
  me: (token: string) => fetchApi("/api/auth/me", {}, token),
};

// WebSocket URL builder
export function getWsUrl(projectId: string, token: string) {
  const base = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000")
    .replace(/^http/, "ws");
  return `${base}/ws/stream/${projectId}?token=${token}`;
}
