"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, Camera } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface DropzoneProps {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
  maxFiles?: number;
}

export function Dropzone({ onFiles, disabled = false, maxFiles = 10 }: DropzoneProps) {
  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted.length > 0) onFiles(accepted);
    },
    [onFiles],
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "image/*": [".png", ".jpg", ".jpeg", ".webp", ".heic", ".heif", ".gif", ".bmp"],
    },
    disabled,
    maxFiles,
    noClick: false,
    noKeyboard: false,
  });

  return (
    <div
      {...getRootProps()}
      role="button"
      aria-label="Upload award letters"
      tabIndex={0}
      className={cn(
        "relative rounded-2xl border-2 border-dashed p-10 text-center transition-all cursor-pointer outline-none",
        "focus-visible:ring-4 focus-visible:ring-[#B68D40]/40",
        isDragActive
          ? "border-[#1B4332] bg-[#1B4332]/5 scale-[1.01]"
          : "border-[#E8E4DC] hover:border-[#B68D40] hover:bg-[#FDFBF7]",
        disabled && "pointer-events-none opacity-60",
      )}
    >
      <input {...getInputProps()} />

      <motion.div
        animate={{ scale: isDragActive ? 1.05 : 1 }}
        className="flex flex-col items-center gap-4"
      >
        <div className="p-4 rounded-full bg-[#1B4332]/10 text-[#1B4332]">
          <Upload className="w-8 h-8" aria-hidden />
        </div>

        <div>
          <h3 className="text-lg font-semibold text-[#1B4332] font-serif">
            {isDragActive ? "Drop letters here" : "Drag letters here, or click to browse"}
          </h3>
          <p className="text-sm text-[#6B7280] mt-1">
            PDFs · screenshots · phone photos · HEIC
          </p>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            // Trigger native file picker with camera capture preference on mobile.
            const input = document.createElement("input");
            input.type = "file";
            input.accept = "image/*";
            input.setAttribute("capture", "environment");
            input.multiple = true;
            input.onchange = () => {
              if (input.files && input.files.length > 0) {
                onFiles(Array.from(input.files));
              }
            };
            input.click();
          }}
          disabled={disabled}
          className="inline-flex items-center gap-2 text-sm font-medium text-[#B68D40] hover:text-[#9A7735] underline underline-offset-4"
        >
          <Camera className="w-4 h-4" aria-hidden />
          Take a photo
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            open();
          }}
          className="sr-only"
        >
          Browse files
        </button>
      </motion.div>
    </div>
  );
}
