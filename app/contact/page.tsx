import Link from "next/link";
import { Mail, Phone, Building2 } from "lucide-react";
import Footer from "@/components/Footer";
import { COMPANY } from "@/lib/company";

export const metadata = {
  title: "Contact Us — Mathrix",
  description: "Get in touch with the Mathrix team. Company details and contact information.",
};

export default function ContactPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white text-gray-900">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <Link href="/" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Mathrix" className="h-7 w-auto" />
        </Link>
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
          Back to home
        </Link>
      </nav>

      <main className="flex-1">
        <div className="max-w-2xl mx-auto px-6 py-12">
          <h1 className="text-3xl font-bold mb-2">Contact Us</h1>
          <p className="text-gray-600 mb-8 leading-relaxed">
            Have a question, need help with your account, or want to get in touch? We&rsquo;d love to
            hear from you. Reach us using the details below and we&rsquo;ll get back to you as soon as
            we can.
          </p>

          <div className="space-y-4">
            <div className="flex items-start gap-4 rounded-xl border border-gray-200 p-5">
              <Mail className="text-indigo-600 mt-0.5" size={22} />
              <div>
                <p className="font-semibold text-gray-900">Email</p>
                <a
                  href={`mailto:${COMPANY.email}`}
                  className="text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  {COMPANY.email}
                </a>
              </div>
            </div>

            {COMPANY.phone && (
              <div className="flex items-start gap-4 rounded-xl border border-gray-200 p-5">
                <Phone className="text-indigo-600 mt-0.5" size={22} />
                <div>
                  <p className="font-semibold text-gray-900">Phone</p>
                  <a
                    href={`tel:${COMPANY.phone.replace(/\s+/g, "")}`}
                    className="text-indigo-600 hover:text-indigo-800 transition-colors"
                  >
                    {COMPANY.phone}
                  </a>
                </div>
              </div>
            )}

            <div className="flex items-start gap-4 rounded-xl border border-gray-200 p-5">
              <Building2 className="text-indigo-600 mt-0.5" size={22} />
              <div>
                <p className="font-semibold text-gray-900">Company details</p>
                <p className="text-gray-700">{COMPANY.name}</p>
                <p className="text-gray-700">Registered in {COMPANY.country}</p>
                <p className="text-gray-700">
                  Company registration number: {COMPANY.registrationNumber}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
