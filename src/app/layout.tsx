import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Award Letter Analyzer | FinLit Garden",
  description:
    "Upload your college financial aid award letters and get a side-by-side comparison to find the best deal. CFO Strategy for Families.",
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
      "Don't just save, strategize. Upload your award letters and get a side-by-side breakdown like a financial executive.",
    siteName: "FinLit Garden",
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
