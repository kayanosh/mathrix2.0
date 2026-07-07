"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, GraduationCap, Settings, BookOpenCheck, Home } from "lucide-react";

const LINKS = [
  { href: "/portal", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/portal/teach", label: "Teach", icon: BookOpenCheck, exact: false },
  { href: "/portal/settings", label: "Centre", icon: Settings, exact: false },
];

export default function PortalNav({ centreName }: { centreName?: string | null }) {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-200 print-hide">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-6 h-14">
        {/* Brand + centre */}
        <Link href="/portal" className="flex items-center gap-2.5 min-w-0">
          <span className="grid place-items-center w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-sm">
            <GraduationCap size={18} />
          </span>
          <span className="flex flex-col leading-tight min-w-0">
            <span className="text-[13px] font-bold text-gray-900 truncate max-w-[11rem]">
              {centreName || "Tuition Centre"}
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wide text-indigo-500">
              Mathrix Tutor Portal
            </span>
          </span>
        </Link>

        {/* Nav */}
        <div className="flex items-center gap-1">
          {LINKS.map((l) => {
            const active = l.exact ? pathname === l.href : pathname.startsWith(l.href);
            const Icon = l.icon;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  active ? "bg-indigo-50 text-indigo-700" : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Icon size={16} />
                <span className="hidden sm:inline">{l.label}</span>
              </Link>
            );
          })}

          <span className="h-5 w-px bg-gray-200 mx-1" aria-hidden />

          <Link
            href="/"
            title="Back to Mathrix"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          >
            <Home size={16} />
            <span className="hidden md:inline">Home</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
