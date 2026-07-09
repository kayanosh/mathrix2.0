"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Plus, RotateCcw, Search, X } from "lucide-react";
import { useTeachSession } from "./TeachSessionProvider";
import { MAX_ROSTER, normalizeTeachRoute, studentTabLabel } from "@/lib/portal-teach-session";

export default function StudentSessionBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const {
    rosterStudents,
    activeStudentId,
    allStudents,
    loading,
    addToRoster,
    removeFromRoster,
    switchToStudent,
    clearSession,
  } = useTeachSession();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  const available = useMemo(() => {
    const rosterSet = new Set(rosterStudents.map((s) => s.id));
    const q = search.trim().toLowerCase();
    return allStudents
      .filter((s) => !rosterSet.has(s.id))
      .filter((s) => !q || s.full_name.toLowerCase().includes(q) || (s.year_group || "").toLowerCase().includes(q));
  }, [allStudents, rosterStudents, search]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    }
    if (pickerOpen) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [pickerOpen]);

  function handleNewSession() {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    clearSession();
    setConfirmClear(false);
  }

  function currentRoute(): string {
    const search = searchParams.toString();
    return normalizeTeachRoute(pathname, search);
  }

  return (
    <div className="sticky top-14 z-20 bg-indigo-50/95 backdrop-blur-md border-b border-indigo-100 print-hide">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-indigo-500 shrink-0 hidden sm:block">
            Session
          </span>

          <div className="flex-1 flex items-center gap-1.5 overflow-x-auto scrollbar-thin py-0.5">
            {loading && rosterStudents.length === 0 && (
              <span className="text-xs text-indigo-400 px-2">Loading students…</span>
            )}
            {!loading && rosterStudents.length === 0 && (
              <span className="text-xs text-indigo-600 px-2">Add students for this hour&apos;s session</span>
            )}
            {rosterStudents.map((s) => {
              const active = s.id === activeStudentId;
              return (
                <div key={s.id} className="flex items-center shrink-0">
                  <button
                    type="button"
                    onClick={() => switchToStudent(s.id, currentRoute())}
                    className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                      active
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "bg-white text-gray-700 border border-indigo-200 hover:border-indigo-400"
                    }`}
                  >
                    {studentTabLabel(s.full_name, s.year_group)}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeFromRoster(s.id)}
                    className={`ml-0.5 p-0.5 rounded ${
                      active ? "text-indigo-200 hover:text-white" : "text-gray-300 hover:text-gray-600"
                    }`}
                    title="Remove from session"
                  >
                    <X size={12} />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-1 shrink-0 relative" ref={pickerRef}>
            {rosterStudents.length < MAX_ROSTER && (
              <button
                type="button"
                onClick={() => {
                  setPickerOpen((o) => !o);
                  setSearch("");
                  setConfirmClear(false);
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
              >
                <Plus size={14} /> Add
              </button>
            )}

            {rosterStudents.length > 0 && (
              <button
                type="button"
                onClick={handleNewSession}
                onBlur={() => setTimeout(() => setConfirmClear(false), 150)}
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  confirmClear
                    ? "bg-rose-600 text-white"
                    : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                <RotateCcw size={13} />
                {confirmClear ? "Confirm?" : "New session"}
              </button>
            )}

            {pickerOpen && (
              <div className="absolute right-0 top-full mt-1 w-64 rounded-xl border border-gray-200 bg-white shadow-lg z-30">
                <div className="p-2 border-b border-gray-100">
                  <div className="relative">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search students…"
                      autoFocus
                      className="w-full pl-7 pr-2 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                  </div>
                </div>
                <ul className="max-h-48 overflow-y-auto py-1">
                  {available.length === 0 ? (
                    <li className="px-3 py-2 text-xs text-gray-400">No students to add</li>
                  ) : (
                    available.map((s) => (
                      <li key={s.id}>
                        <button
                          type="button"
                          onClick={() => {
                            addToRoster(s.id);
                            setPickerOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50"
                        >
                          <span className="font-medium text-gray-900">{s.full_name}</span>
                          {s.year_group && (
                            <span className="text-xs text-gray-400 ml-1">· {s.year_group}</span>
                          )}
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
