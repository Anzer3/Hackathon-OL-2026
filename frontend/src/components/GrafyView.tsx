"use client";

import { ROK_ZAKLAD, type Vypis } from "@/lib/adapter";
import { formatNumber, formatZmenaPct } from "@/lib/format";
import Pyramida from "./Pyramida";
import VyvojChart from "./VyvojChart";
import ZmenaChart from "./ZmenaChart";
import ZmenaTable from "./ZmenaTable";

function Karta({ nadpis, popis, children }: { nadpis: string; popis?: string; children: React.ReactNode }) {
  return (
    <section className="border border-slate-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-slate-900">{nadpis}</h3>
      {popis && <p className="mt-0.5 text-xs text-slate-500">{popis}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** Záložka „Další přehledy“: ostatní grafy vybraného území v širším rozložení vedle panelu. */
export default function GrafyView({ nazev, rok, vypis }: { nazev: string; rok: number; vypis: Vypis | null }) {
  if (!vypis) {
    return <p className="p-8 text-sm text-slate-500">Načítám data…</p>;
  }
  const v = vypis;

  return (
    <div className="h-full overflow-y-auto bg-slate-50 p-4">
      <h2 className="mb-3 text-lg font-semibold tracking-tight text-slate-900">
        {nazev} · {rok}
      </h2>
      <div className="grid gap-4 xl:grid-cols-2">
        <Karta nadpis="Celkový počet obyvatel">
          <dl className="mb-4 grid grid-cols-3 border border-slate-200">
            {[
              [String(ROK_ZAKLAD), formatNumber(v.celkem.zaklad)],
              [String(rok), formatNumber(v.celkem.rok)],
              ["Změna", formatZmenaPct(v.celkem.procenta)],
            ].map(([k, hodnota], i) => (
              <div key={k} className={`px-3 py-2 ${i ? "border-l border-slate-200" : ""}`}>
                <dt className="text-[11px] uppercase tracking-wide text-slate-500">{k}</dt>
                <dd className="mt-0.5 text-base font-semibold tabular-nums text-slate-900">{hodnota}</dd>
              </div>
            ))}
          </dl>
          <VyvojChart body={v.vyvoj} rok={rok} />
        </Karta>

        <Karta nadpis={`Změna ${ROK_ZAKLAD} → ${rok}`} popis="Změna počtu obyvatel ve věkové skupině v procentech.">
          <ZmenaChart skupiny={v.skupiny} rok={rok} />
        </Karta>

        <Karta nadpis="Věková pyramida" popis={`Počet obyvatel v jednotlivém věku, ${rok} proti ${ROK_ZAKLAD}.`}>
          <Pyramida radky={v.pyramida} rok={rok} />
        </Karta>

        <Karta nadpis="Věkové skupiny v číslech">
          <ZmenaTable skupiny={v.skupiny} celkem={v.celkem} rok={rok} />
        </Karta>
      </div>
    </div>
  );
}
