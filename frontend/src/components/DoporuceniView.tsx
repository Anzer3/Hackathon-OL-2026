"use client";

import type { Doporuceni, Klic, Oblast } from "@/types/doporuceni";
import { OblastRadek } from "./doporuceni/OblastRadek";

const SVG = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const IKONA_VZDELANI = (
  <svg {...SVG}>
    <path d="M22 10 12 5 2 10l10 5 10-5z" />
    <path d="M6 12v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5" />
    <path d="M22 10v6" />
  </svg>
);

const IKONA_ZDRAVI = (
  <svg {...SVG}>
    <rect x="3" y="3" width="18" height="18" rx="3" />
    <path d="M12 8v8M8 12h8" />
  </svg>
);

const SEKCE: { nadpis: string; klice: Klic[]; ikona: React.ReactNode }[] = [
  { nadpis: "Vzdělání", klice: ["ms", "zs"], ikona: IKONA_VZDELANI },
  { nadpis: "Zdravotnictví a péče", klice: ["sen", "pldd", "pl"], ikona: IKONA_ZDRAVI },
];

/**
 * Záložka „Doporučení“: varování velkého města + 5 oblastí vybrané obce.
 * Nezávisí na zvoleném roce → rok se nepředává. Kraj doporučení nemá.
 */
export default function DoporuceniView({
  nazev,
  bezVyberu,
  data,
}: {
  nazev: string;
  /** Žádná obec není vybraná (zobrazen kraj) */
  bezVyberu: boolean;
  /** `undefined` = data obce se ještě načítají */
  data?: Doporuceni;
}) {
  if (bezVyberu) {
    return (
      <p className="p-8 text-sm text-slate-500">Doporučení jsou pro jednotlivé obce · obec vyberete v hledání nebo na mapě.</p>
    );
  }
  if (!data) {
    return <p className="p-8 text-sm text-slate-500">Načítám data…</p>;
  }

  return (
    <div className="h-full overflow-y-auto bg-slate-50 p-4">
      <h2 className="mb-3 text-lg font-semibold tracking-tight text-slate-900">{nazev}</h2>
      {data.varovani && (
        <p className="mb-4 border border-brand-500 bg-brand-50 px-4 py-2.5 text-sm leading-relaxed text-slate-800">
          {data.varovani}
        </p>
      )}
      <div className="grid items-start gap-6 lg:grid-cols-2">
        {SEKCE.map((s) => {
          const oblasti = s.klice
            .map((k) => data.oblasti.find((o) => o.klic === k))
            .filter((o): o is Oblast => !!o);
          if (oblasti.length === 0) return null;
          return (
            <section key={s.nadpis}>
              <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-900">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-200 text-slate-900">
                  {s.ikona}
                </span>
                {s.nadpis}
              </h3>
              <div className="space-y-4">
                {oblasti.map((o) => (
                  <OblastRadek key={o.klic} oblast={o} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
