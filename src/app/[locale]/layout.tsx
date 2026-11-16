
import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { routing, RTL_LOCALES } from "@/i18n/routing";
import { PwaController } from "@/components/pwa/pwa-controller";
import "../globals.css";

export const viewport: Viewport = {
  themeColor: "#123f38",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: {
    template: "%s — CoopFlow",
    default: "CoopFlow — Gestion des Coopératives Marocaines",
  },
  description: "Plateforme SaaS professionnelle de gestion des coopératives marocaines.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.svg", sizes: "192x192", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/icons/icon-192.svg", sizes: "192x192", type: "image/svg+xml" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CoopFlow",
  },
  formatDetection: {
    telephone: false,
  },
};

export function generateStaticParams() { return routing.locales.map((locale) => ({ locale })); }

export default async function RootLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as "fr" | "ar")) notFound();
  setRequestLocale(locale);
  return (
    <html lang={locale} dir={RTL_LOCALES.includes(locale) ? "rtl" : "ltr"}>
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icons/icon-192.svg" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600..800&family=Figtree:wght@300..900&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased">
        <NextIntlClientProvider messages={await getMessages()}>
          {children}
          <PwaController />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
