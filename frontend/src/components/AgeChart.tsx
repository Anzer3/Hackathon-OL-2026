"use client";

import { formatNumber } from "@/lib/format";
import type { VekovaSkupina } from "@/lib/types";

export type Zobrazeni = "procenta" | "pocet";

const pctFmt = new Intl.NumberFormat("cs-CZ", { maximumFractionDigits: 1, minimumFractionDigits: 1 });

/** Výška plochy se sloupci (px) */
const VYSKA = 180;

/** Svislý sloupcový graf: sloupec = věková skupina, výška = počet obyvatel. */
export default function AgeChart({
  skupiny,
  zobrazeni,
}: {
  skupiny: VekovaSkupina[];
  zobrazeni: Zobrazeni;
}) {
  const celkem = skupiny.reduce((s, g) => s + g.pocet, 0);
  const max = Math.max(...skupiny.map((g) => g.pocet), 1);

  return (
    <ul className="flex items-stretch gap-1.5 border-b border-slate-300">
      {skupiny.map((g) => {
        const vyska = (g.pocet / max) * 100;
        const popisek =
          zobrazeni === "procenta" ? `${pctFmt.format((g.pocet / celkem) * 100)} %` : formatNumber(g.pocet);
        return (
          <li
            key={g.skupina}
            className="flex min-w-0 flex-1 flex-col items-center"
            title={`${g.skupina} let: ${formatNumber(g.pocet)} obyvatel`}
          >
            {/* plocha sloupce – sloupec roste odspodu, popisek sedí nad ním */}
            <div className="flex w-full flex-col justify-end" style={{ height: VYSKA }}>
              <span className="mb-1 text-center text-[11px] font-semibold tabular-nums text-slate-700">{popisek}</span>
              <div
                className="w-full bg-brand-500 transition-[height] duration-500 ease-out"
                style={{ height: `calc(${vyska}% - 18px)`, minHeight: 2 }}
              />
            </div>
            <span className="mt-1.5 pb-1 text-center text-[11px] font-medium tabular-nums text-slate-600">
              {g.skupina}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
