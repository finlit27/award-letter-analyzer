"use client";

import { motion } from "framer-motion";
import { X, FileText, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PreppedFile } from "@/lib/image-prep-client";

export type FileStatus = "idle" | "analyzing" | "done" | "error";

export interface FilePreviewItem extends PreppedFile {
  id: string;
  status: FileStatus;
  errorMessage?: string;
}

interface FilePreviewProps {
  items: FilePreviewItem[];
  onRemove?: (id: string) => void;
  removable?: boolean;
}

export function FilePreviewList({ items, onRemove, removable = true }: FilePreviewProps) {
  if (items.length === 0) return null;

  return (
    <ul className="grid gap-3 mt-6" aria-label="Selected files">
      {items.map((item) => (
        <motion.li
          key={item.id}
          layout
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="flex items-center gap-3 p-3 bg-white border border-[#E8E4DC] rounded-lg shadow-sm"
        >
          {/* Thumbnail */}
          <div className="relative w-14 h-14 shrink-0 rounded-md overflow-hidden bg-[#FDFBF7] border border-[#E8E4DC]">
            {item.kind === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.previewUrl}
                alt=""
                className="w-full h-full object-cover"
                aria-hidden
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[#1B4332]">
                <FileText className="w-6 h-6" aria-hidden />
              </div>
            )}
          </div>

          {/* Name + size */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[#1B4332] truncate">{item.originalName}</p>
            <p className="text-xs text-[#6B7280]">
              {(item.file.size / 1024 / 1024).toFixed(2)} MB
              {item.status === "error" && item.errorMessage && (
                <span className="text-red-600"> · {item.errorMessage}</span>
              )}
            </p>
          </div>

          {/* Status icon */}
          <div className="shrink-0" aria-live="polite">
            {item.status === "idle" && null}
            {item.status === "analyzing" && (
              <Loader2 className="w-5 h-5 text-[#B68D40] animate-spin" aria-label="Analyzing" />
            )}
            {item.status === "done" && (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" aria-label="Analyzed" />
            )}
            {item.status === "error" && (
              <AlertCircle className="w-5 h-5 text-red-600" aria-label="Failed" />
            )}
          </div>

          {/* Remove */}
          {removable && onRemove && item.status !== "analyzing" && (
            <button
              type="button"
              onClick={() => onRemove(item.id)}
              aria-label={`Remove ${item.originalName}`}
              className={cn(
                "p-1.5 rounded-full text-[#6B7280] hover:text-red-600 hover:bg-red-50 transition-colors",
              )}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </motion.li>
      ))}
    </ul>
  );
}
