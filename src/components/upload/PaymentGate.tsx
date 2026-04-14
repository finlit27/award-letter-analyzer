"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Lock, Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaymentGateProps {
  /** Context shown at top of gate: how many letters they tried to upload. */
  attemptedFileCount: number;
  /** Close the gate (user dismisses — they can still keep their 1 free analysis). */
  onDismiss: () => void;
}

const UNLOCKS = [
  "Compare up to 6 award letters side-by-side",
  "Full 4-year cost projection with inflation modeling",
  "Decline-loans scenario — see your out-of-pocket cost",
  "Value score + debt warnings for every school",
  "Downloadable PDF comparison for family discussions",
  "Save your analysis — shareable link for 30 days",
];

export function PaymentGate({ attemptedFileCount, onDismiss }: PaymentGateProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpgrade = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email || undefined }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Could not start checkout");
      }
      // Redirect to Stripe Checkout.
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6 overflow-y-auto"
      onClick={onDismiss}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", duration: 0.4 }}
        className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 md:p-8 border border-[#E8E4DC] my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onDismiss}
          className="absolute top-4 right-4 text-[#9CA3AF] hover:text-[#1B4332] p-1 rounded-full hover:bg-[#F7F3EC] transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#F7F3EC] border border-[#E8E4DC] rounded-full mb-4">
          <Lock className="w-3.5 h-3.5 text-[#B68D40]" />
          <span className="text-xs font-semibold text-[#4A5568] uppercase tracking-wider">
            Multi-Compare Unlock
          </span>
        </div>

        <h2 className="text-2xl md:text-3xl font-bold text-[#1B4332] font-serif mb-2">
          Ready to compare like a CFO?
        </h2>
        <p className="text-[#6B7280] mb-5">
          You uploaded <strong>{attemptedFileCount}</strong> letters. Unlock full
          side-by-side analysis for the price of one pizza.
        </p>

        <ul className="space-y-2.5 mb-6">
          {UNLOCKS.map((unlock) => (
            <li key={unlock} className="flex items-start gap-2.5 text-sm text-[#1E293B]">
              <div className="shrink-0 w-5 h-5 rounded-full bg-[#1B4332] flex items-center justify-center mt-0.5">
                <Check className="w-3 h-3 text-white" strokeWidth={3} />
              </div>
              <span>{unlock}</span>
            </li>
          ))}
        </ul>

        <div className="bg-[#FDFBF7] border border-[#E8E4DC] rounded-lg p-4 mb-5">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-[#1B4332] font-serif">$29</span>
            <span className="text-sm text-[#6B7280]">one-time · no subscription</span>
          </div>
          <p className="text-xs text-[#9CA3AF] mt-1">
            Financial advisors charge $200-500/hour for this analysis.
          </p>
        </div>

        <input
          type="email"
          placeholder="Your email (for receipt)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3 mb-3 border border-[#E8E4DC] rounded-lg text-[#1E293B] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#B68D40] focus:border-transparent"
          disabled={loading}
        />

        <Button
          onClick={handleUpgrade}
          disabled={loading}
          className="w-full text-base py-6 bg-[#B68D40] hover:bg-[#9A7735] text-white rounded-full font-semibold shadow-md transition-all"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Opening secure checkout…
            </>
          ) : (
            <>Unlock Multi-Compare · $29</>
          )}
        </Button>

        {error && (
          <p className="mt-3 text-sm text-red-600 text-center">{error}</p>
        )}

        <p className="text-center text-xs text-[#9CA3AF] mt-4">
          Secure payment by Stripe · Apple Pay &amp; Google Pay supported
        </p>
      </motion.div>
    </motion.div>
  );
}
