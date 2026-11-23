"use client";

import { useState } from "react";
import type { Vypis } from "@/lib/adapter";
import { KRAJ } from "@/lib/obce";
import type { ObecZaznam } from "@/lib/types";
import { formatNumber } from "@/lib/format";
import AgeChart, { type Zobrazeni } from "./AgeChart";
import RokVyber from "./RokVyber";
import SpotLogo from "./SpotLogo";

export type LoadStatus =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "done" };

const vekFmt = new Intl.NumberFormat("cs-CZ", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export default function SidePanel({
  bezVyberu,
  obec,
  onZpetNaKraj,
  rok,
  rokOd,
  rokDo,
  onRokChange,
  status,
  vypis,
  rychleVolby,
  onRychlaVolba,
}: {
  /** Žádná obec není vybraná → zobrazí se data za celý kraj */
  bezVyberu: boolean;
  obec: ObecZaznam | undefined;
  /** Zrušit výběr obce a zobrazit celý kraj */
  onZpetNaKraj: () => void;
  rok: number;
  rokOd: number;
  rokDo: number;
  onRokChange: (rok: number) => void;
  status: LoadStatus;
  /** Výstup adaptéru pro vybrané území a rok */
  vypis: Vypis | null;
  /** Obce na rychlé přepnutí (prezentace) */
  rychleVolby: ObecZaznam[];
  onRychlaVolba: (kod: string) => void;
}) {
  const [zobrazeni, setZobrazeni] = useState<Zobrazeni>("procenta");
  const v = status.kind === "done" ? vypis : null;

  return (
    <div className="flex h-full flex-col">
      {/* Hlavička */}
      <header className="flex items-center gap-3 px-3 pb-1 pt-3">
        <h1 className="sr-only">SPOT</h1>
        <SpotLogo />
        <div className="min-w-0 flex-1 border-l border-slate-300 pl-3">
          <p className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            Vybraná oblast
          </p>
          <h2 className="truncate text-xl font-semibold leading-tight tracking-tight text-slate-900">
            {bezVyberu ? KRAJ.nazev : (obec?.nazev ?? "…")}
          </h2>
        </div>
        {!bezVyberu && (
          <button
            type="button"
            onClick={onZpetNaKraj}
            aria-label={`Zpět na ${KRAJ.nazev}`}
            title={`Zpět na ${KRAJ.nazev}`}
            className="inline-flex items-center gap-1.5 rounded-sm border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
          >
            <span aria-hidden>←</span> Zpět
          </button>
        )}
      </header>

      {/* Rok výhledu – hned pod vybranou oblastí */}
      <div className="border-b border-slate-200 px-6 pb-4 pt-3">
        <RokVyber rok={rok} rokOd={rokOd} rokDo={rokDo} onRokChange={onRokChange} />
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Vybrané území */}
        <section className="border-b border-slate-200 px-6 py-5">
          {bezVyberu && (
            <p className="mb-4 text-xs text-slate-500">Souhrn za celý kraj · obec vyberete na mapě nebo v hledání.</p>
          )}

          {/* Klíčové údaje */}
          <dl className="grid grid-cols-2 border border-slate-200">
            {[
              ["Počet obyvatel", v ? formatNumber(v.celkem.rok) : "—"],
              ["Průměrný věk", v ? `${vekFmt.format(v.prumernyVek)} let` : "—"],
            ].map(([k, hodnota], i) => (
              <div key={k} className={`px-3 py-2 ${i ? "border-l border-slate-200" : ""}`}>
                <dt className="text-[11px] uppercase tracking-wide text-slate-500">{k}</dt>
                <dd className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900">{hodnota}</dd>
              </div>
            ))}
          </dl>

          {/* Rychlé přepnutí (prezentace) */}
          {rychleVolby.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-slate-500">Rychlá volba:</span>
              {rychleVolby.map((o) => {
                const aktivni = !bezVyberu && obec?.kod === o.kod;
                return (
                  <button
                    key={o.kod}
                    type="button"
                    onClick={() => onRychlaVolba(o.kod)}
                    aria-pressed={aktivni}
                    title={`${o.nazev} (okres ${o.okres})`}
                    className={`rounded-sm border px-2 py-0.5 font-medium transition ${
                      aktivni
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-100"
                    }`}
                  >
                    {o.nazev}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Obyvatelé podle věku */}
        <section className="border-b border-slate-200 px-6 py-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-900">Obyvatelé podle věku</h3>
            <div role="tablist" className="inline-flex border border-slate-300 text-xs font-medium">
              {(
                [
                  ["procenta", "Procenta"],
                  ["pocet", "Počet"],
                ] as const
              ).map(([key, label], i) => (
                <button
                  key={key}
                  role="tab"
                  type="button"
                  aria-selected={zobrazeni === key}
                  onClick={() => setZobrazeni(key)}
                  className={`px-3 py-1 transition ${i ? "border-l border-slate-300" : ""} ${
                    zobrazeni === key ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            {v ? (
              <AgeChart skupiny={v.skupiny.map((g) => ({ skupina: g.popisek, pocet: g.rok }))}
                zobrazeni={zobrazeni} />
            ) : status.kind === "error" ? null : (
              <p className="border border-dashed border-slate-300 px-3 py-8 text-center text-xs text-slate-500">
                Načítám data…
              </p>
            )}
          </div>
          {v && <p className="mt-3 text-xs text-slate-500">Věk v letech · odhad modelu pro rok {rok}.</p>}
        </section>
      </div>

      {status.kind === "error" && (
        <p role="alert" className="mx-6 mb-3 border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {status.message}
        </p>
      )}

      <footer className="border-t border-slate-200 px-6 py-2.5 text-[11px] text-slate-500">
        Hranice území: ČÚZK (CC BY 4.0) · data: ČSÚ, predikční model
      </footer>
    </div>
  );
}
