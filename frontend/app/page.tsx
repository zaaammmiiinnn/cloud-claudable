"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/lib/supabase";
import { Cloud, Code2, Container, Sparkles, ArrowRight } from "lucide-react";
import AnimatedBackground from "@/components/ui/AnimatedBackground";
import Logo from "@/components/ui/Logo";
import GlassCard from "@/components/ui/GlassCard";

const FEATURES = [
  {
    icon: Cloud,
    title: "100% Cloud",
    desc: "No local installs — Claude Code runs in isolated containers",
  },
  {
    icon: Code2,
    title: "Full Agent Power",
    desc: "Planning, file editing, tool execution, error correction",
  },
  {
    icon: Container,
    title: "Isolated Workspaces",
    desc: "Each project gets its own Docker container with full tooling",
  },
  {
    icon: Sparkles,
    title: "Real-Time Streaming",
    desc: "Watch Claude Code think, write, and build live in your browser",
  },
];

export default function Home() {
  const { session, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && session) router.push("/dashboard");
  }, [session, loading, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (session) return null;

  return (
    <div className="min-h-screen relative">
      <AnimatedBackground />

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-12">
        {/* Hero */}
        <div className="animate-fade-in-up mb-10 text-center">
          <div className="flex justify-center mb-6">
            <Logo size="lg" />
          </div>
          <p className="text-gray-400 text-lg max-w-md mx-auto leading-relaxed">
            Build production apps from natural language — Claude Code runs{" "}
            <span className="text-brand-400 font-medium">entirely in the cloud</span>.
          </p>
        </div>

        {/* Auth Card */}
        <div className="w-full max-w-md animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
          <GlassCard className="p-8">
            <Auth
              supabaseClient={supabase}
              appearance={{
                theme: ThemeSupa,
                variables: {
                  default: {
                    colors: {
                      brand: "#7c3aed",
                      brandAccent: "#6d28d9",
                      inputBackground: "#18181b",
                      inputBorder: "#27272a",
                      inputText: "#fafafa",
                      inputPlaceholder: "#71717a",
                    },
                    borderWidths: {
                      buttonBorderWidth: "0px",
                      inputBorderWidth: "1px",
                    },
                    radii: {
                      borderRadiusButton: "0.75rem",
                      buttonBorderRadius: "0.75rem",
                      inputBorderRadius: "0.75rem",
                    },
                    fontSizes: {
                      baseBodySize: "14px",
                      baseInputSize: "14px",
                      baseLabelSize: "13px",
                      baseButtonSize: "14px",
                    },
                  },
                },
              }}
              providers={["google"]}
              redirectTo={`${typeof window !== "undefined" ? window.location.origin : ""}/dashboard`}
            />
          </GlassCard>
        </div>

        {/* Feature cards */}
        <div
          className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto mt-16 animate-fade-in-up"
          style={{ animationDelay: "0.3s" }}
        >
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="glass-card rounded-xl p-4 text-center glass-card-hover"
            >
              <f.icon className="w-6 h-6 text-brand-400 mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-white mb-1">{f.title}</h3>
              <p className="text-[11px] text-gray-500 leading-snug">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Tagline */}
        <div
          className="mt-12 flex items-center gap-2 text-xs text-gray-600 animate-fade-in"
          style={{ animationDelay: "0.5s" }}
        >
          <span>Powered by Claude Code + Supabase + Docker</span>
          <ArrowRight className="w-3 h-3" />
          <span className="text-brand-400">No setup required</span>
        </div>
      </div>
    </div>
  );
}
