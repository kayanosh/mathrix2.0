"use client";

import { useState } from "react";
import { Copy, RefreshCw, UserPlus, Trash2, Building2, Crown } from "lucide-react";
import PortalShell, { type PortalContext } from "@/components/portal/PortalShell";

function Settings({ ctx }: { ctx: PortalContext }) {
  const { centre, tutors, isOwner, reload } = ctx;
  const [name, setName] = useState(centre.name);
  const [joinCode, setJoinCode] = useState(centre.join_code);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function post(body: Record<string, unknown>) {
    setBusy(true);
    setMsg("");
    const res = await fetch("/api/centre", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMsg(data.error || "Something went wrong");
      return null;
    }
    return data;
  }

  async function rename() {
    if (!name.trim() || name === centre.name) return;
    await post({ action: "rename", name: name.trim() });
    reload();
  }
  async function regenerate() {
    const data = await post({ action: "regenerateCode" });
    if (data?.joinCode) setJoinCode(data.joinCode);
  }
  async function invite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    const data = await post({ action: "inviteTutor", email: email.trim() });
    if (data) {
      setEmail("");
      setMsg("Tutor added.");
      reload();
    }
  }
  async function removeTutor(id: string) {
    await post({ action: "removeTutor", tutorId: id });
    reload();
  }

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1 flex items-center gap-2">
        <Building2 size={22} /> {centre.name}
      </h1>
      <p className="text-gray-500 text-sm mb-6">Manage your tuition centre and tutors.</p>

      {msg && <p className="mb-4 text-sm text-indigo-700 bg-indigo-50 rounded-lg px-3 py-2">{msg}</p>}

      {/* Centre details */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 mb-5">
        <h2 className="font-semibold text-gray-900 mb-3">Centre details</h2>
        <label className="block text-sm text-gray-600 mb-1">Centre name</label>
        <div className="flex gap-2 mb-4">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!isOwner}
            className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:bg-gray-50"
          />
          {isOwner && (
            <button
              onClick={rename}
              disabled={busy || !name.trim() || name === centre.name}
              className="rounded-xl bg-indigo-600 text-white px-4 py-2 text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
            >
              Save
            </button>
          )}
        </div>

        <label className="block text-sm text-gray-600 mb-1">Invite code</label>
        <div className="flex items-center gap-2">
          <span className="font-mono text-lg tracking-widest rounded-lg bg-gray-100 px-3 py-1.5">{joinCode}</span>
          <button
            onClick={() => navigator.clipboard?.writeText(joinCode)}
            className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50"
            title="Copy"
          >
            <Copy size={15} />
          </button>
          {isOwner && (
            <button
              onClick={regenerate}
              disabled={busy}
              className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              title="Regenerate"
            >
              <RefreshCw size={15} />
            </button>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Share this code with tutors so they can join (they sign up, then you add them by email below).
        </p>
      </section>

      {/* Tutors */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="font-semibold text-gray-900 mb-3">Tutors</h2>
        <div className="divide-y divide-gray-100 mb-4">
          {tutors.map((t) => (
            <div key={t.id} className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-gray-800 flex items-center gap-1.5">
                  {t.full_name || t.email}
                  {t.role === "centre_owner" && (
                    <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                      <Crown size={12} /> Owner
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-400">{t.email}</p>
              </div>
              {isOwner && t.role !== "centre_owner" && (
                <button
                  onClick={() => removeTutor(t.id)}
                  className="text-gray-300 hover:text-rose-500"
                  title="Remove tutor"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
        </div>

        {isOwner && (
          <form onSubmit={invite} className="flex gap-2">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Tutor's email (they must have signed up)"
              className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
            <button
              type="submit"
              disabled={busy || !email.trim()}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-50 text-indigo-700 px-4 py-2 text-sm font-semibold hover:bg-indigo-100 disabled:opacity-50"
            >
              <UserPlus size={15} /> Add
            </button>
          </form>
        )}
      </section>
    </main>
  );
}

export default function SettingsPage() {
  return <PortalShell>{(ctx) => <Settings ctx={ctx} />}</PortalShell>;
}
