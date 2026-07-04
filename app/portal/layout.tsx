import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tutor Portal — Mathrix",
  description:
    "Teach, generate printable worksheets with full solutions, and track every student's progress across Year 3 to A-Level.",
};

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-gray-50 text-gray-900">{children}</div>;
}
