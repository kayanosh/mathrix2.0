"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Loader2, Building2, GraduationCap, AlertTriangle } from "lucide-react";
import AuthModal from "@/components/AuthModal";
import { createClient } from "@/lib/supabase/client";
import PortalNav from "./PortalNav";

export interface CentreInfo {
  id: string;
  name: string;
  join_code: string;
  subscription_status: string;
  owner_id: string;
  created_at: string;
}
export interface TutorInfo {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
}
export interface PortalContext {
  centre: CentreInfo;
  tutors: TutorInfo[];
  role: string;
  isOwner: boolean;
  reload: () => void;
}

type Status = "loading" | "unauth" | "no-centre" | "ready" | "error";

export default function PortalShell({ children }: { children: (ctx: PortalContext) => React.ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [centre, setCentre] = useState<CentreInfo | null>(null);
  const [tutors, setTutors] = useState<TutorInfo[]>([]);
  const [role, setRole] = useState("student");
  const [isOwner, setIsOwner] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const load = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setStatus("unauth");
      return;
    }
    try {
      const res = await fetch("/api/centre", { cache: "no-store" });
      let data: {
        centre?: CentreInfo | null;
        tutors?: TutorInfo[];
        role?: string;
        isOwner?: boolean;
        error?: string;
      } = {};
      try {
        data = await res.json();
      } catch {
        /* non-JSON response */
      }

      if (!res.ok) {
        // The user IS signed in on the client, but the server rejected the
        // request. Don't bounce back to the sign-in gate (that causes a loop) —
        // show what went wrong instead.
        setErrorMsg(
          res.status === 401
            ? "We couldn't verify your session on the server. Please refresh the page and try again."
            : data.error ||
                "We couldn't load your centre. If you're setting this up, make sure the tuition-centre database migration has been applied.",
        );
        setStatus("error");
        return;
      }

      setRole(data.role || "student");
      if (!data.centre) {
        setStatus("no-centre");
        return;
      }
      setCentre(data.centre);
      setTutors(data.tutors || []);
      setIsOwner(!!data.isOwner);
      setStatus("ready");
    } catch {
      setErrorMsg("Network error while loading your centre. Please check your connection and refresh.");
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    // load() only updates state after awaiting the network, so this is safe.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // React to sign-in / sign-out happening in the auth modal (or elsewhere)
    // so the gate updates reliably instead of getting stuck.
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "TOKEN_REFRESHED") {
        setStatus("loading");
        load();
      }
    });
    return () => subscription.unsubscribe();
  }, [load]);

  if (status === "loading") {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="w-7 h-7 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (status === "unauth") {
    return (
      <div className="min-h-screen grid place-items-center px-6">
        <div className="max-w-md w-full text-center rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <span className="grid place-items-center w-12 h-12 mx-auto rounded-xl bg-indigo-600 text-white mb-4">
            <GraduationCap size={24} />
          </span>
          <h1 className="text-xl font-bold text-gray-900">Mathrix Tutor Portal</h1>
          <p className="text-gray-500 text-sm mt-1 mb-5">
            Sign in to run your tuition centre — teach, print worksheets, and track every student.
          </p>
          <button
            onClick={() => setShowAuth(true)}
            className="w-full rounded-xl bg-indigo-600 text-white py-2.5 font-semibold hover:bg-indigo-700"
          >
            Sign in / Create account
          </button>
        </div>
        <AnimatePresence>
          {showAuth && (
            <AuthModal
              onClose={() => setShowAuth(false)}
              onAuthenticated={() => {
                setShowAuth(false);
                setStatus("loading");
                load();
              }}
            />
          )}
        </AnimatePresence>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen grid place-items-center px-6">
        <div className="max-w-md w-full text-center rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <span className="grid place-items-center w-12 h-12 mx-auto rounded-xl bg-amber-100 text-amber-600 mb-4">
            <AlertTriangle size={24} />
          </span>
          <h1 className="text-lg font-bold text-gray-900">Couldn&apos;t open the portal</h1>
          <p className="text-gray-500 text-sm mt-1 mb-5">{errorMsg}</p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setStatus("loading");
                load();
              }}
              className="flex-1 rounded-xl bg-indigo-600 text-white py-2.5 font-semibold hover:bg-indigo-700"
            >
              Try again
            </button>
            <button
              onClick={async () => {
                await createClient().auth.signOut();
                setStatus("unauth");
              }}
              className="flex-1 rounded-xl border border-gray-200 text-gray-700 py-2.5 font-semibold hover:bg-gray-50"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (status === "no-centre") {
    return <CentreOnboarding onCreated={load} />;
  }

  return (
    <>
      <PortalNav centreName={centre?.name} />
      {centre &&
        children({
          centre,
          tutors,
          role,
          isOwner,
          reload: load,
        })}
    </>
  );
}

function CentreOnboarding({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError("");
    const res = await fetch("/api/centre", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", name: name.trim() }),
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Could not create centre");
      return;
    }
    onCreated();
  }

  return (
    <div className="min-h-screen grid place-items-center px-6">
      <div className="max-w-md w-full rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <span className="grid place-items-center w-12 h-12 rounded-xl bg-indigo-600 text-white mb-4">
          <Building2 size={24} />
        </span>
        <h1 className="text-xl font-bold text-gray-900">Set up your tuition centre</h1>
        <p className="text-gray-500 text-sm mt-1 mb-5">
          Create your centre to start adding students and tutors. You&apos;ll be the centre owner.
        </p>
        <form onSubmit={create}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Centre name (e.g. Bright Minds Tuition)"
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
          {error && <p className="text-sm text-rose-600 mb-3">{error}</p>}
          <button
            type="submit"
            disabled={busy || !name.trim()}
            className="w-full rounded-xl bg-indigo-600 text-white py-2.5 font-semibold hover:bg-indigo-700 disabled:opacity-50"
          >
            {busy ? "Creating…" : "Create centre"}
          </button>
        </form>
      </div>
    </div>
  );
}
