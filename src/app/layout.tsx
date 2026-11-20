import type { Metadata } from "next";
import localFont from "next/font/local";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

// Self-hosted (SIL OFL, from @fontsource-variable) so the build never fetches
// from Google Fonts. Vercel builds failed in next/font/google on 2026-11-20.
const inter = localFont({
  src: "./fonts/inter-latin-wght-normal.woff2",
  variable: "--font-inter",
  weight: "300 700",
  display: "swap",
});

const playfair = localFont({
  src: "./fonts/playfair-display-latin-wght-normal.woff2",
  variable: "--font-playfair",
  weight: "400 700",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Award Letter Analyzer | FinLit Garden",
  description:
    "Every family its own CFO. Upload your college financial aid award letters and see what each school really costs, side by side.",
  keywords: [
    "financial aid",
    "award letter",
    "college",
    "scholarship",
    "FAFSA",
    "FinLit Garden",
    "compare colleges",
  ],
  openGraph: {
    title: "Award Letter Analyzer | FinLit Garden",
    description:
      "Every family its own CFO. Upload your award letters and see what each school really costs, side by side.",
    siteName: "FinLit Garden",
  },
  twitter: {
    card: "summary",
    title: "Award Letter Analyzer | FinLit Garden",
    description:
      "Every family its own CFO. Upload your award letters and see what each school really costs, side by side.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${playfair.variable} antialiased`}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}
