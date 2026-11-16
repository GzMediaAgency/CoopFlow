"use client";

import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { sendContact } from "./actions";

type Status = "idle" | "sending" | "success" | "error";

export default function ContactForm() {
  const t = useTranslations("contact");
  const [status, setStatus] = useState<Status>("idle");
  const [copied, setCopied] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const handleCopyRib = async () => {
    try {
      await navigator.clipboard.writeText("230780000123456789012345");
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // ignore
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("sending");
    const form = new FormData(e.currentTarget);
    try {
      await sendContact(form);
      setStatus("success");
      formRef.current?.reset();
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  };

  return (
    <>
      {/* Copy RIB button */}
      <button
        type="button"
        onClick={handleCopyRib}
        className="mt-3 inline-flex items-center gap-2 rounded-lg border border-line bg-white px-4 py-2 text-sm font-medium text-ink-muted shadow-sm transition hover:bg-gray-50"
      >
        <span>{copied ? t("copied") : t("copyRib")}</span>
      </button>

      {/* Contact form */}
      <section className="mt-10 rounded-xl border border-line bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-ink">{t("formTitle")}</h2>
        <p className="mt-1 text-sm text-ink-muted">{t("formSubtitle")}</p>

        {status === "success" ? (
          <div className="mt-6 rounded-xl bg-green-50 border border-green-200 p-5 text-center">
            <p className="font-semibold text-green-700">{t("successTitle")}</p>
            <p className="mt-1 text-sm text-green-600">{t("successDesc")}</p>
            <a
              href={`mailto:gz.app.media@gmail.com`}
              className="mt-3 inline-block text-sm text-canopy underline"
            >
              {t("orEmailClient")}
            </a>
          </div>
        ) : (
          <form
            ref={formRef}
            onSubmit={handleSubmit}
            className="mt-5 grid gap-4"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-ink">
                  {t("fields.fullName")}
                </label>
                <input
                  name="fullName"
                  required
                  className="w-full rounded-lg border border-line px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-canopy"
                  placeholder={t("fields.fullName")}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-ink">
                  {t("fields.orgName")}
                </label>
                <input
                  name="orgName"
                  required
                  className="w-full rounded-lg border border-line px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-canopy"
                  placeholder={t("fields.orgName")}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-ink">
                  {t("fields.email")}
                </label>
                <input
                  name="email"
                  type="email"
                  required
                  className="w-full rounded-lg border border-line px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-canopy"
                  placeholder={t("fields.email")}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-ink">
                  {t("fields.phone")}
                </label>
                <input
                  name="phone"
                  type="tel"
                  className="w-full rounded-lg border border-line px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-canopy"
                  placeholder={t("fields.phone")}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-ink">
                {t("fields.plan")}
              </label>
              <select
                name="plan"
                required
                className="w-full rounded-lg border border-line px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-canopy"
              >
                {(
                  [
                    "STARTER",
                    "PROFESSIONAL",
                    "BUSINESS",
                    "RENEWAL",
                    "SUPPORT",
                    "OTHER",
                  ] as const
                ).map((key) => (
                  <option key={key} value={key}>
                    {t(`plans.${key}`)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-ink">
                {t("fields.message")}
              </label>
              <textarea
                name="message"
                rows={5}
                className="w-full rounded-lg border border-line px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-canopy"
                placeholder={t("fields.message")}
              />
            </div>

            {status === "error" && (
              <p className="rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-600">
                {t("error")}
              </p>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="submit"
                disabled={status === "sending"}
                className="rounded-lg bg-canopy px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-canopy/90 disabled:opacity-60"
              >
                {status === "sending" ? t("submitting") : t("submit")}
              </button>
              <a
                href="mailto:gz.app.media@gmail.com?subject=CoopFlow%20Contact"
                className="text-sm text-ink-muted underline"
              >
                {t("orEmailClient")}
              </a>
            </div>
          </form>
        )}
      </section>
    </>
  );
}
