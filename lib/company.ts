/**
 * Central company details used across the site (footer, legal pages, contact).
 * Update these values in one place to keep all pages consistent.
 */
export interface CompanyInfo {
  name: string;
  tradingName: string;
  registrationNumber: string;
  email: string;
  /** Contact for Pro / paid plan enquiries (Barnet Hill Academy). */
  paidPlanEmail: string;
  /** Optional — leave as empty string to hide the phone line. */
  phone: string;
  country: string;
  website: string;
}

export const COMPANY: CompanyInfo = {
  name: "Mathrix Ltd",
  tradingName: "Mathrix",
  registrationNumber: "16470495",
  email: "admin@mathrix.co.uk",
  paidPlanEmail: "info@barnethillacademy.org.uk",
  phone: "",
  country: "United Kingdom",
  website: "https://mathrix.co.uk",
};

/** ISO date used as the "last updated" stamp on legal pages. */
export const LEGAL_LAST_UPDATED = "9 June 2026";
