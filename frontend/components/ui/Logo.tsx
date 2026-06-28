"use client";
import { Zap } from "lucide-react";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

const sizes = {
  sm: { icon: "w-4 h-4", box: "p-1.5", text: "text-sm" },
  md: { icon: "w-5 h-5", box: "p-2", text: "text-xl" },
  lg: { icon: "w-7 h-7", box: "p-3", text: "text-3xl" },
};

export default function Logo({ size = "md", showText = true }: LogoProps) {
  const s = sizes[size];
  return (
    <div className="flex items-center gap-3">
      <div
        className={`${s.box} rounded-xl animate-pulse-glow`}
        style={{
          background: "linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)",
        }}
      >
        <Zap className={`${s.icon} text-white`} />
      </div>
      {showText && (
        <span className={`${s.text} font-bold tracking-tight gradient-text-brand`}>
          Cloud Claudable
        </span>
      )}
    </div>
  );
}
