"use client";
import { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export default function GlassCard({ children, className = "", hover = false, onClick }: GlassCardProps) {
  return (
    <div
      onClick={onClick}
      className={`glass-card rounded-2xl ${hover ? "glass-card-hover cursor-pointer" : ""} ${className}`}
    >
      {children}
    </div>
  );
}
