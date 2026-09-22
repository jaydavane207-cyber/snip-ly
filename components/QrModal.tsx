"use client";

import { useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { X, Download, Copy, ExternalLink, QrCode } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface QrModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  shortCode: string;
  title?: string;
}

export default function QrModal({
  isOpen,
  onClose,
  url,
  shortCode,
  title,
}: QrModalProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<HTMLDivElement>(null);

  const downloadPng = useCallback(() => {
    const canvas = canvasRef.current?.querySelector("canvas");
    if (!canvas) {
      toast.error("Failed to generate PNG");
      return;
    }
    const dataUrl = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `qr-${shortCode}.png`;
    a.click();
    toast.success("Downloaded PNG QR code");
  }, [shortCode]);

  const downloadSvg = useCallback(() => {
    const svg = svgRef.current?.querySelector("svg");
    if (!svg) {
      toast.error("Failed to generate SVG");
      return;
    }
    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = `qr-${shortCode}.svg`;
    a.click();
    URL.revokeObjectURL(blobUrl);
    toast.success("Downloaded SVG QR code");
  }, [shortCode]);

  const copyUrl = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard!");
    } catch {
      toast.error("Failed to copy link");
    }
  }, [url]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative w-full max-w-sm bg-white rounded-2xl border border-slate-100 shadow-2xl p-6 z-10"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <QrCode className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    QR Code
                  </h3>
                  <p className="text-xs text-slate-400">
                    /s/{shortCode}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {title && (
              <p className="text-xs text-slate-500 font-medium mb-3 truncate">
                {title}
              </p>
            )}

            {/* QR Code Container */}
            <div className="flex justify-center p-6 bg-slate-50 border border-slate-100 rounded-xl mb-4">
              <div ref={canvasRef} className="p-3 bg-white rounded-xl shadow-sm">
                <QRCodeCanvas
                  value={url}
                  size={200}
                  level="H"
                  fgColor="#4f46e5"
                  bgColor="#ffffff"
                  marginSize={1}
                />
              </div>
              {/* Hidden SVG element for SVG export */}
              <div ref={svgRef} className="hidden">
                <QRCodeSVG
                  value={url}
                  size={400}
                  level="H"
                  fgColor="#4f46e5"
                  bgColor="#ffffff"
                  marginSize={2}
                />
              </div>
            </div>

            {/* Short URL readout */}
            <div className="flex items-center justify-between gap-2 p-2.5 bg-slate-50 border border-slate-100 rounded-xl mb-4 text-xs font-mono text-slate-600">
              <span className="truncate">{url}</span>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={copyUrl}
                  className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-white transition-colors"
                  title="Copy URL"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-white transition-colors"
                  title="Open URL"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={downloadPng}
                className="w-full justify-center"
              >
                <Download className="w-3.5 h-3.5 mr-1" />
                PNG
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={downloadSvg}
                className="w-full justify-center"
              >
                <Download className="w-3.5 h-3.5 mr-1" />
                SVG
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
