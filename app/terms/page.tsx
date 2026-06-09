import Link from "next/link";
import Footer from "@/components/Footer";
import { COMPANY, LEGAL_LAST_UPDATED } from "@/lib/company";

export const metadata = {
  title: "Terms & Conditions — Mathrix",
  description: "The terms and conditions governing your use of the Mathrix service.",
};

export default function TermsPage() {
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
        <article className="max-w-3xl mx-auto px-6 py-12">
          <h1 className="text-3xl font-bold mb-2">Terms &amp; Conditions</h1>
          <p className="text-sm text-gray-500 mb-8">Last updated: {LEGAL_LAST_UPDATED}</p>

          <section className="space-y-4 text-gray-700 leading-relaxed">
            <p>
              These Terms &amp; Conditions (&ldquo;Terms&rdquo;) govern your use of the website and
              services provided by {COMPANY.name} (&ldquo;{COMPANY.tradingName}&rdquo;,
              &ldquo;we&rdquo;, &ldquo;us&rdquo; or &ldquo;our&rdquo;). By accessing or using our
              service, you agree to be bound by these Terms. If you do not agree, please do not use
              the service.
            </p>

            <h2 className="text-xl font-semibold pt-4 text-gray-900">1. About us</h2>
            <p>
              {COMPANY.name} is a company registered in {COMPANY.country} under company registration
              number {COMPANY.registrationNumber}. You can contact us at{" "}
              <a href={`mailto:${COMPANY.email}`} className="text-indigo-600 hover:text-indigo-800">
                {COMPANY.email}
              </a>
              .
            </p>

            <h2 className="text-xl font-semibold pt-4 text-gray-900">2. The service</h2>
            <p>
              Mathrix provides AI-assisted tutoring and revision tools for GCSE and A-Level
              mathematics, including step-by-step worked solutions, practice questions, and related
              educational content. The service is intended as a learning aid and does not guarantee
              any particular examination result or grade.
            </p>

            <h2 className="text-xl font-semibold pt-4 text-gray-900">3. Accounts</h2>
            <p>
              To access certain features you must create an account. You are responsible for keeping
              your login details secure and for all activity that occurs under your account. You must
              provide accurate information and notify us promptly of any unauthorised use.
            </p>

            <h2 className="text-xl font-semibold pt-4 text-gray-900">4. Subscriptions and payment</h2>
            <p>
              Some features are available only with a paid subscription. Prices and plan details are
              shown before purchase. Payments are processed securely by our payment provider. Unless
              stated otherwise, subscriptions renew automatically until cancelled. You may cancel at
              any time, and cancellation takes effect at the end of the current billing period.
            </p>

            <h2 className="text-xl font-semibold pt-4 text-gray-900">5. Refunds and cancellation</h2>
            <p>
              If you are a consumer in the UK, you may have a statutory right to cancel within 14 days
              of purchase. By starting to use a digital subscription within this period you may waive
              your right to a refund for the portion used. Please contact us at{" "}
              <a href={`mailto:${COMPANY.email}`} className="text-indigo-600 hover:text-indigo-800">
                {COMPANY.email}
              </a>{" "}
              with any refund requests.
            </p>

            <h2 className="text-xl font-semibold pt-4 text-gray-900">6. Acceptable use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Use the service for any unlawful or fraudulent purpose;</li>
              <li>Attempt to disrupt, reverse-engineer, or gain unauthorised access to the service;</li>
              <li>Share your account or resell access without our permission;</li>
              <li>Upload content that is unlawful, harmful, or infringes the rights of others.</li>
            </ul>

            <h2 className="text-xl font-semibold pt-4 text-gray-900">7. Intellectual property</h2>
            <p>
              All content, software, and materials provided through the service (excluding content
              you submit) are owned by or licensed to {COMPANY.name} and are protected by
              intellectual property laws. You are granted a limited, non-exclusive, non-transferable
              licence to use the service for your personal, non-commercial educational use.
            </p>

            <h2 className="text-xl font-semibold pt-4 text-gray-900">8. Accuracy and disclaimer</h2>
            <p>
              While we strive for accuracy, AI-generated explanations may occasionally contain
              errors. The service is provided &ldquo;as is&rdquo; without warranties of any kind. You
              should always review and verify solutions, particularly for examination purposes.
            </p>

            <h2 className="text-xl font-semibold pt-4 text-gray-900">9. Limitation of liability</h2>
            <p>
              To the fullest extent permitted by law, {COMPANY.name} shall not be liable for any
              indirect, incidental, or consequential loss arising from your use of the service.
              Nothing in these Terms limits liability that cannot be excluded under applicable law.
            </p>

            <h2 className="text-xl font-semibold pt-4 text-gray-900">10. Termination</h2>
            <p>
              We may suspend or terminate your access if you breach these Terms. You may stop using
              the service and close your account at any time.
            </p>

            <h2 className="text-xl font-semibold pt-4 text-gray-900">11. Changes to these Terms</h2>
            <p>
              We may update these Terms from time to time. Continued use of the service after changes
              are posted constitutes acceptance of the revised Terms.
            </p>

            <h2 className="text-xl font-semibold pt-4 text-gray-900">12. Governing law</h2>
            <p>
              These Terms are governed by the laws of England and Wales, and any disputes shall be
              subject to the exclusive jurisdiction of the courts of England and Wales.
            </p>

            <h2 className="text-xl font-semibold pt-4 text-gray-900">13. Contact</h2>
            <p>
              For any questions about these Terms, please contact us at{" "}
              <a href={`mailto:${COMPANY.email}`} className="text-indigo-600 hover:text-indigo-800">
                {COMPANY.email}
              </a>
              .
            </p>
          </section>
        </article>
      </main>

      <Footer />
    </div>
  );
}
