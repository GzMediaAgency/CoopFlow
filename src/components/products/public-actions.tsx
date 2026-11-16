"use client";

import { useState } from "react";
import { Copy, Check, Printer, Share2 } from "lucide-react";
import { useTranslations } from "next-intl";

export function PublicActions({ title, url }: { title: string; url?: string }) {
  const t = useTranslations("publicProduct");
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      const shareUrl = url || (typeof window !== "undefined" ? window.location.href : "");
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title,
          url: url || window.location.href,
        });
        return;
      } catch {
        // user cancelled or share failed
      }
    }
    handleCopy();
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <button
        type="button"
        onClick={handleShare}
        className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-2 text-xs font-medium text-ink hover:bg-field transition-colors"
      >
        <Share2 size={14} aria-hidden />
        {t("share")}
      </button>

      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-2 text-xs font-medium text-ink hover:bg-field transition-colors"
      >
        {copied ? <Check size={14} className="text-canopy" aria-hidden /> : <Copy size={14} aria-hidden />}
        {copied ? t("copied") : t("copyLink")}
      </button>

      <button
        type="button"
        onClick={handlePrint}
        className="inline-flex items-center gap-1.5 rounded-lg bg-canopy/10 text-canopy px-3 py-2 text-xs font-semibold hover:bg-canopy/20 transition-colors"
      >
        <Printer size={14} aria-hidden />
        {t("print")}
      </button>
    </div>
  );
}
