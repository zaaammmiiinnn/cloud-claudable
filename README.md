# Cloud Claudable ☁️⚡

> Cloud-native fork of [Claudable](https://github.com/opactorai/Claudable) — build full-stack apps from natural language, powered by **Claude Code running in isolated cloud containers**. No local installs required.

[![Deploy Backend](https://img.shields.io/badge/Deploy_Backend-Railway-purple)](https://railway.app)
[![Deploy Frontend](https://img.shields.io/badge/Deploy_Frontend-Vercel-black)](https://vercel.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## What's Different From the Original

| Feature | Original Claudable | Cloud Claudable |
|---|---|---|
| Claude Code location | Runs on user's machine | Runs in isolated Docker container |
| Setup required | Node.js + Claude Code CLI | Just a browser |
| Multi-user | ❌ | ✅ |
| Auth & persistence | SQLite (local) | Supabase (cloud) |
| File download | Local files | Zip download via Supabase Storage |
| Scaling | Single user | Horizontal (one container per project) |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      User (Browser)                     │
│                    Next.js Frontend                     │
│            Auth · Dashboard · Workspace UI              │
└─────────────────┬──────────────────┬────────────────────┘
                  │ HTTPS            │ WebSocket
                  ▼                  ▼
┌─────────────────────────────────────────────────────────┐
│                  FastAPI Backend                        │
│         Auth · Projects CRUD · Session Manager          │
│              Container Orchestration                    │
│           Idle Cleanup (30 min timeout)                 │
└─────────────────┬──────────────────┬────────────────────┘
                  │ Docker API       │ docker exec
                  ▼                  ▼
┌────────────────────┐  ┌────────────────────┐
│  Container A       │  │  Container B       │
│  ┌──────────────┐  │  │  ┌──────────────┐  │
│  │ Claude Code  │  │  │  │ Claude Code  │  │
│  │ Node.js      │  │  │  │ Node.js      │  │
│  │ Git, npm     │  │  │  │ Git, npm     │  │
│  │ /workspace   │  │  │  │ /workspace   │  │
│  └──────────────┘  │  │  └──────────────┘  │
└────────────────────┘  └────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│                      Supabase                           │
│   Auth (Email + Google) · Postgres · Storage (Zips)     │
└─────────────────────────────────────────────────────────┘
```

**Key design decisions:**
- Each project runs in its own container — full isolation, real Claude Code execution
- WebSocket streams structured events (assistant text, tool calls, results) in real time
- Containers are reused per project and garbage-collected after 30 min idle
- Backend mounts the Docker socket (sibling-container pattern) to avoid Docker-in-Docker

---

## Quick Start (Local)

### Prerequisites
- Docker Desktop (running)
- A [Supabase](https://supabase.com) project
- An [Anthropic API key](https://console.anthropic.com)

### 1. Clone and configure

```bash
git clone https://github.com/YOUR_USERNAME/cloud-claudable
cd cloud-claudable

# Backend env
cp backend/.env.example backend/.env
# Edit backend/.env → add your Supabase URL, service key, anon key, and Anthropic API key

# Frontend env
cp frontend/.env.example frontend/.env.local
# Edit frontend/.env.local → add your Supabase URL + anon key
```

### 2. Set up Supabase

Open your Supabase project → **SQL Editor** → paste and run `infra/schema.sql`.

Then create a **Storage bucket** named `project-files` (set to public or use signed URLs).

### 3. Build the workspace image

```bash
docker build -f backend/docker/Dockerfile.workspace -t cloud-claudable-workspace:latest .
```

### 4. Start everything

```bash
docker-compose up --build
```

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000
- **API docs (Swagger):** http://localhost:8000/docs

### 5. Start without Docker (development)

```bash
# Terminal 1: Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2: Frontend
cd frontend
npm install
npm run dev
```

---

## Deployment

### Backend → Railway / Render / AWS

1. Connect your GitHub repo
2. Set root directory to `backend/`
3. Add all environment variables from `backend/.env.example`
4. **Important:** If using Railway/Render with Docker, ensure the Docker socket is accessible
5. Pre-build the workspace image on the host:
   ```bash
   docker build -f docker/Dockerfile.workspace -t cloud-claudable-workspace:latest .
   ```
6. Build and deploy

### Frontend → Vercel

1. Connect your GitHub repo to Vercel
2. Set root directory to `frontend/`
3. Framework preset: **Next.js**
4. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_API_URL` (your deployed backend URL)
5. Deploy

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Health check + active container count |
| `GET` | `/api/auth/me` | Current authenticated user |
| `GET` | `/api/projects` | List user's projects |
| `POST` | `/api/projects` | Create new project |
| `GET` | `/api/projects/:id` | Get project details |
| `DELETE` | `/api/projects/:id` | Delete project |
| `GET` | `/api/projects/:id/files` | List workspace files |
| `GET` | `/api/projects/:id/files/content?path=` | Read file content |
| `POST` | `/api/projects/:id/download` | Generate zip → return download URL |
| `GET` | `/api/projects/:id/history` | Chat history |
| `WS` | `/ws/stream/:id?token=` | Real-time Claude Code stream |

### WebSocket Protocol

**Client → Server:**
```json
{ "type": "prompt", "prompt": "Build a todo app" }
{ "type": "read_file", "path": "src/App.tsx" }
{ "type": "ping" }
```

**Server → Client (structured events):**
```json
{ "type": "start", "message": "Claude Code starting..." }
{ "type": "chunk", "event": "assistant", "text": "I'll create a todo app..." }
{ "type": "chunk", "event": "tool_use", "tool": "Write", "input": {"file_path": "src/App.tsx"} }
{ "type": "chunk", "event": "tool_result", "content": "File written", "is_error": false }
{ "type": "chunk", "event": "result", "text": "...", "cost_usd": 0.05, "duration_ms": 12000 }
{ "type": "done", "files": ["src/App.tsx", "package.json"] }
{ "type": "file_content", "path": "src/App.tsx", "content": "..." }
{ "type": "error", "message": "..." }
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Example |
|---|---|---|
| `SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Service role key (server-only) | `eyJ...` |
| `SUPABASE_ANON_KEY` | Anon/public key | `eyJ...` |
| `ANTHROPIC_API_KEY` | Injected into workspace containers | `sk-ant-...` |
| `JWT_SECRET` | Random secret for internal JWT | `random-32-char-string` |
| `CORS_ORIGINS` | Allowed frontend origins (JSON array) | `["http://localhost:3000"]` |
| `WORKSPACE_BASE_PATH` | Host path for workspace volumes | `/workspaces` |
| `DOCKER_BASE_IMAGE` | Workspace image name | `cloud-claudable-workspace:latest` |
| `CONTAINER_MEMORY_LIMIT` | Container memory cap | `512m` |
| `CONTAINER_CPU_LIMIT` | Container CPU cap (cores) | `0.5` |
| `CONTAINER_IDLE_TIMEOUT` | Seconds before idle cleanup | `1800` |

### Frontend (`frontend/.env.local`)

| Variable | Description | Example |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | `eyJ...` |
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:8000` |

---

## Project Structure

```
cloud-claudable/
├── backend/
│   ├── app/
│   │   ├── main.py                # FastAPI app + lifespan + idle cleanup
│   │   ├── api/
│   │   │   ├── auth.py            # GET /api/auth/me
│   │   │   ├── projects.py        # CRUD + download + files + history
│   │   │   ├── ws.py              # WebSocket streaming (structured events)
│   │   │   ├── files.py           # (reserved router)
│   │   │   └── sessions.py        # (reserved router)
│   │   ├── core/
│   │   │   ├── config.py          # Settings from environment
│   │   │   ├── database.py        # Supabase client
│   │   │   └── auth.py            # JWT / Supabase token middleware
│   │   ├── models/
│   │   │   └── __init__.py
│   │   └── services/
│   │       ├── container.py       # Docker lifecycle + Claude Code exec
│   │       └── storage.py         # Supabase Storage (zip upload)
│   ├── docker/
│   │   └── Dockerfile.workspace   # Claude Code container image
│   ├── Dockerfile                 # Backend API image
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── globals.css            # Design system (glassmorphism, animations)
│   │   ├── layout.tsx             # Root layout + Inter font + SEO
│   │   ├── page.tsx               # Login page (animated, glassmorphic)
│   │   ├── dashboard/page.tsx     # Project dashboard (cards, stats, templates)
│   │   └── project/[id]/page.tsx  # Workspace (chat, file tree, code viewer)
│   ├── components/
│   │   ├── ui/
│   │   │   ├── GlassCard.tsx      # Reusable glassmorphic card
│   │   │   ├── AnimatedBackground.tsx  # Floating gradient orbs
│   │   │   └── Logo.tsx           # Animated logo with glow
│   │   ├── chat/
│   │   │   ├── MessageBubble.tsx  # Chat message with avatars
│   │   │   └── StreamRenderer.tsx # Structured Claude Code event renderer
│   │   └── files/
│   │       └── FileTree.tsx       # Hierarchical file tree with icons
│   ├── contexts/AuthContext.tsx    # Supabase auth state
│   ├── hooks/useClaudeStream.ts   # WebSocket hook
│   ├── lib/
│   │   ├── api.ts                 # Backend API client
│   │   └── supabase.ts            # Supabase client
│   ├── Dockerfile
│   └── package.json
├── infra/
│   └── schema.sql                 # Supabase schema (users, projects, chats, files)
└── docker-compose.yml
```

---

## Demo Prompts to Try

Once logged in, create a project and try these prompts:

- ✅ `Build a full Todo app with React and local storage, including dark mode`
- 📊 `Create a CRM dashboard with mock contacts, deal pipeline, and revenue chart`
- 💰 `Build an Expense Tracker with categories, monthly totals, and a bar chart`
- 🎨 `Generate a personal portfolio site with hero section, projects grid, and contact form`

---

## Features Implemented

- ✅ Claude Code runs entirely in isolated Docker containers
- ✅ Users don't need to install Claude Code locally
- ✅ Full agentic workflow preserved (planning, file editing, tool execution, error correction)
- ✅ Multiple users and projects supported
- ✅ Supabase authentication (email + Google OAuth)
- ✅ Project metadata and chat history persisted in Supabase Postgres
- ✅ Generated applications downloadable as ZIP via Supabase Storage
- ✅ Real-time streaming of Claude Code execution (structured events)
- ✅ Idle container cleanup (30 min timeout)
- ✅ Container reuse per project
- ✅ Hierarchical file tree with file type icons
- ✅ Syntax-highlighted code viewer with copy
- ✅ Premium glassmorphic UI with animations
- ✅ Template quick-start prompts
- ✅ Docker healthchecks
- ✅ Modular architecture (FastAPI + Next.js)

---

## Supabase Schema

The database consists of 4 tables with Row Level Security:

- **`users`** — mirrors auth.users (auto-created via trigger)
- **`projects`** — user_id, project_name, status, workspace_path
- **`chat_sessions`** — project_id, role, message, timestamp
- **`project_files`** — project_id, filename, language

See [`infra/schema.sql`](infra/schema.sql) for the full schema with RLS policies.

---

## Troubleshooting

### Docker not running
```
Cannot connect to the Docker daemon. Is the docker daemon running?
```
→ Start Docker Desktop.

### Workspace image not found
```
404 Client Error: Not Found ("No such image: cloud-claudable-workspace:latest")
```
→ Build the workspace image first:
```bash
docker build -f backend/docker/Dockerfile.workspace -t cloud-claudable-workspace:latest .
```

### Supabase connection errors
→ Verify `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` in `backend/.env`.
→ Ensure you've run `infra/schema.sql` in the Supabase SQL Editor.

### CORS errors
→ Add your frontend URL to `CORS_ORIGINS` in `backend/.env`.

### Claude Code not responding
→ Verify `ANTHROPIC_API_KEY` is valid and has available credits.

---

## License

MIT
