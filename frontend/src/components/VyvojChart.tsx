"use client";

import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ROK_ZAKLAD, type BodVyvoje } from "@/lib/adapter";
import { formatNumber } from "@/lib/format";

const BARVA_SKUTECNOST = "#111111";
const BARVA_PREDIKCE = "#e0a800"; // brand-600

const kompakt = new Intl.NumberFormat("cs-CZ", { notation: "compact", maximumFractionDigits: 1 });

/** Celkový počet obyvatel: skutečnost do 2025 + predikce 2025–zvolený rok (5. část výpisu). */
export default function VyvojChart({ body, rok }: { body: BodVyvoje[]; rok: number }) {
  const od = body[0]?.rok ?? ROK_ZAKLAD;
  // Popisky osy po 5 nebo 10 letech (kulaté roky)
  const krok = rok - od > 25 ? 10 : 5;
  const popiskyLet: number[] = [];
  for (let r = Math.ceil(od / krok) * krok; r <= rok; r += krok) popiskyLet.push(r);

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0 w-4 border-t-2" style={{ borderColor: BARVA_SKUTECNOST }} /> Skutečnost {od}–{ROK_ZAKLAD}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0 w-4 border-t-2 border-dashed" style={{ borderColor: BARVA_PREDIKCE }} /> Predikce{" "}
          {ROK_ZAKLAD}–{rok}
        </span>
      </div>
      <div className="h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={body} margin={{ top: 6, right: 10, bottom: 0, left: 4 }}>
            <CartesianGrid stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="rok"
              type="number"
              domain={[od, rok]}
              ticks={popiskyLet}
              allowDecimals={false}
              tick={{ fontSize: 11, fill: "#64748b" }}
              tickLine={false}
              axisLine={{ stroke: "#cbd5e1" }}
            />
            <YAxis
              domain={["auto", "auto"]}
              width={60}
              tickMargin={4}
              tick={{ fontSize: 11, fill: "#64748b" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(n: number) => (Math.abs(n) >= 10000 ? kompakt.format(n) : formatNumber(n))}
            />
            <ReferenceLine x={ROK_ZAKLAD} stroke="#94a3b8" strokeDasharray="2 3" />
            <Tooltip
              formatter={(hodnota: number, nazev: string) => [
                formatNumber(hodnota),
                nazev === "skutecnost" ? "Skutečnost" : "Predikce",
              ]}
              labelFormatter={(r: number) => `Rok ${r}`}
              contentStyle={{ fontSize: 12, borderRadius: 2, borderColor: "#cbd5e1" }}
            />
            <Line
              dataKey="skutecnost"
              stroke={BARVA_SKUTECNOST}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
              connectNulls={false}
            />
            <Line
              dataKey="predikce"
              stroke={BARVA_PREDIKCE}
              strokeWidth={2.5}
              strokeDasharray="5 3"
              dot={false}
              isAnimationActive={false}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
