"use client";

import type { SkupinaVypisu } from "@/lib/adapter";
import { formatZmenaPct } from "@/lib/format";

/**
 * Změna oproti roku 2025 v % po věkových skupinách (2. část výpisu).
 * Sloupce od nulové osy: doprava růst (zeleně), doleva úbytek (červeně).
 */
export default function ZmenaChart({ skupiny, rok }: { skupiny: SkupinaVypisu[]; rok: number }) {
  const max = Math.max(...skupiny.map((g) => Math.abs(g.procenta ?? 0)), 1);

  return (
    <ul className="space-y-1.5">
      {skupiny.map((g) => {
        const p = g.procenta;
        const sirka = p === null ? 0 : (Math.abs(p) / max) * 50;
        const kladne = (p ?? 0) >= 0;
        const text = formatZmenaPct(p);
        return (
          <li
            key={g.id}
            className="flex items-center gap-3"
            title={`${g.nazev} (${g.popisek} let): ${text} v roce ${rok} oproti 2025`}
          >
            <span className="w-12 shrink-0 text-right text-xs font-medium tabular-nums text-slate-600">{g.popisek}</span>
            <div className="relative h-6 min-w-0 flex-1">
              {/* nulová osa */}
              <div className="absolute inset-y-0 left-1/2 w-px bg-slate-400" />
              <div
                className={`absolute inset-y-0.5 transition-[width] duration-500 ease-out ${
                  kladne ? "left-1/2 bg-green-600" : "right-1/2 bg-red-600"
                }`}
                style={{ width: `${sirka}%` }}
              />
              <span
                className={`absolute top-1/2 -translate-y-1/2 whitespace-nowrap text-xs font-semibold tabular-nums text-slate-700 ${
                  kladne ? "right-1/2 mr-1.5" : "left-1/2 ml-1.5"
                }`}
              >
                {text}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
