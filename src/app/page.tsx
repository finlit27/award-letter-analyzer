"use client";

import { useState } from "react";
import { FileUpload } from "@/components/file-upload";
import { ComparisonTable } from "@/components/comparison-table";
import { AnalysisResult } from "@/types";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowRight, RefreshCw, AlertCircle, Leaf } from "lucide-react";
import { motion } from "framer-motion";

export default function Home() {
    const [files, setFiles] = useState<File[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [results, setResults] = useState<AnalysisResult[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleAnalyze = async () => {
        if (files.length === 0) return;

        setIsAnalyzing(true);
        setError(null);

        const formData = new FormData();
        formData.append("parentEmail", "guest@example.com");
        formData.append("studentName", "Guest Student");

        files.forEach((file) => {
            formData.append("pdfFile", file);
        });

        try {
            const response = await fetch("/api/analyze", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.details || "Failed to analyze files");
            }

            const data = await response.json();
            setResults(data);
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : "An unexpected error occurred");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleReset = () => {
        setFiles([]);
        setResults(null);
        setError(null);
    };

    return (
        <main className="min-h-screen bg-[#FDFBF7] relative overflow-hidden">
            {/* Header */}
            <header className="bg-white border-b border-[#E8E4DC]">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <a href="https://finlitgarden.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                        <div className="w-10 h-10 rounded-lg bg-[#1B4332] flex items-center justify-center">
                            <Leaf className="w-6 h-6 text-[#B68D40]" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-[#1B4332] font-serif">FinLit</h1>
                            <p className="text-xs text-[#B68D40] font-medium tracking-wider uppercase">Garden</p>
                        </div>
                    </a>
                    <nav className="flex items-center">
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

            {/* Hero Section */}
            <div className="container mx-auto px-4 py-12 md:py-16">
                <div className="max-w-4xl mx-auto text-center mb-12">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-[#E8E4DC] rounded-full mb-6 shadow-sm">
                            <span className="text-[#B68D40]">✦</span>
                            <span className="text-sm font-medium text-[#4A5568] uppercase tracking-wider">CFO Strategy for Families</span>
                        </div>

                        {/* Title */}
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#1B4332] font-serif leading-tight mb-6">
                            The Strategic Roadmap to a{" "}
                            <span className="text-[#B68D40] block md:inline">Debt-Free Degree.</span>
                        </h1>

                        <p className="text-lg text-[#4A5568] max-w-2xl mx-auto leading-relaxed mb-8">
                            Don't just save, strategize. Upload your award letters and get a
                            side-by-side breakdown like a financial executive.
                        </p>
                    </motion.div>
                </div>

                {!results ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-2xl shadow-lg p-6 md:p-10 max-w-3xl mx-auto border border-[#E8E4DC]"
                    >
                        <div className="mb-8 text-center">
                            <h2 className="text-2xl font-bold text-[#1B4332] font-serif mb-2">Upload Your Award Letters</h2>
                            <p className="text-[#6B7280]">Compare multiple offers. See which is the best deal.</p>
                        </div>

                        <FileUpload files={files} onFilesSelected={setFiles} isUploading={isAnalyzing} />

                        <div className="mt-8 flex justify-center">
                            <Button
                                onClick={handleAnalyze}
                                disabled={files.length === 0 || isAnalyzing}
                                className="w-full md:w-auto min-w-[220px] text-lg py-6 bg-[#B68D40] hover:bg-[#9A7735] text-white rounded-full font-semibold shadow-md transition-all"
                            >
                                {isAnalyzing ? (
                                    <>
                                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                        Analyzing...
                                    </>
                                ) : (
                                    <>
                                        Analyze {files.length > 0 && `${files.length} `}Letters
                                        <ArrowRight className="w-5 h-5 ml-2" />
                                    </>
                                )}
                            </Button>
                        </div>

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 text-red-700 text-sm"
                            >
                                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-bold">Analysis Failed</p>
                                    <p>{error}</p>
                                </div>
                            </motion.div>
                        )}
                    </motion.div>
                ) : (
                    <div className="space-y-8">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-[#E8E4DC] flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold text-[#1B4332] font-serif">Analysis Results</h2>
                                <p className="text-[#6B7280] text-sm">Comparing {results.length} offer{results.length !== 1 ? 's' : ''}</p>
                            </div>
                            <Button
                                variant="outline"
                                onClick={handleReset}
                                className="border-[#1B4332] text-[#1B4332] hover:bg-[#1B4332] hover:text-white"
                            >
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Start Over
                            </Button>
                        </div>

                        <ComparisonTable results={results} />

                        <div className="text-center text-[#9CA3AF] text-sm mt-12 pb-8">
                            <p>© 2026 FinLit Garden. Helping students graduate debt-free.</p>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
