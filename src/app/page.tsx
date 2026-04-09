"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, ArrowRight, RefreshCw, AlertCircle, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dropzone } from "@/components/upload/Dropzone";
import { FilePreviewList, type FilePreviewItem } from "@/components/upload/FilePreview";
import { DashboardShell } from "@/components/results/DashboardShell";
import { prepFiles, releasePreviews } from "@/lib/image-prep-client";
import { useAnalyzeStream } from "@/lib/use-analyze-stream";
import { trackEvent } from "@/lib/analytics";

export default function Home() {
  const [items, setItems] = useState<FilePreviewItem[]>([]);
  const [prepping, setPrepping] = useState(false);
  const [prepStatus, setPrepStatus] = useState("");
  const [prepError, setPrepError] = useState<string | null>(null);
  const router = useRouter();

  const { state, start } = useAnalyzeStream();

  const isAnalyzing = state.status === "uploading" || state.status === "streaming";
  const isBusy = prepping || isAnalyzing;

  // When the stream finishes with a shareId, navigate to the share page.
  // Small delay so the user can see the streamed dashboard land.
  useEffect(() => {
    if (state.status === "done") {
      if (state.results.length > 0) {
        trackEvent("analyze_succeeded", {
          letters: state.results.length,
          errors: state.errors.length,
        });
      } else {
        trackEvent("analyze_failed", { reason: state.fatalError ?? "no_results" });
      }
      if (state.shareId) {
        const t = setTimeout(() => router.push(`/analyze/${state.shareId}`), 1500);
        return () => clearTimeout(t);
      }
    }
  }, [state.status, state.shareId, state.results.length, state.errors.length, state.fatalError, router]);

  // Update per-item status as results stream in.
  useEffect(() => {
    if (state.results.length === 0 && state.errors.length === 0) return;
    setItems((prev) =>
      prev.map((item) => {
        if (state.results.find((r) => r.fileName === item.file.name)) {
          return { ...item, status: "done" };
        }
        const err = state.errors.find((e) => e.fileName === item.file.name);
        if (err) return { ...item, status: "error", errorMessage: err.error };
        return item;
      }),
    );
  }, [state.results, state.errors]);

  const handleFiles = async (files: File[]) => {
    setPrepError(null);
    setPrepping(true);
    setPrepStatus("Preparing files…");
    try {
      const prepped = await prepFiles(files, (msg) => setPrepStatus(msg));
      const newItems: FilePreviewItem[] = prepped.map((p, i) => ({
        ...p,
        id: `${Date.now()}-${i}-${p.originalName}`,
        status: "idle",
      }));
      setItems((prev) => [...prev, ...newItems]);
    } catch (err) {
      setPrepError(err instanceof Error ? err.message : "Failed to prepare files");
    } finally {
      setPrepping(false);
      setPrepStatus("");
    }
  };

  const handleRemove = (id: string) => {
    setItems((prev) => {
      const removed = prev.filter((p) => p.id === id);
      releasePreviews(removed);
      return prev.filter((p) => p.id !== id);
    });
  };

  const handleAnalyze = async () => {
    if (items.length === 0) return;
    trackEvent("upload_started", { count: items.length });
    // Mark all idle items as analyzing.
    setItems((prev) => prev.map((p) => ({ ...p, status: "analyzing" as const })));
    await start(items.map((p) => p.file));
  };

  const handleReset = () => {
    releasePreviews(items);
    setItems([]);
    setPrepError(null);
  };

  // Free preview URLs on unmount.
  useEffect(() => {
    return () => releasePreviews(items);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const buttonLabel = useMemo(() => {
    if (prepping) return prepStatus || "Preparing…";
    if (state.status === "uploading") return "Uploading…";
    if (state.status === "streaming") {
      return `Reading letter ${state.completed} of ${state.total}…`;
    }
    if (items.length === 0) return "Analyze Letters";
    return `Analyze ${items.length} ${items.length === 1 ? "Letter" : "Letters"}`;
  }, [prepping, prepStatus, state.status, state.completed, state.total, items.length]);

  return (
    <main className="min-h-screen bg-[#FDFBF7] relative overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-[#E8E4DC]">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <a
            href="https://finlitgarden.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div className="w-10 h-10 rounded-lg bg-[#1B4332] flex items-center justify-center">
              <Leaf className="w-6 h-6 text-[#B68D40]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#1B4332] font-serif">FinLit</h1>
              <p className="text-xs text-[#B68D40] font-medium tracking-wider uppercase">Garden</p>
            </div>
          </a>
          <nav>
            <a
              href="https://finlitgarden.com"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#1B4332] hover:bg-[#143526] text-white rounded-full px-5 py-2 text-sm font-medium transition-colors"
            >
              Get Started
            </a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-[#E8E4DC] rounded-full mb-6 shadow-sm">
              <span className="text-[#B68D40]">✦</span>
              <span className="text-sm font-medium text-[#4A5568] uppercase tracking-wider">
                CFO Strategy for Families
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#1B4332] font-serif leading-tight mb-6">
              The Strategic Roadmap to a{" "}
              <span className="text-[#B68D40] block md:inline">Debt-Free Degree.</span>
            </h1>

            <p className="text-lg text-[#4A5568] max-w-2xl mx-auto leading-relaxed mb-8">
              Don&apos;t just save, strategize. Upload your award letters and get a side-by-side
              breakdown like a financial executive.
            </p>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-lg p-6 md:p-10 max-w-3xl mx-auto border border-[#E8E4DC]"
        >
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-bold text-[#1B4332] font-serif mb-2">
              Upload Your Award Letters
            </h2>
            <p className="text-[#6B7280]">Compare multiple offers. See which is the best deal.</p>
          </div>

          <Dropzone onFiles={handleFiles} disabled={isBusy} />

          <FilePreviewList items={items} onRemove={handleRemove} removable={!isAnalyzing} />

          {items.length > 0 && (
            <div className="mt-6 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={handleReset}
                disabled={isBusy}
                className="text-sm text-[#6B7280] hover:text-[#1B4332] underline underline-offset-4"
              >
                Clear all
              </button>

              <Button
                onClick={handleAnalyze}
                disabled={items.length === 0 || isBusy}
                className="min-w-[220px] text-base py-6 bg-[#B68D40] hover:bg-[#9A7735] text-white rounded-full font-semibold shadow-md transition-all"
              >
                {isBusy ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    {buttonLabel}
                  </>
                ) : (
                  <>
                    {buttonLabel}
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
            </div>
          )}

          {(prepError || state.fatalError) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 text-red-700 text-sm"
            >
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Something went wrong</p>
                <p>{prepError || state.fatalError}</p>
              </div>
            </motion.div>
          )}

          {state.status === "done" && state.results.length === 0 && (
            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3 text-amber-800 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">No letters could be analyzed</p>
                <p>Please try clearer photos or different files.</p>
                <button
                  onClick={handleReset}
                  className="mt-2 inline-flex items-center gap-1 text-amber-900 underline"
                >
                  <RefreshCw className="w-3 h-3" /> Start over
                </button>
              </div>
            </div>
          )}
        </motion.div>

        {state.results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-6xl mx-auto mt-10"
          >
            <DashboardShell
              letters={state.results.map((r) => r.letter)}
              errors={state.errors.map((e) => `${e.fileName}: ${e.error}`)}
            />
          </motion.div>
        )}

        <p className="text-center text-[#9CA3AF] text-sm mt-12 pb-8">
          © 2026 FinLit Garden. Helping students graduate debt-free.
        </p>
      </div>
    </main>
  );
}
