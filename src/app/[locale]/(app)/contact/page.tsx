import { getTranslations } from "next-intl/server";
import ContactForm from "./contact-form";

export default async function ContactPage() {
  const t = await getTranslations("contact");

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Header */}
      <h1 className="text-2xl font-bold text-ink">{t("title")}</h1>
      <p className="mt-2 text-ink-muted">{t("subtitle")}</p>

      {/* Section 1 — Support direct */}
      <section className="mt-8 rounded-xl border border-line bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-ink">{t("directSupport")}</h2>

        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href="tel:+212671752151"
            className="inline-flex items-center gap-2 rounded-lg bg-canopy px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-canopy/90"
          >
            📞 {t("callNow")}
          </a>
          <a
            href="https://wa.me/212671752151"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-green-500 px-5 py-2.5 text-sm font-semibold text-green-700 transition hover:bg-green-50"
          >
            💬 {t("whatsappChat")}
          </a>
        </div>

        <div className="mt-4 space-y-1 text-sm text-ink-muted">
          <p>{t("whatsappSubtext")}</p>
          <p>
            {t("directEmail")} —{" "}
            <a
              href="mailto:gz.app.media@gmail.com"
              className="font-medium text-canopy underline"
            >
              {t("emailSubtext")}
            </a>
          </p>
          <p>{t("hours")}</p>
        </div>
      </section>

      {/* Section 2 — Coordonnées bancaires CIH */}
      <section className="mt-6 rounded-xl border border-line bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-ink">{t("cihTitle")}</h2>
        <p className="mt-1 text-sm text-ink-muted">{t("cihSubtitle")}</p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-line">
              {(
                [
                  ["bank", "bankValue"],
                  ["beneficiary", "beneficiaryValue"],
                  ["rib", "ribValue"],
                  ["iban", "ibanValue"],
                  ["swift", "swiftValue"],
                ] as const
              ).map(([labelKey, valueKey]) => (
                <tr key={labelKey}>
                  <td className="py-2 pr-4 font-medium text-ink-muted whitespace-nowrap">
                    {t(labelKey)}
                  </td>
                  <td className="py-2 font-mono font-semibold text-ink">
                    {t(valueKey)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Instructions */}
        <div className="mt-6">
          <h3 className="font-semibold text-ink">{t("instructionsTitle")}</h3>
          <ol className="mt-2 space-y-1 text-sm text-ink-muted list-none">
            {(["step1", "step2", "step3", "step4"] as const).map((step) => (
              <li key={step}>{t(step)}</li>
            ))}
          </ol>
        </div>
      </section>

      {/* Section 3 — Formulaire */}
      <ContactForm />
    </div>
  );
}
