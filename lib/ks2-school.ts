export const KS2_SCHOOL_STORAGE_KEY = "ks2_school_id";

export const KS2_SCHOOLS = [
  {
    id: "barnet-hill-academy",
    name: "Barnet Hill Academy",
    tagline: "Year 5 & 6 curriculum",
  },
] as const;

export type KS2SchoolId = (typeof KS2_SCHOOLS)[number]["id"];

export interface KS2SchoolMeta {
  id: KS2SchoolId;
  name: string;
  tagline: string;
}

export function getKS2SchoolMeta(id?: string | null): KS2SchoolMeta | null {
  const schoolId = id ?? (typeof window !== "undefined" ? getKS2School() : null);
  if (!schoolId) return null;
  return KS2_SCHOOLS.find((s) => s.id === schoolId) ?? null;
}

export function getKS2School(): KS2SchoolId | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KS2_SCHOOL_STORAGE_KEY);
    if (!raw) return null;
    return KS2_SCHOOLS.some((s) => s.id === raw) ? (raw as KS2SchoolId) : null;
  } catch {
    return null;
  }
}

export function setKS2School(id: KS2SchoolId): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KS2_SCHOOL_STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
}

export const DEFAULT_KS2_SCHOOL_ID: KS2SchoolId = "barnet-hill-academy";
