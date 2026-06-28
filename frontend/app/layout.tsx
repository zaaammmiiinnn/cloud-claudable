import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Cloud Claudable — AI App Builder",
  description:
    "Build production apps from natural language — powered by Claude Code running in isolated cloud containers. No local installs required.",
  keywords: ["AI", "app builder", "Claude Code", "cloud", "code generation", "SaaS"],
  authors: [{ name: "Cloud Claudable" }],
  openGraph: {
    title: "Cloud Claudable — AI App Builder",
    description: "Build full-stack apps from natural language, entirely in the cloud.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans bg-surface-0 text-gray-100 antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
