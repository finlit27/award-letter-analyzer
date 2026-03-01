"use client";

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, FileText, Image as ImageIcon, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

interface FileUploadProps {
    files: File[];
    onFilesSelected: (files: File[]) => void;
    isUploading?: boolean;
}

export function FileUpload({ files, onFilesSelected, isUploading = false }: FileUploadProps) {

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const newFiles = [...files, ...acceptedFiles];
        onFilesSelected(newFiles);
    }, [files, onFilesSelected]);

    const removeFile = (indexToRemove: number) => {
        const newFiles = files.filter((_, index) => index !== indexToRemove);
        onFilesSelected(newFiles);
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf'],
            'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.heic', '.heif', '.gif', '.bmp']
        },
        disabled: isUploading
    });

    return (
        <div className="w-full max-w-2xl mx-auto space-y-6">
            <div
                {...getRootProps()}
                className={cn(
                    "relative border-2 border-dashed rounded-xl p-10 transition-all duration-300 ease-in-out cursor-pointer overflow-hidden group",
                    isDragActive
                        ? "border-emerald-500 bg-emerald-50/50 scale-[1.02]"
                        : "border-slate-200 hover:border-emerald-400 hover:bg-slate-50",
                    isUploading && "pointer-events-none opacity-50"
                )}
            >
                <input {...getInputProps()} />

                <div className="flex flex-col items-center justify-center text-center space-y-4">
                    <div className={cn(
                        "p-4 rounded-full bg-emerald-100/50 text-emerald-600 transition-transform duration-300",
                        isDragActive ? "scale-110" : "group-hover:scale-105"
                    )}>
                        <Upload className="w-8 h-8" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-slate-800">
                            {isDragActive ? "Drop files here" : "Upload Award Letters"}
                        </h3>
                        <p className="text-sm text-slate-500 mt-1">
                            Drag & drop PDFs, screenshots, or take a photo 📸
                        </p>
                        <p className="text-xs text-slate-400 mt-2">
                            Accepts: PDF, PNG, JPG, WebP, HEIC · PDFs auto-convert to images
                        </p>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {files.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="space-y-3"
                    >
                        <div className="flex items-center justify-between text-sm text-slate-500 px-1">
                            <span>{files.length} file{files.length !== 1 && 's'} selected</span>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onFilesSelected([]);
                                }}
                                className="text-red-500 hover:text-red-600 hover:bg-red-50 h-auto py-1 px-2"
                            >
                                Clear all
                            </Button>
                        </div>

                        <div className="grid gap-3">
                            {files.map((file, index) => (
                                <motion.div
                                    key={`${file.name}-${index}`}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-lg shadow-sm hover:shadow-md transition-shadow"
                                >
                                    <div className="flex items-center space-x-3 overflow-hidden">
                                        <div className={cn(
                                            "p-2 rounded",
                                            file.type.startsWith('image/')
                                                ? "bg-purple-100 text-purple-600"
                                                : "bg-slate-100 text-slate-600"
                                        )}>
                                            {file.type.startsWith('image/')
                                                ? <ImageIcon className="w-5 h-5" />
                                                : <FileText className="w-5 h-5" />
                                            }
                                        </div>
                                        <div className="truncate">
                                            <p className="text-sm font-medium text-slate-700 truncate max-w-[200px] sm:max-w-xs">{file.name}</p>
                                            <p className="text-xs text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeFile(index);
                                        }}
                                        disabled={isUploading}
                                        className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
