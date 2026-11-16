"use client";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function SalesChart({ data, currency }: { data: { label: string; total: number }[]; currency: string }) {
  return (
    <div dir="ltr" className="h-64 w-full" role="img" aria-label="Évolution des ventes">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <defs><linearGradient id="sales" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1b5a4b" stopOpacity={0.35} /><stop offset="100%" stopColor="#1b5a4b" stopOpacity={0} />
          </linearGradient></defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#ece5d2" vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#66706b", fontSize: 12 }} />
          <YAxis tickLine={false} axisLine={false} tick={{ fill: "#66706b", fontSize: 12 }} tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : String(v))} />
          <Tooltip formatter={(v: number) => [`${v.toLocaleString("fr-MA")} ${currency}`, ""]} contentStyle={{ borderRadius: 12, border: "1px solid #ece5d2" }} />
          <Area type="monotone" dataKey="total" stroke="#1b5a4b" strokeWidth={2.5} fill="url(#sales)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
