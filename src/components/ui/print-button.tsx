"use client";
export function PrintButton({ label }: { label: string }) {
  return <button type="button" onClick={() => window.print()} className="rounded-lg border border-line bg-white px-4 py-2 text-sm print:hidden">{label}</button>;
}
