"use client";

import { ROK_ZAKLAD, type SkupinaVypisu, type Zmena } from "@/lib/adapter";
import { formatNumber, formatZmenaOsob, formatZmenaPct, zaokrouhliNaSoucet } from "@/lib/format";

/**
 * Tabulka změny po skupinách + řádek Celkem (3. část výpisu).
 * Osoby se zaokrouhlují tak, aby součet skupin = Celkem a změna = rozdíl zobrazených čísel;
 * procenta se počítají z desetinných čísel.
 */
export default function ZmenaTable({ skupiny, celkem, rok }: { skupiny: SkupinaVypisu[]; celkem: Zmena; rok: number }) {
  const zaklad = zaokrouhliNaSoucet(
    skupiny.map((g) => g.zaklad),
    Math.round(celkem.zaklad),
  );
  const vybrany = zaokrouhliNaSoucet(
    skupiny.map((g) => g.rok),
    Math.round(celkem.rok),
  );

  const bunky = (z0: number, z1: number, procenta: number | null) => (
    <>
      <td className="py-1.5 pl-2 text-right tabular-nums">{formatNumber(z0)}</td>
      <td className="py-1.5 pl-2 text-right tabular-nums">{formatNumber(z1)}</td>
      <td className="py-1.5 pl-2 text-right tabular-nums">{formatZmenaOsob(z1 - z0)}</td>
      <td className="py-1.5 pl-2 text-right tabular-nums">{formatZmenaPct(procenta)}</td>
    </>
  );

  return (
    <table className="w-full text-xs text-slate-700">
      <thead>
        <tr className="border-b border-slate-300 text-[11px] uppercase tracking-wide text-slate-500">
          <th className="py-1.5 text-left font-medium">Skupina</th>
          <th className="py-1.5 pl-2 text-right font-medium">{ROK_ZAKLAD}</th>
          <th className="py-1.5 pl-2 text-right font-medium">{rok}</th>
          <th className="py-1.5 pl-2 text-right font-medium">Změna</th>
          <th className="py-1.5 pl-2 text-right font-medium">%</th>
        </tr>
      </thead>
      <tbody>
        {skupiny.map((g, i) => (
          <tr key={g.id} className="border-b border-slate-100">
            <td className="py-1.5">
              <span className="font-medium text-slate-900">{g.nazev}</span>{" "}
              <span className="whitespace-nowrap tabular-nums text-slate-500">{g.popisek}</span>
            </td>
            {bunky(zaklad[i], vybrany[i], g.procenta)}
          </tr>
        ))}
        <tr className="border-t-2 border-slate-900 font-semibold text-slate-900">
          <td className="py-1.5">Celkem</td>
          {bunky(Math.round(celkem.zaklad), Math.round(celkem.rok), celkem.procenta)}
        </tr>
      </tbody>
    </table>
  );
}
