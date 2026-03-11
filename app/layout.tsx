import type { Metadata } from "next";
import { Caveat } from "next/font/google";
import "./globals.css";

const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-caveat",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Mathrix — AI Tutor for GCSE & A-Level",
  description:
    "Step-by-step AI tutoring for GCSE and A-Level students. Visual algebra, worked examples, and exam-focused explanations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`h-full ${caveat.variable}`}>
      <body className="h-full bg-white text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
