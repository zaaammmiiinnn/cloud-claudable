"use client";

export default function AnimatedBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10" aria-hidden="true">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-surface-0 via-surface-50 to-surface-0" />

      {/* Orb 1 — top-left purple */}
      <div
        className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full opacity-20"
        style={{
          background: "radial-gradient(circle, rgba(139,92,246,0.4) 0%, transparent 70%)",
          animation: "orb-drift-1 20s ease-in-out infinite",
        }}
      />

      {/* Orb 2 — bottom-right violet */}
      <div
        className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full opacity-15"
        style={{
          background: "radial-gradient(circle, rgba(192,132,252,0.35) 0%, transparent 70%)",
          animation: "orb-drift-2 25s ease-in-out infinite",
        }}
      />

      {/* Orb 3 — center subtle pink */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-[0.07]"
        style={{
          background: "radial-gradient(circle, rgba(232,121,249,0.3) 0%, transparent 60%)",
          animation: "orb-drift-1 30s ease-in-out infinite reverse",
        }}
      />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />
    </div>
  );
}
