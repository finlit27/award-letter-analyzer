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
