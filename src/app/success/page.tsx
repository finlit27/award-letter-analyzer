import { redirect } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, ArrowRight, Leaf } from "lucide-react";
import { stripe } from "@/lib/stripe";

/**
 * Post-payment landing page.
 *
 * Cookie-setting happens in the /api/stripe/confirm route handler (Next.js 15+
 * doesn't allow Server Components to mutate cookies). By the time the user sees
 * this page, their paid-session cookie is already set.
 *
 * This page just re-reads the session from Stripe to display a personalized
 * confirmation (customer email, etc.).
 */

interface SuccessPageProps {
  searchParams: Promise<{ session_id?: string }>;
}

export default async function SuccessPage({ searchParams }: SuccessPageProps) {
  const { session_id } = await searchParams;

  if (!session_id) {
    redirect("/");
  }

  // Re-fetch the session purely for display (email, etc.).
  let email: string | undefined;
  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);
    email = session.customer_details?.email ?? undefined;
  } catch {
    // Display still works even if Stripe retrieval fails — cookie is already set.
  }

  return (
    <main className="min-h-screen bg-[#FDFBF7] flex items-center justify-center px-4">
      <div className="max-w-xl w-full bg-white rounded-2xl shadow-lg p-8 md:p-12 border border-[#E8E4DC]">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-[#1B4332] flex items-center justify-center mb-6">
            <CheckCircle2 className="w-10 h-10 text-[#B68D40]" />
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-[#1B4332] font-serif mb-3">
            You&apos;re unlocked.
          </h1>

          <p className="text-lg text-[#4A5568] mb-2">
            Thank you{email ? `, ${email}` : ""}. Your payment was successful.
          </p>

          <p className="text-[#6B7280] mb-8">
            You now have Multi-Compare access for the next 7 days. Upload up to 6 award
            letters for full side-by-side CFO analysis, 4-year projections, and PDF export.
          </p>

          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-[#B68D40] hover:bg-[#9A7735] text-white rounded-full px-8 py-3 font-semibold shadow-md transition-colors"
          >
            Compare Your Letters
            <ArrowRight className="w-5 h-5" />
          </Link>

          <div className="mt-8 pt-6 border-t border-[#E8E4DC] text-sm text-[#9CA3AF] flex items-center gap-2">
            <Leaf className="w-4 h-4 text-[#1B4332]" />
            <span>A receipt has been sent to your email from Stripe.</span>
          </div>
        </div>
      </div>
    </main>
  );
}
