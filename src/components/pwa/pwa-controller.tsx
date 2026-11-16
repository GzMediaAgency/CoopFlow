"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { WifiOff, Wifi, Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaController() {
  const locale = useLocale();
  const isAr = locale === "ar";

  const [isOffline, setIsOffline] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    // 1. Enregistrement du Service Worker
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          // Service worker enregistré avec succès
        })
        .catch((err) => {
          console.warn("[PWA] Service Worker registration failed:", err);
        });
    }

    // 2. Surveillance du statut en ligne / hors-ligne
    const handleOnline = () => {
      setIsOffline(false);
      setShowReconnected(true);
      const timer = setTimeout(() => setShowReconnected(false), 3500);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setShowReconnected(false);
    };

    if (typeof window !== "undefined") {
      setIsOffline(!navigator.onLine);
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
    }

    // 3. Détection de l'invitation d'installation PWA
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      // N'afficher le bandeau d'installation que si non rejeté précédemment
      const dismissed = localStorage.getItem("coopflow_pwa_dismissed");
      if (!dismissed) {
        setShowInstallBanner(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") {
      setShowInstallBanner(false);
    }
    setInstallPrompt(null);
  };

  const handleDismissInstall = () => {
    setShowInstallBanner(false);
    localStorage.setItem("coopflow_pwa_dismissed", "1");
  };

  return (
    <>
      {/* 1. Alerte Hors-Ligne (visible en haut de l'écran lors d'une perte réseau) */}
      {isOffline && (
        <div
          role="status"
          className="fixed top-0 inset-x-0 z-50 flex items-center justify-center gap-2.5 bg-clay px-4 py-2 text-xs font-semibold text-white shadow-md animate-in slide-in-from-top duration-200"
          dir={isAr ? "rtl" : "ltr"}
        >
          <WifiOff size={16} className="shrink-0 animate-pulse" aria-hidden />
          <span>
            {isAr
              ? "وضع عدم الاتصال : أنت تتصفح البيانات المخزنة محليا. ستتم المزامنة فور عودة الشبكة."
              : "Mode hors-ligne : vous consultez les données locales. Synchronisation dès retour du réseau."}
          </span>
        </div>
      )}

      {/* 2. Notification de reconnexion */}
      {showReconnected && (
        <div
          role="status"
          className="fixed top-3 end-4 z-50 flex items-center gap-2 rounded-xl bg-forest px-4 py-2.5 text-xs font-semibold text-argan shadow-lg border border-argan/30 animate-in fade-in slide-in-from-top-2 duration-200"
          dir={isAr ? "rtl" : "ltr"}
        >
          <Wifi size={16} className="text-argan shrink-0" aria-hidden />
          <span>{isAr ? "تم استرجاع الاتصال بالشبكة !" : "Connexion Internet rétablie !"}</span>
        </div>
      )}

      {/* 3. Bandeau d'installation PWA mobile */}
      {showInstallBanner && (
        <aside
          role="complementary"
          aria-label={isAr ? "تثبيت تطبيق CoopFlow" : "Installer l'application CoopFlow"}
          className="fixed bottom-16 sm:bottom-4 start-4 end-4 sm:start-auto sm:end-4 sm:max-w-sm z-40 rounded-2xl border border-line bg-white/95 p-4 shadow-xl backdrop-blur-md animate-in slide-in-from-bottom duration-300 print:hidden"
          dir={isAr ? "rtl" : "ltr"}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-forest text-argan shrink-0 font-bold">
                CF
              </span>
              <div>
                <p className="font-semibold text-sm text-forest">
                  {isAr ? "تطبيق CoopFlow" : "Application CoopFlow"}
                </p>
                <p className="text-xs text-ink-muted">
                  {isAr
                    ? "أضف التطبيق إلى الشاشة الرئيسية لسرعة الوصول"
                    : "Installez l'application sur votre écran d'accueil"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDismissInstall}
              className="text-ink-muted hover:text-ink p-1 rounded-md"
              aria-label={isAr ? "إغلاق" : "Fermer"}
            >
              <X size={16} />
            </button>
          </div>

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={handleInstallClick}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-canopy px-3 py-2 text-xs font-bold text-white hover:bg-forest transition-colors"
            >
              <Download size={14} />
              {isAr ? "تثبيت الآن" : "Ajouter à l'écran d'accueil"}
            </button>
            <button
              type="button"
              onClick={handleDismissInstall}
              className="rounded-xl border border-line px-3 py-2 text-xs font-medium text-ink-muted hover:bg-field"
            >
              {isAr ? "لاحقا" : "Plus tard"}
            </button>
          </div>
        </aside>
      )}
    </>
  );
}

