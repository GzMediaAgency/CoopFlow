import type { Metadata } from "next";
import { Link } from "@/i18n/routing";
import { PublicLegalHeader } from "@/components/layout/public-legal-header";
import { Shield, Lock, Eye, CheckCircle2, UserCheck, Database, FileCheck } from "lucide-react";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const isAr = locale === "ar";
  return {
    title: isAr
      ? "سياسة الخصوصية وحماية المعطيات الشخصية (CNDP) — CoopFlow"
      : "Politique de Confidentialité & Conformité CNDP — CoopFlow",
    description: isAr
      ? "سياسة حماية المعطيات ذات الطابع الشخصي لمنصة CoopFlow وفقاً للقانون المغربي رقم 09-08 ولجنة CNDP."
      : "Politique de confidentialité et protection des données personnelles de CoopFlow conforme à la loi marocaine n° 09-08 et aux directives de la CNDP.",
  };
}

export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params;
  const isAr = locale === "ar";

  return (
    <div className="min-h-screen bg-field text-ink" dir={isAr ? "rtl" : "ltr"}>
      <PublicLegalHeader locale={locale} currentPath="/privacy" />

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        {/* En-tête */}
        <div className="rounded-2xl border border-line bg-white p-6 sm:p-10 shadow-xs">
          <div className="flex items-center gap-3 text-forest">
            <span className="grid size-10 place-items-center rounded-xl bg-forest/10 text-forest">
              <Shield size={22} aria-hidden />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gold-deep">
                {isAr ? "المعطيات ذات الطابع الشخصي" : "Conformité CNDP & Données Personnelles"}
              </p>
              <h1 className="font-display text-2xl font-bold sm:text-3xl text-forest">
                {isAr
                  ? "سياسة الخصوصية وحماية المعطيات (قانون 09-08)"
                  : "Politique de Confidentialité (Loi 09-08)"}
              </h1>
            </div>
          </div>

          <div className="mt-5 rounded-xl bg-canopy-soft/40 border border-canopy/30 p-4 text-sm leading-relaxed text-forest">
            <p className="font-semibold flex items-center gap-2">
              <FileCheck size={18} />
              {isAr
                ? "الالتزام بالتشريع المغربي لحماية المعطيات ذات الطابع الشخصي"
                : "Engagement de conformité à la Loi marocaine n° 09-08"}
            </p>
            <p className="mt-1 text-xs sm:text-sm text-ink-muted">
              {isAr
                ? "تولي منصة CoopFlow عناية بالغة لسرية وأمان المعطيات الشخصية للمنخرطين والمستخدمين، وذلك بما يتطابق بالكامل مع مقتضيات الظهير الشريف رقم 1-09-15 الصادر في 22 صفر 1430 (القانون رقم 09-08) المتعلق بحماية الأشخاص الذاتيين تجاه معالجة المعطيات ذات الطابع الشخصي وتوجيهات اللجنة الوطنية لمراقبة حماية المعطيات ذات الطابع الشخصي (CNDP)."
                : "La plateforme CoopFlow accorde une priorité absolue à la confidentialité et à la sécurité des données traitées, en stricte conformité avec les dispositions du Dahir n° 1-09-15 portant promulgation de la Loi n° 09-08 relative à la protection des personnes physiques à l'égard du traitement des données à caractère personnel, ainsi qu'aux recommandations de la CNDP."}
            </p>
          </div>
        </div>

        {/* Contenu */}
        {isAr ? (
          <div className="mt-8 space-y-8">
            <section className="rounded-2xl border border-line bg-white p-6 sm:p-8 shadow-xs space-y-4">
              <h2 className="flex items-center gap-2 font-display text-xl font-bold text-forest">
                <Database size={20} className="text-canopy" />
                <span>1.</span> طبيعة المعطيات التي تتم معالجتها
              </h2>
              <p className="text-sm leading-relaxed text-ink-muted">
                في إطار التدبير الإداري والقانوني والمالي للتعاونية، تتيح المنصة معالجة الفئات التالية من المعطيات:
              </p>
              <ul className="list-disc list-inside space-y-2 text-sm text-ink-muted pr-2">
                <li><strong>معطيات هوية المنخرطين والأعضاء:</strong> الاسم والنسب، رقم البطاقة الوطنية للتعريف (CIN)، رقم الهاتف، العنوان، تاريخ الازدياد، والصفة داخل التعاونية.</li>
                <li><strong>المعطيات الاجتماعية والمالية:</strong> عدد الحصص الاجتماعية المكتتبة، المساهمات، وسجلات أداء الاشتراكات.</li>
                <li><strong>معطيات التتبع والإنتاج:</strong> أسماء الحرفيين والفلاحين المرتبطين بدفعات الإنتاج ومصادر المواد الأولية.</li>
                <li><strong>معطيات المعاملات:</strong> فواتير الزبائن والموردين، سندات الطلب والتسليم وسجلات المخزون.</li>
              </ul>
            </section>

            <section className="rounded-2xl border border-line bg-white p-6 sm:p-8 shadow-xs space-y-4">
              <h2 className="flex items-center gap-2 font-display text-xl font-bold text-forest">
                <Eye size={20} className="text-canopy" />
                <span>2.</span> أهداف وغايات المعالجة
              </h2>
              <p className="text-sm leading-relaxed text-ink-muted">
                تُعالج المعطيات حصرياً للأغراض المشروعة الآتية:
              </p>
              <ul className="list-disc list-inside space-y-1.5 text-sm text-ink-muted pr-2">
                <li>المسك القانوني لسجل أعضاء التعاونية كما يفرضه القانون 112-12 المتعلق بالتعاونيات بالمغرب.</li>
                <li>إصدار الفواتير وسندات المعاملات المطابقة للمعايير المحاسبية والضريبية للمملكة.</li>
                <li>ضمان تتبع جودة وسلامة المنتجات المجالية وتوثيق منشأ المواد.</li>
                <li>إرسال الإشعارات التشغيلية المعتمدة (تأكيد الطلبيات، الفواتير، والتنبيهات عبر البريد أو واتساب).</li>
              </ul>
            </section>

            <section className="rounded-2xl border border-line bg-white p-6 sm:p-8 shadow-xs space-y-4">
              <h2 className="flex items-center gap-2 font-display text-xl font-bold text-forest">
                <Lock size={20} className="text-canopy" />
                <span>3.</span> عدم التفويت والسرية التامة
              </h2>
              <div className="rounded-xl border border-line bg-field p-4 text-sm text-ink leading-relaxed font-medium">
                تتعهد CoopFlow بصريح العبارة بأن كافة المعطيات الشخصية المودعة في المنصة <strong>لن يتم بيعها، أو تأجيرها، أو تبادلها، أو نقلها إلى أي طرف ثالث</strong> لأغراض تجارية أو دعائية. يقتصر الاطلاع على المعطيات على المستخدمين الذين تخولهم التعاونية نفسها صلاحية الولوج.
              </div>
            </section>

            <section className="rounded-2xl border border-line bg-white p-6 sm:p-8 shadow-xs space-y-4">
              <h2 className="flex items-center gap-2 font-display text-xl font-bold text-forest">
                <UserCheck size={20} className="text-canopy" />
                <span>4.</span> حقوق المنخرطين والأشخاص المعنيين (قانون 09-08)
              </h2>
              <p className="text-sm leading-relaxed text-ink-muted">
                تطبيقاً لمقتضيات المواد 7 و 8 و 9 من القانون رقم 09-08، يتمتع كل شخص ذاتي مسجل بالحقوق التالية:
              </p>
              <ul className="list-disc list-inside space-y-1.5 text-sm text-ink-muted pr-2">
                <li><strong>حق الإخبار والولوج:</strong> إمكانية الاطلاع على المعطيات الشخصية المسجلة الخاصة به.</li>
                <li><strong>حق التصحيح والتحيين:</strong> طلب تعديل أو تحيين أي معلومة غير دقيقة أو منتهية الصلاحية.</li>
                <li><strong>حق التعرض:</strong> التعرض لأسباب مشروعة على معالجة المعطيات التي تخصه وفق الشروط القانونية.</li>
              </ul>
              <p className="text-sm leading-relaxed text-ink-muted mt-2">
                لممارسة هذه الحقوق، يمكن للمعني بالأمر التوجه مباشرة لمكتب إدارة التعاونية التابع لها، أو مراسلتنا على البريد الإلكتروني المخصص: <strong>gz.app.media@gmail.com</strong>.
              </p>
            </section>

            <section className="rounded-2xl border border-line bg-white p-6 sm:p-8 shadow-xs space-y-4">
              <h2 className="flex items-center gap-2 font-display text-xl font-bold text-forest">
                <Shield size={20} className="text-canopy" />
                <span>5.</span> تدابير الحماية والتخزين الآمن
              </h2>
              <p className="text-sm leading-relaxed text-ink-muted">
                تطبق CoopFlow منظومة حماية تقنية متقدمة تشمل التشفير وفق بروتوكول HTTPS/TLS، وعزل البيانات بقواعد بيانات مهيأة ومحصنة ضد الاختراق، مع سياسة صارمة لتحديد الأدوار والصلاحيات للحد من أي ولوج غير مصرح به.
              </p>
            </section>
          </div>
        ) : (
          <div className="mt-8 space-y-8">
            <section className="rounded-2xl border border-line bg-white p-6 sm:p-8 shadow-xs space-y-4">
              <h2 className="flex items-center gap-2 font-display text-xl font-bold text-forest">
                <Database size={20} className="text-canopy" />
                <span>1.</span> Catégories de Données Traitées
              </h2>
              <p className="text-sm leading-relaxed text-ink-muted">
                Dans le cadre de l'exploitation de la plateforme CoopFlow, les données suivantes sont collectées et hébergées pour le compte exclusif de la coopérative cliente :
              </p>
              <ul className="list-disc list-inside space-y-2 text-sm text-ink-muted pl-2">
                <li><strong>Identité des adhérents et membres :</strong> Nom, prénom, numéro de Carte d'Identité Nationale (CIN), numéro de téléphone, date de naissance, adresse, fonction au sein de la coopérative.</li>
                <li><strong>Données statutaires et financières :</strong> Parts sociales souscrites, libération du capital, cotisations annuelles, versements et quotes-parts.</li>
                <li><strong>Données de traçabilité et production :</strong> Noms des producteurs/adhérents associés aux lots de transformation agricole ou artisanale.</li>
                <li><strong>Données commerciales et comptables :</strong> Fiches clients, factures conformes DGI, bons de commande, mouvements de stock et règlements.</li>
              </ul>
            </section>

            <section className="rounded-2xl border border-line bg-white p-6 sm:p-8 shadow-xs space-y-4">
              <h2 className="flex items-center gap-2 font-display text-xl font-bold text-forest">
                <Eye size={20} className="text-canopy" />
                <span>2.</span> Finalités du Traitement
              </h2>
              <p className="text-sm leading-relaxed text-ink-muted">
                Le traitement de ces données est strictement limité aux finalités légales et opérationnelles suivantes :
              </p>
              <ul className="list-disc list-inside space-y-1.5 text-sm text-ink-muted pl-2">
                <li>Tenue loyale et dématérialisée du registre légal des membres prescrit par la loi 112-12 relative aux coopératives au Maroc.</li>
                <li>Établissement des factures, états comptables et attestations conformes aux exigences réglementaires.</li>
                <li>Gestion de la traçabilité des produits du terroir et conformité sanitaire des lots de fabrication.</li>
                <li>Envoi des communications transactionnelles nécessaires (confirmations, rappels de paiement et convocations aux assemblées).</li>
              </ul>
            </section>

            <section className="rounded-2xl border border-line bg-white p-6 sm:p-8 shadow-xs space-y-4">
              <h2 className="flex items-center gap-2 font-display text-xl font-bold text-forest">
                <Lock size={20} className="text-canopy" />
                <span>3.</span> Non-cession & Confidentialité Absolue
              </h2>
              <div className="rounded-xl border border-line bg-field p-4 text-sm text-ink leading-relaxed font-medium">
                CoopFlow garantit formellement qu'aucune donnée à caractère personnel <strong>n'est ni ne sera vendue, louée, échangée ou cédée à des tiers</strong> à des fins publicitaires ou commerciales. Seuls les utilisateurs expressément autorisés par la coopérative ont accès à ses données respectives.
              </div>
            </section>

            <section className="rounded-2xl border border-line bg-white p-6 sm:p-8 shadow-xs space-y-4">
              <h2 className="flex items-center gap-2 font-display text-xl font-bold text-forest">
                <UserCheck size={20} className="text-canopy" />
                <span>4.</span> Droits des Personnes Concernées (Loi 09-08)
              </h2>
              <p className="text-sm leading-relaxed text-ink-muted">
                Conformément aux articles 7, 8 et 9 de la Loi n° 09-08, toute personne physique dont les données sont hébergées sur la plateforme dispose des droits suivants :
              </p>
              <ul className="list-disc list-inside space-y-1.5 text-sm text-ink-muted pl-2">
                <li><strong>Droit d'accès :</strong> Droit d'obtenir confirmation que des données la concernant sont traitées et d'en recevoir communication.</li>
                <li><strong>Droit de rectification :</strong> Droit d'exiger la mise à jour, la correction ou la suppression de données inexactes ou incomplètes.</li>
                <li><strong>Droit d'opposition :</strong> Droit de s'opposer, pour des motifs légitimes, au traitement de ses données.</li>
              </ul>
              <p className="text-sm leading-relaxed text-ink-muted mt-2">
                Ces droits peuvent être exercés auprès de la coopérative concernée ou directement par e-mail auprès du délégué technique à la protection des données : <strong>gz.app.media@gmail.com</strong>.
              </p>
            </section>

            <section className="rounded-2xl border border-line bg-white p-6 sm:p-8 shadow-xs space-y-4">
              <h2 className="flex items-center gap-2 font-display text-xl font-bold text-forest">
                <Shield size={20} className="text-canopy" />
                <span>5.</span> Mesures de Sécurité & Hébergement
              </h2>
              <p className="text-sm leading-relaxed text-ink-muted">
                Les infrastructures techniques sont protégées par les standards industriels actuels : chiffrement complet SSL/TLS 256 bits, étanchéité logique des données entre coopératives clientes (Row-Level Security / Tenant isolation), politique stricte d'accès et sauvegardes redondées.
              </p>
            </section>
          </div>
        )}

        {/* Pied de page navigation légale */}
        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6 text-sm text-ink-muted">
          <Link href="/terms" className="hover:text-canopy underline font-medium">
            {isAr ? "← شروط الاستخدام العامة (CGU)" : "→ Conditions Générales d'Utilisation (CGU)"}
          </Link>
          <Link href="/contact" className="hover:text-canopy underline">
            {isAr ? "الاتصال بالدعم الفني" : "Contacter l'équipe CoopFlow"}
          </Link>
        </div>
      </main>
    </div>
  );
}

