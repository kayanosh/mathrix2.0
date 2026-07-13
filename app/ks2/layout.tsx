"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { getKS2School } from "@/lib/ks2-school";

export default function KS2Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const onSchoolPage = pathname === "/ks2/school";
    const school = getKS2School();

    if (!school && !onSchoolPage) {
      router.replace("/ks2/school");
      return;
    }

    queueMicrotask(() => setReady(true));
  }, [pathname, router]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-indigo-50/60 to-white">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  return <>{children}</>;
}
