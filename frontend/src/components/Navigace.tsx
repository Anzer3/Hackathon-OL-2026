"use client";

export type Zalozka = "mapa" | "grafy" | "doporuceni";

const ZALOZKY: { id: Zalozka; nazev: string }[] = [
  { id: "mapa", nazev: "Mapa" },
  { id: "grafy", nazev: "Grafy" },
  { id: "doporuceni", nazev: "Doporučení" },
];

/** Navigace pod horní lištou; vybraná záložka má nad sebou žlutý obdélníček. */
export default function Navigace({ aktivni, onZmena }: { aktivni: Zalozka; onZmena: (z: Zalozka) => void }) {
  return (
    <nav role="tablist" aria-label="Zobrazení" className="flex gap-1 border-b border-slate-300 bg-white px-3">
      {ZALOZKY.map((z) => {
        const vybrana = aktivni === z.id;
        return (
          <button
            key={z.id}
            type="button"
            role="tab"
            aria-selected={vybrana}
            onClick={() => onZmena(z.id)}
            className="relative px-4 py-2 text-sm font-semibold transition hover:bg-slate-50"
          >
            <span
              aria-hidden
              className={`absolute inset-x-3 top-0 h-1 ${vybrana ? "bg-brand-500" : "bg-transparent"}`}
            />
            <span className={vybrana ? "text-slate-900" : "text-slate-500"}>{z.nazev}</span>
          </button>
        );
      })}
    </nav>
  );
}
