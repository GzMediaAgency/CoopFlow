import { getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/auth/session";
import { SettingsTabs } from "../settings-tabs";
import ContactForm from "@/app/[locale]/(app)/contact/contact-form";

export default async function SettingsContactPage() {
  const t = await getTranslations("settings");
  const tc = await getTranslations("contact");
  await requirePermission("settings:read");

  return (
    <>
      <h1 className="mb-4 text-2xl font-bold">{t("title")}</h1>
      <SettingsTabs current="contact" />

      <div className="mt-6 max-w-3xl space-y-6">
        {/* Support direct */}
        <section className="rounded-xl border border-line bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-ink">{tc("directSupport")}</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href="tel:+212671752151"
              className="inline-flex items-center gap-2 rounded-lg bg-canopy px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-canopy/90"
            >
              📞 {tc("callNow")}
            </a>
            <a
              href="https://wa.me/212671752151"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-green-500 px-5 py-2.5 text-sm font-semibold text-green-700 transition hover:bg-green-50"
            >
              💬 {tc("whatsappChat")}
            </a>
          </div>
          <div className="mt-4 space-y-1 text-sm text-ink-muted">
            <p>{tc("whatsappSubtext")}</p>
            <p>
              {tc("directEmail")} —{" "}
              <a href="mailto:gz.app.media@gmail.com" className="font-medium text-canopy underline">
                {tc("emailSubtext")}
              </a>
            </p>
            <p>{tc("hours")}</p>
          </div>
        </section>

        {/* Coordonnées bancaires CIH */}
        <section className="rounded-xl border border-line bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-ink">{tc("cihTitle")}</h2>
          <p className="mt-1 text-sm text-ink-muted">{tc("cihSubtitle")}</p>
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
                    <td className="whitespace-nowrap py-2 pr-4 font-medium text-ink-muted">
                      {tc(labelKey)}
                    </td>
                    <td className="py-2 font-mono font-semibold text-ink">{tc(valueKey)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Instructions */}
          <div className="mt-5">
            <h3 className="font-semibold text-ink">{tc("instructionsTitle")}</h3>
            <ol className="mt-2 list-none space-y-1 text-sm text-ink-muted">
              {(["step1", "step2", "step3", "step4"] as const).map((s) => (
                <li key={s}>{tc(s)}</li>
              ))}
            </ol>
          </div>
        </section>

        {/* Formulaire de contact — client component (copy RIB + form) */}
        <ContactForm />
      </div>
    </>
  );
}

