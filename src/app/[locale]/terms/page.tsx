import type { Metadata } from "next";
import { Link } from "@/i18n/routing";
import { PublicLegalHeader } from "@/components/layout/public-legal-header";
import { ShieldCheck, FileText, Scale, Building2, CheckCircle2 } from "lucide-react";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const isAr = locale === "ar";
  return {
    title: isAr
      ? "شروط الاستخدام العامة — CoopFlow"
      : "Conditions Générales d'Utilisation (CGU) — CoopFlow",
    description: isAr
      ? "شروط الاستخدام العامة لمنصة تدبير التعاونيات المغربية CoopFlow وفقاً للقانون 112-12."
      : "Conditions Générales d'Utilisation de la plateforme SaaS de gestion des coopératives marocaines CoopFlow.",
  };
}

export default async function TermsPage({ params }: Props) {
  const { locale } = await params;
  const isAr = locale === "ar";

  return (
    <div className="min-h-screen bg-field text-ink" dir={isAr ? "rtl" : "ltr"}>
      <PublicLegalHeader locale={locale} currentPath="/terms" />

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        {/* En-tête */}
        <div className="rounded-2xl border border-line bg-white p-6 sm:p-10 shadow-xs">
          <div className="flex items-center gap-3 text-forest">
            <span className="grid size-10 place-items-center rounded-xl bg-forest/10 text-forest">
              <FileText size={22} aria-hidden />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gold-deep">
                {isAr ? "الوثائق القانونية" : "Cadre Juridique & Réglementaire"}
              </p>
              <h1 className="font-display text-2xl font-bold sm:text-3xl text-forest">
                {isAr
                  ? "شروط الاستخدام العامة (CGU)"
                  : "Conditions Générales d'Utilisation (CGU)"}
              </h1>
            </div>
          </div>

          <p className="mt-4 text-sm leading-relaxed text-ink-muted">
            {isAr
              ? "آخر تحديث: نونبر 2026. تطبق هذه الشروط على كافة التعاونيات والاتحادات والمجموعات ذات النفع الاقتصادي المستفيدة من خدمات منصة CoopFlow وفقاً للتشريع المغربي الجاري به العمل."
              : "Dernière mise à jour : Novembre 2026. Les présentes conditions régissent l'accès et l'utilisation de la plateforme CoopFlow par les coopératives, unions et groupements professionnels régis par la loi marocaine n° 112-12."}
          </p>
        </div>

        {/* Contenu */}
        {isAr ? (
          <div className="mt-8 space-y-8">
            <section className="rounded-2xl border border-line bg-white p-6 sm:p-8 shadow-xs space-y-4">
              <h2 className="flex items-center gap-2 font-display text-xl font-bold text-forest">
                <span>1.</span> الديباجة والتعريفات
              </h2>
              <p className="text-sm leading-relaxed text-ink-muted">
                تم تطوير منصة <strong>CoopFlow</strong> لتوفير حل برمجي سحابي متكامل (SaaS) مخصص للتعاونيات المغربية الخاضعة لأحكام <strong>القانون رقم 112-12</strong> المتعلق بالتعاونيات. تهدف المنصة إلى رقمنة وتدبير السجلات القانونية للمنخرطين، الحصص الاجتماعية، دورات الإنتاج والتحويل، وتتبع المخزون والفوترة.
              </p>
              <ul className="list-disc list-inside space-y-1.5 text-sm text-ink-muted pr-2">
                <li><strong>المنصة / الخدمة:</strong> حلول وبرمجيات CoopFlow المتاحة عبر الويب وتطبيقات PWA.</li>
                <li><strong>المستخدم / التعاونية:</strong> التعاونية أو الاتحاد المؤسس قانونياً بالمغرب والممثل بواسطة أعضاء مكتبه الإداري المفوضين.</li>
                <li><strong>البيانات:</strong> كافة المعلومات والمستندات والسجلات الرقمية التي تقوم التعاونية بإدخالها ومعالجتها عبر المنصة.</li>
              </ul>
            </section>

            <section className="rounded-2xl border border-line bg-white p-6 sm:p-8 shadow-xs space-y-4">
              <h2 className="flex items-center gap-2 font-display text-xl font-bold text-forest">
                <span>2.</span> الولوج، التسجيل وفترة التجربة المجانية
              </h2>
              <p className="text-sm leading-relaxed text-ink-muted">
                يتاح التسجيل لمسؤولي التعاونيات عبر إنشاء حساب رسمي. تستفيد كل تعاونية جديدة من <strong>فترة تجريبية مجانية لمدة 14 يوماً</strong> تشمل كافة ميزات الخطة الاحترافية، دون أي التزام مسبق أو طلب بيانات بنكية.
              </p>
              <p className="text-sm leading-relaxed text-ink-muted">
                يتعهد المسؤول بتقديم معلومات صحيحة ودقيقة (اسم التعاونية، رقم التعريف الموحد ICE، العنوان والأنشطة)، والحفاظ على سرية بيانات تسجيل الدخول الخاصة بأعضاء فريقه.
              </p>
            </section>

            <section className="rounded-2xl border border-line bg-white p-6 sm:p-8 shadow-xs space-y-4">
              <h2 className="flex items-center gap-2 font-display text-xl font-bold text-forest">
                <span>3.</span> صيغ الاشتراك السنوية وشروط الأداء
              </h2>
              <p className="text-sm leading-relaxed text-ink-muted">
                توفر المنصة خطط اشتراك سنوية تتناسب مع حجم التعاونية واحتياجاتها:
              </p>
              <div className="grid gap-3 sm:grid-cols-3 text-sm">
                <div className="rounded-xl border border-line p-4 bg-field">
                  <p className="font-bold text-forest">خطة البداية (Starter)</p>
                  <p className="text-lg font-extrabold text-canopy mt-1">1,990 درهم / سنة</p>
                  <p className="text-xs text-ink-muted mt-1">حتى 3 مستخدمين و 50 منخرطاً.</p>
                </div>
                <div className="rounded-xl border border-canopy/40 p-4 bg-canopy-soft/30">
                  <p className="font-bold text-forest">الاحترافية (Professionnel)</p>
                  <p className="text-lg font-extrabold text-canopy mt-1">3,990 درهم / سنة</p>
                  <p className="text-xs text-ink-muted mt-1">حتى 10 مستخدمين و 300 منخرط + واتساب.</p>
                </div>
                <div className="rounded-xl border border-line p-4 bg-field">
                  <p className="font-bold text-forest">المؤسسات (Business)</p>
                  <p className="text-lg font-extrabold text-canopy mt-1">5,990 درهم / سنة</p>
                  <p className="text-xs text-ink-muted mt-1">حتى 50 مستخدماً وأعضاء غير محدودين.</p>
                </div>
              </div>
              <p className="text-sm leading-relaxed text-ink-muted mt-2">
                يتم الأداء عبر تحويل بنكي إلى الحساب البنكي المعتمد (بنك CIH). في حالة عدم تجديد الاشتراك عند انتهاء المدة، لا يتم حذف بيانات التعاونية أبداً، بل يتحول الحساب تلقائياً إلى <strong>وضع القراءة فقط (Lecture Seule)</strong> لحماية سجلات التعاونية.
              </p>
            </section>

            <section className="rounded-2xl border border-line bg-white p-6 sm:p-8 shadow-xs space-y-4">
              <h2 className="flex items-center gap-2 font-display text-xl font-bold text-forest">
                <span>4.</span> الملكية الحصرية لبيانات التعاونية
              </h2>
              <div className="flex items-start gap-3 rounded-xl bg-field border border-line p-4">
                <ShieldCheck className="text-canopy shrink-0 mt-0.5" size={20} />
                <p className="text-sm leading-relaxed text-ink font-medium">
                  تبقى التعاونية <strong>المالك الحصري والوحيد</strong> لكافة بياناتها (سجل المنخرطين، الحصص الاجتماعية، المعاملات المالية، الفواتير، وبيانات الزبائن). لا تقوم CoopFlow تحت أي ظرف ببيع أو تأجير أو استغلال بيانات التعاونية لأغراض تجارية خارج تقديم الخدمة المتفق عليها.
                </p>
              </div>
            </section>

            <section className="rounded-2xl border border-line bg-white p-6 sm:p-8 shadow-xs space-y-4">
              <h2 className="flex items-center gap-2 font-display text-xl font-bold text-forest">
                <span>5.</span> الأمان والجاهزية التقنية
              </h2>
              <p className="text-sm leading-relaxed text-ink-muted">
                تلتزم منصة CoopFlow باتخاذ أقصى التدابير الأمنية التقنية المعيارية لحماية بيئة التشغيل، بما يشمل التشفير المشدد للاتصالات (SSL/TLS)، العزل التام لقواعد البيانات بين التعاونيات (Multi-tenant isolation)، وإجراء نسخ احتياطية منتظمة.
              </p>
            </section>

            <section className="rounded-2xl border border-line bg-white p-6 sm:p-8 shadow-xs space-y-4">
              <h2 className="flex items-center gap-2 font-display text-xl font-bold text-forest">
                <span>6.</span> القانون المعمول به والنزاعات
              </h2>
              <p className="text-sm leading-relaxed text-ink-muted">
                تخضع هذه الشروط وتفسر وفقاً <strong>للتشريعات والقوانين المعمول بها في المملكة المغربية</strong>. في حال حدوث أي نزاع تعذر حله ودياً، يكون الاختصاص الحصري للمحاكم التجارية المختصة بالمملكة المغربية.
              </p>
            </section>
          </div>
        ) : (
          <div className="mt-8 space-y-8">
            <section className="rounded-2xl border border-line bg-white p-6 sm:p-8 shadow-xs space-y-4">
              <h2 className="flex items-center gap-2 font-display text-xl font-bold text-forest">
                <span>1.</span> Objet & Présentation de la Plateforme
              </h2>
              <p className="text-sm leading-relaxed text-ink-muted">
                La plateforme <strong>CoopFlow</strong> est une solution logicielle en mode SaaS (Software as a Service) spécialement conçue pour les coopératives et unions de coopératives régies par la <strong>Loi marocaine n° 112-12</strong>. Elle permet la digitalisation intégrale des registres d'adhérents, la gestion des parts sociales et cotisations, le suivi de la production et de la transformation locale, la gestion des stocks, la facturation conforme DGI et la traçabilité par QR Code.
              </p>
              <ul className="list-disc list-inside space-y-1.5 text-sm text-ink-muted pl-2">
                <li><strong>Service / Plateforme :</strong> L'application web CoopFlow et ses applications associées (PWA).</li>
                <li><strong>Client / Coopérative :</strong> Toute coopérative légalement constituée au Maroc ou en cours de constitution représentée par ses mandataires légitimes.</li>
                <li><strong>Données :</strong> L'ensemble des informations, fiches et écritures saisies par la coopérative.</li>
              </ul>
            </section>

            <section className="rounded-2xl border border-line bg-white p-6 sm:p-8 shadow-xs space-y-4">
              <h2 className="flex items-center gap-2 font-display text-xl font-bold text-forest">
                <span>2.</span> Inscription, Accès & Période d'Essai
              </h2>
              <p className="text-sm leading-relaxed text-ink-muted">
                L'accès au service est ouvert aux représentants des coopératives marocaines. Toute inscription donne droit à une <strong>période d'essai gratuit de 14 jours</strong> sans engagement et sans carte bancaire requise, incluant l'ensemble des modules du plan Professionnel.
              </p>
              <p className="text-sm leading-relaxed text-ink-muted">
                L'utilisateur s'engage à renseigner des coordonnées réelles (dénomination, ICE, ville, adresse) et à préserver la stricte confidentialité des accès délégués aux collaborateurs de la coopérative.
              </p>
            </section>

            <section className="rounded-2xl border border-line bg-white p-6 sm:p-8 shadow-xs space-y-4">
              <h2 className="flex items-center gap-2 font-display text-xl font-bold text-forest">
                <span>3.</span> Formules d'Abonnement Annuelles & Règlement
              </h2>
              <p className="text-sm leading-relaxed text-ink-muted">
                CoopFlow est commercialisé sous la forme d'abonnements annuels adaptés à la taille et aux besoins de chaque coopérative :
              </p>
              <div className="grid gap-3 sm:grid-cols-3 text-sm">
                <div className="rounded-xl border border-line p-4 bg-field">
                  <p className="font-bold text-forest">Starter</p>
                  <p className="text-lg font-extrabold text-canopy mt-1">1 990 DH / an</p>
                  <p className="text-xs text-ink-muted mt-1">Jusqu'à 3 utilisateurs et 50 adhérents.</p>
                </div>
                <div className="rounded-xl border border-canopy/40 p-4 bg-canopy-soft/30">
                  <p className="font-bold text-forest">Professionnel</p>
                  <p className="text-lg font-extrabold text-canopy mt-1">3 990 DH / an</p>
                  <p className="text-xs text-ink-muted mt-1">Jusqu'à 10 utilisateurs, 300 membres + WhatsApp.</p>
                </div>
                <div className="rounded-xl border border-line p-4 bg-field">
                  <p className="font-bold text-forest">Entreprise</p>
                  <p className="text-lg font-extrabold text-canopy mt-1">5 990 DH / an</p>
                  <p className="text-xs text-ink-muted mt-1">Jusqu'à 50 utilisateurs et membres illimités.</p>
                </div>
              </div>
              <p className="text-sm leading-relaxed text-ink-muted mt-2">
                Le règlement s'effectue par virement bancaire sur notre compte officiel CIH Bank. À l'issue d'une période non renouvelée, aucune donnée n'est détruite : le compte bascule automatiquement en <strong>mode consultation (lecture seule)</strong> afin de garantir la pérennité des archives de la coopérative.
              </p>
            </section>

            <section className="rounded-2xl border border-line bg-white p-6 sm:p-8 shadow-xs space-y-4">
              <h2 className="flex items-center gap-2 font-display text-xl font-bold text-forest">
                <span>4.</span> Propriété Exclusive des Données de la Coopérative
              </h2>
              <div className="flex items-start gap-3 rounded-xl bg-field border border-line p-4">
                <ShieldCheck className="text-canopy shrink-0 mt-0.5" size={20} />
                <p className="text-sm leading-relaxed text-ink font-medium">
                  La coopérative demeure la <strong>propriétaire exclusive</strong> de l'ensemble de ses données (fiches adhérents, CIN, cotisations, registres, écritures de vente et stocks). CoopFlow s'interdit formellement toute exploitation, cession ou commercialisation des données clients.
                </p>
              </div>
            </section>

            <section className="rounded-2xl border border-line bg-white p-6 sm:p-8 shadow-xs space-y-4">
              <h2 className="flex items-center gap-2 font-display text-xl font-bold text-forest">
                <span>5.</span> Disponibilité & Sécurité du Service
              </h2>
              <p className="text-sm leading-relaxed text-ink-muted">
                CoopFlow met en œuvre une infrastructure moderne haute disponibilité avec chiffrement systématique des flux (HTTPS / TLS), isolation logique stricte des bases de données par tenant, et sauvegardes quotidiennes redondées.
              </p>
            </section>

            <section className="rounded-2xl border border-line bg-white p-6 sm:p-8 shadow-xs space-y-4">
              <h2 className="flex items-center gap-2 font-display text-xl font-bold text-forest">
                <span>6.</span> Droit Applicable & Juridiction Compétente
              </h2>
              <p className="text-sm leading-relaxed text-ink-muted">
                Les présentes CGU sont soumises à la <strong>législation marocaine</strong>. En cas de contestation relative à leur validité, interprétation ou exécution qui n'aurait pu être résolue à l'amiable, les tribunaux de commerce du Royaume du Maroc seront seuls compétents.
              </p>
            </section>
          </div>
        )}

        {/* Pied de page navigation légale */}
        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6 text-sm text-ink-muted">
          <Link href="/privacy" className="hover:text-canopy underline font-medium">
            {isAr ? "← سياسة الخصوصية وحماية المعطيات (CNDP)" : "→ Politique de Confidentialité (CNDP)"}
          </Link>
          <Link href="/contact" className="hover:text-canopy underline">
            {isAr ? "الاتصال بالدعم الفني" : "Contacter l'équipe CoopFlow"}
          </Link>
        </div>
      </main>
    </div>
  );
}

