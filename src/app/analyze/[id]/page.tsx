import { notFound } from "next/navigation";
import Link from "next/link";
import { Leaf, ArrowLeft } from "lucide-react";
import { loadAnalysis } from "@/lib/kv";
import { DashboardShell } from "@/components/results/DashboardShell";
import { headers } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function SharedAnalysisPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!id || !/^[A-Za-z0-9_-]{6,32}$/.test(id)) notFound();

  const record = await loadAnalysis(id);
  if (!record) notFound();

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? "https";
  const shareUrl = host ? `${proto}://${host}/analyze/${id}` : undefined;

  return (
    <main className="min-h-screen bg-[#FDFBF7]">
      <header className="bg-white border-b border-[#E8E4DC]">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link
            href="/"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div className="w-10 h-10 rounded-lg bg-[#1B4332] flex items-center justify-center">
              <Leaf className="w-6 h-6 text-[#B68D40]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#1B4332] font-serif">FinLit</h1>
              <p className="text-xs text-[#B68D40] font-medium tracking-wider uppercase">Garden</p>
            </div>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#1B4332] hover:text-[#B68D40]"
          >
            <ArrowLeft className="w-4 h-4" /> Analyze new letters
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <DashboardShell letters={record.results} errors={record.errors} shareUrl={shareUrl} />
        <p className="text-center text-[#9CA3AF] text-xs mt-12 pb-8">
          Analyzed {new Date(record.createdAt).toLocaleDateString()} · expires after 30 days
        </p>
      </div>
    </main>
  );
}
