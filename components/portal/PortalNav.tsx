"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, GraduationCap, Settings, BookOpenCheck } from "lucide-react";

const LINKS = [
  { href: "/portal", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/portal/teach", label: "Teach", icon: BookOpenCheck, exact: false },
  { href: "/portal/settings", label: "Centre", icon: Settings, exact: false },
];

export default function PortalNav({ centreName }: { centreName?: string | null }) {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 py-3 bg-white/90 backdrop-blur border-b border-gray-200 print-hide">
      <Link href="/portal" className="flex items-center gap-2 font-bold text-gray-900">
        <span className="grid place-items-center w-8 h-8 rounded-lg bg-indigo-600 text-white">
          <GraduationCap size={18} />
        </span>
        <span className="hidden sm:inline">Mathrix</span>
        <span className="text-gray-300 hidden sm:inline">/</span>
        <span className="text-indigo-600 truncate max-w-[10rem]">{centreName || "Tuition Centre"}</span>
      </Link>

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
      </div>
    </nav>
  );
}
