import Link from "next/link";
import Footer from "@/components/Footer";
import { COMPANY, LEGAL_LAST_UPDATED } from "@/lib/company";

export const metadata = {
  title: "Privacy Policy — Mathrix",
  description: "How Mathrix collects, uses, and protects your personal data.",
};

export default function PrivacyPage() {
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
        <article className="max-w-3xl mx-auto px-6 py-12 prose-legal">
          <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
          <p className="text-sm text-gray-500 mb-8">Last updated: {LEGAL_LAST_UPDATED}</p>

          <section className="space-y-4 text-gray-700 leading-relaxed">
            <p>
              This Privacy Policy explains how {COMPANY.name} (&ldquo;{COMPANY.tradingName}
              &rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo; or &ldquo;our&rdquo;) collects, uses, and
              protects your personal data when you use our website and services. We are committed to
              safeguarding your privacy and complying with the UK General Data Protection Regulation
              (UK GDPR) and the Data Protection Act 2018.
            </p>

            <h2 className="text-xl font-semibold pt-4 text-gray-900">1. Who we are</h2>
            <p>
              {COMPANY.name} is the data controller responsible for your personal data. We are
              registered in {COMPANY.country} under company registration number{" "}
              {COMPANY.registrationNumber}. You can contact us at any time at{" "}
              <a href={`mailto:${COMPANY.email}`} className="text-indigo-600 hover:text-indigo-800">
                {COMPANY.email}
              </a>
              .
            </p>

            <h2 className="text-xl font-semibold pt-4 text-gray-900">2. Information we collect</h2>
            <p>We may collect and process the following categories of data:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <strong>Account information</strong> — such as your name and email address when you
                register or sign in.
              </li>
              <li>
                <strong>Usage data</strong> — questions you submit, content you upload (e.g. photos
                of maths problems), and interactions with our tutoring features.
              </li>
              <li>
                <strong>Payment information</strong> — handled securely by our payment provider
                (Stripe). We do not store full card details on our servers.
              </li>
              <li>
                <strong>Technical data</strong> — such as IP address, browser type, device
                information, and cookies or similar technologies used to operate the service.
              </li>
            </ul>

            <h2 className="text-xl font-semibold pt-4 text-gray-900">3. How we use your data</h2>
            <p>We use your personal data to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Provide, operate, and improve our tutoring services;</li>
              <li>Create and manage your account;</li>
              <li>Process payments and manage subscriptions;</li>
              <li>Respond to your enquiries and provide customer support;</li>
              <li>Maintain the security and integrity of our service;</li>
              <li>Comply with our legal obligations.</li>
            </ul>

            <h2 className="text-xl font-semibold pt-4 text-gray-900">4. Legal bases for processing</h2>
            <p>
              We process your data on the basis of performance of a contract (to provide our
              services to you), our legitimate interests (to operate and improve the service),
              compliance with legal obligations, and your consent where required.
            </p>

            <h2 className="text-xl font-semibold pt-4 text-gray-900">5. Sharing your data</h2>
            <p>
              We do not sell your personal data. We share data only with trusted third-party service
              providers who help us run our service — for example, hosting providers, our database
              and authentication provider (Supabase), our payment processor (Stripe), and AI model
              providers used to generate tutoring responses. These providers are bound to process
              your data only on our instructions and to keep it secure.
            </p>

            <h2 className="text-xl font-semibold pt-4 text-gray-900">6. Data retention</h2>
            <p>
              We retain your personal data only for as long as necessary to provide our services and
              to meet our legal, accounting, or reporting obligations. You may request deletion of
              your account and associated data at any time.
            </p>

            <h2 className="text-xl font-semibold pt-4 text-gray-900">7. Your rights</h2>
            <p>Under UK data protection law, you have the right to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Access the personal data we hold about you;</li>
              <li>Request correction of inaccurate data;</li>
              <li>Request erasure of your data;</li>
              <li>Object to or restrict certain processing;</li>
              <li>Request portability of your data;</li>
              <li>Withdraw consent at any time.</li>
            </ul>
            <p>
              To exercise any of these rights, please contact us at{" "}
              <a href={`mailto:${COMPANY.email}`} className="text-indigo-600 hover:text-indigo-800">
                {COMPANY.email}
              </a>
              . You also have the right to lodge a complaint with the Information Commissioner&rsquo;s
              Office (ICO) at{" "}
              <a
                href="https://ico.org.uk"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:text-indigo-800"
              >
                ico.org.uk
              </a>
              .
            </p>

            <h2 className="text-xl font-semibold pt-4 text-gray-900">8. Cookies</h2>
            <p>
              We use cookies and similar technologies to keep you signed in, remember your
              preferences, and understand how our service is used. You can control cookies through
              your browser settings.
            </p>

            <h2 className="text-xl font-semibold pt-4 text-gray-900">9. Children&rsquo;s privacy</h2>
            <p>
              Our service is intended for students preparing for GCSE and A-Level examinations. Where
              users are under the age of 16, we expect a parent, guardian, or school to provide
              consent and oversee their use of the service.
            </p>

            <h2 className="text-xl font-semibold pt-4 text-gray-900">10. Changes to this policy</h2>
            <p>
              We may update this Privacy Policy from time to time. Any changes will be posted on this
              page with an updated &ldquo;Last updated&rdquo; date.
            </p>

            <h2 className="text-xl font-semibold pt-4 text-gray-900">11. Contact us</h2>
            <p>
              If you have any questions about this Privacy Policy or how we handle your data, please
              contact us at{" "}
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
