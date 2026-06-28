"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import {
  Plus,
  Folder,
  Trash2,
  Download,
  LogOut,
  Clock,
  Layers,
  Rocket,
  LayoutDashboard,
  X,
} from "lucide-react";
import AnimatedBackground from "@/components/ui/AnimatedBackground";
import Logo from "@/components/ui/Logo";
import GlassCard from "@/components/ui/GlassCard";

interface Project {
  id: string;
  project_name: string;
  description: string;
  status: string;
  created_at: string;
}

const TEMPLATES = [
  { name: "Todo App", desc: "React + local storage, with dark mode", icon: "✅" },
  { name: "CRM Dashboard", desc: "Contacts, pipeline, revenue charts", icon: "📊" },
  { name: "Expense Tracker", desc: "Categories, monthly totals, bar charts", icon: "💰" },
  { name: "Portfolio Site", desc: "Hero section, projects grid, contact form", icon: "🎨" },
];

export default function Dashboard() {
  const { session, loading, token } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [loadingProjects, setLoadingProjects] = useState(true);

  useEffect(() => {
    if (!loading && !session) router.push("/");
  }, [session, loading, router]);

  useEffect(() => {
    if (token) {
      api.listProjects(token).then(setProjects).catch(console.error).finally(() => setLoadingProjects(false));
    }
  }, [token]);

  async function handleCreate(name?: string, description?: string) {
    const projectName = name || newName.trim();
    if (!token || !projectName) return;
    try {
      const proj = await api.createProject(token, {
        project_name: projectName,
        description: description || newDesc.trim(),
      });
      setProjects((p) => [proj, ...p]);
      setNewName("");
      setNewDesc("");
      setCreating(false);
      router.push(`/project/${proj.id}`);
    } catch (err) {
      console.error("Create project error:", err);
    }
  }

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    if (!token || !confirm("Delete this project? This cannot be undone.")) return;
    await api.deleteProject(token, id);
    setProjects((p) => p.filter((x) => x.id !== id));
  }

  async function handleDownload(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    if (!token) return;
    try {
      const { download_url } = await api.downloadProject(token, id);
      window.open(download_url, "_blank");
    } catch (err) {
      console.error("Download error:", err);
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      <AnimatedBackground />

      <div className="relative z-10">
        {/* Header */}
        <header className="glass border-b border-white/[0.06] px-6 py-4 flex items-center justify-between sticky top-0 z-20">
          <Logo size="sm" />
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">{session?.user.email}</span>
            <button
              onClick={() => supabase.auth.signOut()}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-white transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign out
            </button>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-6 py-10">
          {/* Stats bar */}
          <div className="flex items-center gap-6 mb-8 animate-fade-in">
            <div className="flex items-center gap-2 text-sm">
              <LayoutDashboard className="w-4 h-4 text-brand-400" />
              <span className="text-gray-400">
                <span className="text-white font-semibold">{projects.length}</span> project{projects.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Layers className="w-4 h-4 text-brand-400" />
              <span className="text-gray-400">
                <span className="text-white font-semibold">
                  {projects.filter((p) => p.status === "active").length}
                </span>{" "}
                active
              </span>
            </div>
          </div>

          {/* Title + Create */}
          <div className="flex items-center justify-between mb-8 animate-fade-in-up">
            <div>
              <h1 className="text-2xl font-bold text-white">Your Projects</h1>
              <p className="text-gray-500 mt-1 text-sm">
                Each project runs in its own isolated cloud container.
              </p>
            </div>
            <button onClick={() => setCreating(true)} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" /> New Project
            </button>
          </div>

          {/* Create Modal */}
          {creating && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
              <GlassCard className="w-full max-w-lg p-8 animate-fade-in-up">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-white">Create New Project</h2>
                  <button
                    onClick={() => setCreating(false)}
                    className="text-gray-500 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4 mb-6">
                  <div>
                    <label className="text-xs text-gray-400 mb-1.5 block">Project Name</label>
                    <input
                      autoFocus
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                      placeholder="My awesome app..."
                      className="input-dark w-full"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1.5 block">Description (optional)</label>
                    <input
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                      placeholder="What does this project do?"
                      className="input-dark w-full"
                    />
                  </div>
                </div>

                {/* Quick templates */}
                <div className="mb-6">
                  <p className="text-xs text-gray-500 mb-3">Or start from a template:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {TEMPLATES.map((t) => (
                      <button
                        key={t.name}
                        onClick={() => handleCreate(t.name, t.desc)}
                        className="text-left glass-card rounded-xl p-3 glass-card-hover"
                      >
                        <div className="text-lg mb-1">{t.icon}</div>
                        <div className="text-xs font-medium text-white">{t.name}</div>
                        <div className="text-[10px] text-gray-500 mt-0.5">{t.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 justify-end">
                  <button onClick={() => setCreating(false)} className="btn-ghost">
                    Cancel
                  </button>
                  <button
                    onClick={() => handleCreate()}
                    disabled={!newName.trim()}
                    className="btn-primary"
                  >
                    <Rocket className="w-4 h-4 inline mr-1.5" />
                    Create Project
                  </button>
                </div>
              </GlassCard>
            </div>
          )}

          {/* Projects Grid */}
          {loadingProjects ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-20 animate-fade-in-up">
              <div className="w-16 h-16 rounded-2xl bg-surface-300 flex items-center justify-center mx-auto mb-4">
                <Folder className="w-8 h-8 text-gray-600" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">No projects yet</h3>
              <p className="text-gray-500 text-sm mb-6">Create your first project to get started building with AI.</p>
              <button onClick={() => setCreating(true)} className="btn-primary">
                <Plus className="w-4 h-4 inline mr-1.5" /> Create your first project
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
              {projects.map((p) => (
                <GlassCard
                  key={p.id}
                  hover
                  onClick={() => router.push(`/project/${p.id}`)}
                  className="p-5 group"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-600/20 to-brand-800/20 flex items-center justify-center flex-shrink-0">
                      <Folder className="w-5 h-5 text-brand-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-white truncate">{p.project_name}</h3>
                      {p.description && (
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{p.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-gray-600">
                    <div className="flex items-center gap-1">
                      <span className={`status-dot ${p.status === "active" ? "active" : "offline"}`} />
                      <span className="capitalize">{p.status}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(p.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="flex gap-3 mt-4 pt-3 border-t border-white/[0.04] opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => handleDownload(e, p.id)}
                      className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
                    >
                      <Download className="w-3 h-3" /> Download
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, p.id)}
                      className="flex items-center gap-1.5 text-xs text-red-500/70 hover:text-red-400 transition-colors ml-auto"
                    >
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
