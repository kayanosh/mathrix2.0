import Link from "next/link";
import { COMPANY } from "@/lib/company";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-gray-200 bg-gray-50 text-gray-600">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          {/* Company details */}
          <div className="text-sm leading-relaxed">
            <p className="font-semibold text-gray-900">{COMPANY.name}</p>
            <p>Registered in {COMPANY.country}</p>
            <p>Company registration number: {COMPANY.registrationNumber}</p>
            <p>
              Email:{" "}
              <a
                href={`mailto:${COMPANY.email}`}
                className="text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                {COMPANY.email}
              </a>
            </p>
            {COMPANY.phone && (
              <p>
                Phone:{" "}
                <a
                  href={`tel:${COMPANY.phone.replace(/\s+/g, "")}`}
                  className="text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  {COMPANY.phone}
                </a>
              </p>
            )}
          </div>

          {/* Links */}
          <nav className="flex flex-col gap-2 text-sm sm:text-right">
            <Link href="/privacy" className="hover:text-gray-900 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-gray-900 transition-colors">
              Terms &amp; Conditions
            </Link>
            <Link href="/contact" className="hover:text-gray-900 transition-colors">
              Contact Us
            </Link>
          </nav>
        </div>

        <p className="mt-6 text-xs text-gray-400">
          © {year} {COMPANY.name}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
