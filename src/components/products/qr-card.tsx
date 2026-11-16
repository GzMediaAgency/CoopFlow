"use client";

import { useState, useId } from "react";
import { useTranslations } from "next-intl";
import { QrCode as QrIcon, Download, ExternalLink, Copy, Check, Printer } from "lucide-react";
import { QrCode } from "@/lib/qr";

type BatchOption = {
  id: string;
  batchNumber: string;
  producedAt: Date | string;
};

type Props = {
  productId: string;
  productSlug: string | null;
  productName: string;
  productSku: string;
  cooperativeName: string;
  batches: BatchOption[];
  locale: string;
};

export function ProductQrCard({
  productId,
  productSlug,
  productName,
  productSku,
  cooperativeName,
  batches,
  locale,
}: Props) {
  const t = useTranslations("products");
  const c = useTranslations("common");
  const [selectedBatch, setSelectedBatch] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const selectId = useId();

  // URL publique du produit
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const identifier = productSlug || productId;
  const baseUrl = `${origin}/${locale}/p/${identifier}`;
  const publicUrl = selectedBatch ? `${baseUrl}?batch=${encodeURIComponent(selectedBatch)}` : baseUrl;

  // Génération du SVG QR Code
  let svgString = "";
  try {
    const qr = QrCode.encodeText(publicUrl, QrCode.Ecc.MEDIUM);
    svgString = qr.toSvgString(3, "#123f38", "#ffffff");
  } catch (e) {
    console.error("Erreur génération QR code", e);
  }

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const downloadSvg = () => {
    if (!svgString) return;
    const blob = new Blob([svgString], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `qr-${productSku}${selectedBatch ? `-${selectedBatch}` : ""}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadPng = () => {
    if (!svgString) return;
    const img = new Image();
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const URL = window.URL || window.webkitURL || window;
    const blobURL = URL.createObjectURL(svgBlob);

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 600;
      canvas.height = 600;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, 600, 600);
        ctx.drawImage(img, 0, 0, 600, 600);
        const pngUrl = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = pngUrl;
        a.download = `qr-${productSku}${selectedBatch ? `-${selectedBatch}` : ""}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      URL.revokeObjectURL(blobURL);
    };
    img.src = blobURL;
  };

  const printLabel = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="${locale}">
        <head>
          <title>Étiquette ${productName} - ${productSku}</title>
          <style>
            @page { size: 80mm 80mm; margin: 4mm; }
            body { font-family: system-ui, sans-serif; text-align: center; color: #123f38; margin: 0; padding: 10px; }
            .org { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #66706b; }
            .name { font-size: 15px; font-weight: bold; margin: 4px 0 2px; }
            .sku { font-size: 11px; color: #a67c26; margin-bottom: 8px; font-weight: 600; }
            .qr { width: 150px; height: 150px; margin: 0 auto; }
            .scan { font-size: 10px; color: #66706b; margin-top: 6px; }
            .batch { font-size: 10px; font-weight: bold; margin-top: 3px; }
          </style>
        </head>
        <body>
          <div class="org">${cooperativeName}</div>
          <div class="name">${productName}</div>
          <div class="sku">Réf : ${productSku}</div>
          <div class="qr">${svgString}</div>
          <div class="scan">Scanner pour vérifier l'authenticité et la traçabilité</div>
          ${selectedBatch ? `<div class="batch">Lot : ${selectedBatch}</div>` : ""}
          <script>
            window.onload = function() { window.print(); window.close(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <section className="card p-4 lg:p-6">
      <div className="flex items-center justify-between gap-2 border-b border-line pb-3">
        <h2 className="flex items-center gap-2 font-semibold text-forest">
          <QrIcon size={18} className="text-argan" aria-hidden />
          {locale === "ar" ? "رمز QR والشهادة الرقمية" : "QR Code & Traçabilité Terroir"}
        </h2>
        <a
          href={`/${locale}/p/${identifier}${selectedBatch ? `?batch=${encodeURIComponent(selectedBatch)}` : ""}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-canopy hover:underline"
        >
          {locale === "ar" ? "معاينة الصفحة العامة" : "Page publique"}
          <ExternalLink size={13} aria-hidden />
        </a>
      </div>

      <div className="mt-4 grid gap-5 sm:grid-cols-[140px_1fr] items-center">
        {/* Affichage du QR Code */}
        <div className="flex flex-col items-center">
          <div
            className="size-32 rounded-xl border border-line bg-white p-2 shadow-xs transition-transform hover:scale-105"
            dangerouslySetInnerHTML={{ __html: svgString }}
          />
          <span className="mt-1.5 text-[11px] text-ink-muted">
            {locale === "ar" ? "امسح للتتبع" : "Scan pour traçabilité"}
          </span>
        </div>

        {/* Options et actions */}
        <div className="space-y-3 text-sm">
          {batches.length > 0 && (
            <div>
              <label htmlFor={selectId} className="block text-xs font-medium text-ink-muted mb-1">
                {locale === "ar" ? "ربط بـدفعة / حصة معينة (اختياري)" : "Lier à un lot spécifique (optionnel)"} :
              </label>
              <select
                id={selectId}
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
                className="w-full rounded-lg border border-line bg-field px-3 py-1.5 text-xs"
              >
                <option value="">{locale === "ar" ? "— كل الدفعات (عام) —" : "— Fiche générale du produit —"}</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.batchNumber}>
                    {locale === "ar" ? `الدفعة : ${b.batchNumber}` : `Lot : ${b.batchNumber}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="rounded-lg bg-field p-2.5 text-xs text-ink-muted break-all border border-line/60">
            <span className="font-semibold text-forest block mb-0.5">
              {locale === "ar" ? "الرابط العام المشفّر :" : "Lien public généré :"}
            </span>
            {publicUrl}
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={copyUrl}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-medium text-ink hover:bg-field"
            >
              {copied ? <Check size={14} className="text-canopy" /> : <Copy size={14} />}
              {copied ? (locale === "ar" ? "تم النسخ" : "Copié !") : (locale === "ar" ? "نسخ الرابط" : "Copier le lien")}
            </button>

            <button
              type="button"
              onClick={downloadSvg}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-medium text-ink hover:bg-field"
              title="Format vectoriel SVG idéal pour les étiquettes et emballages"
            >
              <Download size={14} />
              SVG
            </button>

            <button
              type="button"
              onClick={downloadPng}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-medium text-ink hover:bg-field"
            >
              <Download size={14} />
              PNG
            </button>

            <button
              type="button"
              onClick={printLabel}
              className="inline-flex items-center gap-1.5 rounded-lg bg-canopy/10 text-canopy px-2.5 py-1.5 text-xs font-semibold hover:bg-canopy/20"
            >
              <Printer size={14} />
              {locale === "ar" ? "طباعة الملصق" : "Imprimer étiquette"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
