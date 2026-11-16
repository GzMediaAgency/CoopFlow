import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import {
  Award,
  Calendar,
  CheckCircle2,
  Globe,
  MapPin,
  Mail,
  Phone,
  MessageCircle,
  Package,
  ShieldCheck,
  Sparkles,
  Sprout,
  Tag,
  Users,
} from "lucide-react";
import { getPublicProduct } from "@/services/public-product";
import { dateFmt, money } from "@/lib/format";
import { QrCode } from "@/lib/qr";
import { PublicActions } from "@/components/products/public-actions";
import { Link } from "@/i18n/routing";

type Props = {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ batch?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const product = await getPublicProduct(id);
  if (!product) return { title: "Produit introuvable — CoopFlow" };

  const name = product.nameAr ? `${product.name} (${product.nameAr})` : product.name;
  return {
    title: `${name} — ${product.organization.name} | CoopFlow Terroir`,
    description:
      product.description ??
      `Découvrez l'authenticité et la traçabilité de ${product.name}, produit artisanal par la ${product.organization.name} (${product.organization.city ?? "Maroc"}).`,
    openGraph: {
      title: `${product.name} — ${product.organization.name}`,
      description: product.description ?? "Traçabilité garantie par la coopérative marocaine.",
      images: product.photoUrl ? [{ url: product.photoUrl }] : [],
    },
  };
}

export default async function PublicProductPage({ params, searchParams }: Props) {
  const { locale, id } = await params;
  const { batch: batchQuery } = await searchParams;
  const t = await getTranslations("publicProduct");
  const tp = await getTranslations("products");
  const tu = await getTranslations("units");

  const product = await getPublicProduct(id);
  if (!product) notFound();

  const org = product.organization;
  const isAr = locale === "ar";

  // Sélection du lot actif (soit celui passé en URL ?batch=..., soit le plus récent)
  const activeBatch =
    product.batches.find((b: any) => b.batchNumber.toLowerCase() === batchQuery?.toLowerCase()) ??
    product.batches[0] ??
    null;

  // Génération du QR Code autonome en SVG
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://coopflow.ma";
  const identifier = product.slug || product.id;
  const currentPublicUrl = `${siteUrl}/${locale}/p/${identifier}${
    activeBatch ? `?batch=${encodeURIComponent(activeBatch.batchNumber)}` : ""
  }`;

  let qrSvg = "";
  try {
    const qr = QrCode.encodeText(currentPublicUrl, QrCode.Ecc.MEDIUM);
    qrSvg = qr.toSvgString(3, "#123f38", "#ffffff");
  } catch {
    // fallback
  }

  // Téléphone WhatsApp nettoyé (retrait des espaces et tirets)
  const rawPhone = org.phone?.replace(/[^0-9]/g, "") ?? "";
  const waPhone = rawPhone.startsWith("0") ? `212${rawPhone.slice(1)}` : rawPhone;
  const waUrl = waPhone
    ? `https://wa.me/${waPhone}?text=${encodeURIComponent(
        `Bonjour, je vous contacte à propos du produit ${product.name} (${product.sku}).`
      )}`
    : null;

  return (
    <div className="min-h-dvh bg-field text-ink">
      {/* Navigation publique supérieure */}
      <header className="border-b border-line bg-white/90 backdrop-blur-md sticky top-0 z-30 px-4 py-3 sm:px-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-forest text-argan">
              <Sprout size={18} aria-hidden />
            </span>
            <div className="leading-tight">
              <span className="font-display font-bold text-forest text-lg block">CoopFlow</span>
              <span className="text-[10px] uppercase tracking-wider text-gold-deep font-semibold">
                Terroir du Maroc
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            {/* Bascule de langue FR / AR */}
            <div className="flex rounded-lg border border-line bg-field p-0.5 text-xs font-medium">
              <Link
                href={`/p/${identifier}${batchQuery ? `?batch=${encodeURIComponent(batchQuery)}` : ""}`}
                locale="fr"
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  locale === "fr" ? "bg-white font-bold text-forest shadow-xs" : "text-ink-muted hover:text-ink"
                }`}
              >
                FR
              </Link>
              <Link
                href={`/p/${identifier}${batchQuery ? `?batch=${encodeURIComponent(batchQuery)}` : ""}`}
                locale="ar"
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  locale === "ar" ? "bg-white font-bold text-forest shadow-xs" : "text-ink-muted hover:text-ink"
                }`}
              >
                العربية
              </Link>
            </div>

            <Link
              href="/login"
              className="hidden sm:inline-flex rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-canopy hover:bg-canopy-soft transition-colors"
            >
              {t("backHome")}
            </Link>
          </div>
        </div>
      </header>

      {/* Sceau d'authenticité */}
      <div className="bg-gradient-to-r from-forest via-forest-2 to-olive text-white px-4 py-3 text-center text-xs sm:text-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-center gap-2">
          <ShieldCheck size={18} className="text-argan shrink-0" aria-hidden />
          <span className="font-semibold">{t("verified")}</span>
          <span className="hidden md:inline text-white/60">·</span>
          <span className="hidden md:inline text-white/80">{t("verifiedSubtitle")}</span>
        </div>
      </div>

      <main className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Section Principale Produit & Coopérative */}
        <section className="card p-5 sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_300px] items-start">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {product.category && (
                  <span className="rounded-full bg-canopy-soft px-3 py-1 font-semibold text-canopy">
                    {product.category.name}
                  </span>
                )}
                <span className="rounded-full bg-field px-3 py-1 font-mono font-medium text-ink-muted border border-line">
                  {product.sku}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-argan/20 px-3 py-1 font-semibold text-gold-deep">
                  <Award size={13} aria-hidden />
                  {org.sector || "Produits du terroir"}
                </span>
              </div>

              <div>
                <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-forest">
                  {product.name}
                </h1>
                {product.nameAr && (
                  <p className="mt-1 font-display text-xl sm:text-2xl text-gold-deep font-bold" dir="rtl">
                    {product.nameAr}
                  </p>
                )}
              </div>

              {/* Coopérative productrice */}
              <div className="flex items-center gap-3 rounded-xl border border-line bg-field/70 p-3.5 text-sm">
                <span className="grid size-11 place-items-center rounded-xl bg-forest text-argan shrink-0 font-bold">
                  {org.name.slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-forest truncate">{org.name}</p>
                  <p className="text-xs text-ink-muted flex items-center gap-1 truncate">
                    <MapPin size={12} className="shrink-0 text-clay" aria-hidden />
                    {[org.city, org.region, "Maroc"].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </div>

              {product.description && (
                <div className="prose prose-sm text-ink-muted leading-relaxed pt-2">
                  <p>{product.description}</p>
                </div>
              )}

              {/* Prix de vente conseillé */}
              <div className="pt-2 flex flex-wrap items-baseline gap-3">
                <span className="text-3xl font-bold text-canopy">
                  {money(product.priceRetail, locale)}
                </span>
                <span className="text-xs text-ink-muted">
                  / {tu(product.unit)} {locale === "ar" ? "(ثمن البيع للعموم)" : "(Prix public conseillé)"}
                </span>
              </div>

              <div className="pt-2">
                <PublicActions title={`${product.name} — ${org.name}`} url={currentPublicUrl} />
              </div>
            </div>

            {/* Encadré QR Code de certification */}
            <div className="rounded-2xl border border-line bg-gradient-to-b from-field to-white p-5 text-center flex flex-col items-center">
              <span className="text-xs font-semibold uppercase tracking-wider text-gold-deep mb-2">
                {locale === "ar" ? "شهادة الأصالة الرقمية" : "Certificat Numérique"}
              </span>

              <div
                className="size-44 rounded-xl border border-line bg-white p-3 shadow-sm my-2 transition-transform hover:scale-105"
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />

              <p className="mt-2 text-xs text-ink-muted">
                {locale === "ar"
                  ? "امسح الرمز بواسطة الهاتف لتأكيد المصدر وتتبع بيانات الحصة"
                  : "Scannez ce QR code pour vérifier l'authenticité et la traçabilité officielle."}
              </p>

              {activeBatch && (
                <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-canopy/10 px-3 py-1.5 text-xs font-bold text-canopy">
                  <CheckCircle2 size={14} />
                  {locale === "ar" ? `الدفعة : ${activeBatch.batchNumber}` : `Lot : ${activeBatch.batchNumber}`}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Section Traçabilité & Détails du Lot */}
        <section className="card p-5 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4 mb-6">
            <div>
              <h2 className="font-display text-xl sm:text-2xl font-bold text-forest flex items-center gap-2">
                <Sparkles size={20} className="text-argan" aria-hidden />
                {t("traceability")}
              </h2>
              <p className="text-xs sm:text-sm text-ink-muted mt-0.5">
                {locale === "ar"
                  ? "بيانات موثوقة مسجلة في منصة CoopFlow الخاصة بالتعاونية"
                  : "Données transparentes enregistrées lors des opérations de récolte et de production."}
              </p>
            </div>

            {product.batches.length > 1 && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-ink-muted">{t("batchNumber")} :</span>
                <div className="flex flex-wrap gap-1">
                  {product.batches.map((b: any) => (
                    <Link
                      key={b.id}
                      href={`/p/${identifier}?batch=${encodeURIComponent(b.batchNumber)}`}
                      className={`px-2.5 py-1 rounded-md font-mono text-xs transition-colors ${
                        activeBatch?.batchNumber === b.batchNumber
                          ? "bg-forest text-white font-bold"
                          : "bg-field border border-line text-ink hover:bg-white"
                      }`}
                    >
                      {b.batchNumber}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {activeBatch ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-line bg-field/60 p-4">
                <span className="flex items-center gap-1.5 text-xs text-ink-muted">
                  <Tag size={14} className="text-argan" />
                  {t("batchNumber")}
                </span>
                <p className="mt-1 font-mono font-bold text-base text-forest">{activeBatch.batchNumber}</p>
                {activeBatch.origin && (
                  <p className="mt-1 text-xs text-ink-muted">
                    {t("origin")} : {activeBatch.origin}
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-line bg-field/60 p-4">
                <span className="flex items-center gap-1.5 text-xs text-ink-muted">
                  <Calendar size={14} className="text-canopy" />
                  {t("productionDate")}
                </span>
                <p className="mt-1 font-semibold text-base text-forest">
                  {dateFmt(activeBatch.producedAt, locale)}
                </p>
                {activeBatch.expiresAt && (
                  <p className="mt-1 text-xs text-clay">
                    {t("expirationDate")} : {dateFmt(activeBatch.expiresAt, locale)}
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-line bg-field/60 p-4">
                <span className="flex items-center gap-1.5 text-xs text-ink-muted">
                  <Users size={14} className="text-sky" />
                  {t("producer")}
                </span>
                <p className="mt-1 font-semibold text-base text-forest">
                  {activeBatch.producerName || org.name}
                </p>
                {activeBatch.records[0]?.groupName && (
                  <p className="mt-1 text-xs text-ink-muted">{activeBatch.records[0].groupName}</p>
                )}
              </div>

              <div className="rounded-xl border border-line bg-field/60 p-4">
                <span className="flex items-center gap-1.5 text-xs text-ink-muted">
                  <Award size={14} className="text-gold-deep" />
                  {t("quality")}
                </span>
                <p className="mt-1 font-semibold text-base text-forest">
                  {activeBatch.records[0]?.quality || (locale === "ar" ? "جودة ممتازة" : "Première qualité")}
                </p>
                <p className="mt-1 text-xs text-canopy font-medium">
                  {locale === "ar" ? "خاضع لمراقبة التعاونية" : "Contrôle coopérative validé"}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-ink-muted">
              {locale === "ar"
                ? "لا توجد دفعات محددة حاليا. تواصل مع التعاونية للاستفسار."
                : "Aucun lot enregistré pour le moment. Contactez la coopérative pour toute information."}
            </p>
          )}

          {/* Frise chronologique du savoir-faire marocain */}
          <div className="mt-8 pt-6 border-t border-line">
            <h3 className="font-semibold text-sm text-forest mb-4 uppercase tracking-wider">
              {t("steps.title")}
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="relative rounded-xl border border-line bg-white p-4">
                <span className="grid size-8 place-items-center rounded-lg bg-canopy/10 text-canopy font-bold text-xs mb-2">
                  1
                </span>
                <h4 className="font-semibold text-sm text-forest">{t("steps.harvest")}</h4>
                <p className="mt-1 text-xs text-ink-muted leading-relaxed">{t("steps.harvestDesc")}</p>
              </div>

              <div className="relative rounded-xl border border-line bg-white p-4">
                <span className="grid size-8 place-items-center rounded-lg bg-argan/25 text-gold-deep font-bold text-xs mb-2">
                  2
                </span>
                <h4 className="font-semibold text-sm text-forest">{t("steps.craft")}</h4>
                <p className="mt-1 text-xs text-ink-muted leading-relaxed">{t("steps.craftDesc")}</p>
              </div>

              <div className="relative rounded-xl border border-line bg-white p-4">
                <span className="grid size-8 place-items-center rounded-lg bg-sky/10 text-sky font-bold text-xs mb-2">
                  3
                </span>
                <h4 className="font-semibold text-sm text-forest">{t("steps.batching")}</h4>
                <p className="mt-1 text-xs text-ink-muted leading-relaxed">{t("steps.batchingDesc")}</p>
              </div>

              <div className="relative rounded-xl border border-line bg-white p-4">
                <span className="grid size-8 place-items-center rounded-lg bg-clay/10 text-clay font-bold text-xs mb-2">
                  4
                </span>
                <h4 className="font-semibold text-sm text-forest">{t("steps.delivery")}</h4>
                <p className="mt-1 text-xs text-ink-muted leading-relaxed">{t("steps.deliveryDesc")}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Section Coopérative & Contact */}
        <section className="card p-5 sm:p-8">
          <div className="grid gap-6 md:grid-cols-2 items-start">
            <div className="space-y-3">
              <h2 className="font-display text-xl font-bold text-forest">{t("coopInfo")}</h2>
              <p className="font-semibold text-lg text-forest">{org.name}</p>
              {org.description ? (
                <p className="text-sm text-ink-muted leading-relaxed">{org.description}</p>
              ) : (
                <p className="text-sm text-ink-muted leading-relaxed">
                  {locale === "ar"
                    ? "تعاونية مغربية تسعى إلى تنمية الاقتصاد التضامني وتثمين المنتجات المجالية وتوفير فرص عمل لنساء ورجال المنطقة."
                    : "Coopérative marocaine engagée dans la valorisation du terroir, l'économie solidaire et le soutien aux producteurs locaux."}
                </p>
              )}

              {/* Informations légales */}
              <div className="pt-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1.5">
                  {t("legalNotice")}
                </h3>
                <dl className="grid grid-cols-2 gap-2 text-xs">
                  {org.ice && (
                    <div className="rounded-lg bg-field p-2 border border-line">
                      <dt className="text-ink-muted">ICE</dt>
                      <dd className="font-mono font-semibold text-forest">{org.ice}</dd>
                    </div>
                  )}
                  {org.taxId && (
                    <div className="rounded-lg bg-field p-2 border border-line">
                      <dt className="text-ink-muted">IF (Identifiant fiscal)</dt>
                      <dd className="font-mono font-semibold text-forest">{org.taxId}</dd>
                    </div>
                  )}
                  {org.type && (
                    <div className="rounded-lg bg-field p-2 border border-line">
                      <dt className="text-ink-muted">{locale === "ar" ? "نوع التعاونية" : "Type"}</dt>
                      <dd className="font-semibold text-forest">{org.type}</dd>
                    </div>
                  )}
                  <div className="rounded-lg bg-field p-2 border border-line">
                    <dt className="text-ink-muted">{locale === "ar" ? "المدينة" : "Ville"}</dt>
                    <dd className="font-semibold text-forest">{org.city ?? "Maroc"}</dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Contact direct */}
            <div className="rounded-xl border border-line bg-field/60 p-5 space-y-4">
              <h3 className="font-semibold text-forest text-base">{t("contact")}</h3>

              <div className="space-y-2.5 text-sm">
                {org.address && (
                  <p className="flex items-start gap-2.5 text-ink-muted">
                    <MapPin size={16} className="text-clay shrink-0 mt-0.5" />
                    <span>{org.address}</span>
                  </p>
                )}
                {org.phone && (
                  <p className="flex items-center gap-2.5 text-ink-muted">
                    <Phone size={16} className="text-canopy shrink-0" />
                    <span dir="ltr" className="font-mono">{org.phone}</span>
                  </p>
                )}
                {org.email && (
                  <p className="flex items-center gap-2.5 text-ink-muted">
                    <Mail size={16} className="text-sky shrink-0" />
                    <span className="truncate">{org.email}</span>
                  </p>
                )}
                {org.website && (
                  <p className="flex items-center gap-2.5 text-ink-muted">
                    <Globe size={16} className="text-gold-deep shrink-0" />
                    <a
                      href={org.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-canopy hover:underline"
                    >
                      {org.website}
                    </a>
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                {org.phone && (
                  <a
                    href={`tel:${org.phone}`}
                    className="inline-flex items-center gap-2 rounded-lg bg-forest text-white px-3.5 py-2 text-xs font-semibold hover:bg-forest-2 transition-colors"
                  >
                    <Phone size={14} />
                    {t("call")}
                  </a>
                )}
                {waUrl && (
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg bg-[#25D366] text-white px-3.5 py-2 text-xs font-semibold hover:opacity-95 transition-opacity"
                  >
                    <MessageCircle size={14} />
                    {t("whatsapp")}
                  </a>
                )}
                {org.email && (
                  <a
                    href={`mailto:${org.email}`}
                    className="inline-flex items-center gap-2 rounded-lg border border-line bg-white text-ink px-3.5 py-2 text-xs font-semibold hover:bg-field transition-colors"
                  >
                    <Mail size={14} />
                    {t("email")}
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer public */}
      <footer className="mt-12 border-t border-line bg-white py-6 text-center text-xs text-ink-muted print:hidden">
        <div className="mx-auto max-w-5xl px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} {org.name} · {locale === "ar" ? "جميع الحقوق محفوظة" : "Tous droits réservés"}</p>
          <p className="flex items-center gap-1.5">
            <span>{locale === "ar" ? "تتبع موثوق عبر" : "Traçabilité propulsée par"}</span>
            <span className="font-bold text-forest">CoopFlow</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
