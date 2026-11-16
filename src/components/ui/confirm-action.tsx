"use client";
import { useRef } from "react";

/** Bouton + boîte de confirmation claire avant une action importante (suppression, validation…). */
export function ConfirmAction({ action, label, title, message, confirmLabel, cancelLabel, tone = "danger" }: {
  action: () => Promise<void>; label: string; title: string; message: string; confirmLabel: string; cancelLabel: string; tone?: "danger" | "primary";
}) {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button type="button" onClick={() => ref.current?.showModal()} className={tone === "primary" ? "rounded-lg bg-canopy px-4 py-2 text-sm font-semibold text-white" : "rounded-lg border border-danger/40 px-4 py-2 text-sm font-medium text-danger hover:bg-danger/10"}>{label}</button>
      <dialog ref={ref} className="m-auto w-[min(92vw,26rem)] rounded-xl p-6 backdrop:bg-black/40">
        <h2 className="text-lg font-bold">{title}</h2>
        <p className="mt-2 text-sm text-ink-muted">{message}</p>
        <form action={action} className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={() => ref.current?.close()} className="rounded-lg border border-line px-4 py-2 text-sm">{cancelLabel}</button>
          <button className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${tone === "primary" ? "bg-canopy" : "bg-danger"}`}>{confirmLabel}</button>
        </form>
      </dialog>
    </>
  );
}
