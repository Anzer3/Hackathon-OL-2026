"use client";

import { useEffect, useState } from "react";

/** Volba roku výhledu: pole s rokem, posun o 5 let a návrat do současnosti. */
export default function RokVyber({
  rok,
  rokOd,
  rokDo,
  onRokChange,
}: {
  rok: number;
  rokOd: number;
  rokDo: number;
  onRokChange: (rok: number) => void;
}) {
  // Pole roku: vlastní text, aby šlo psát volně; platná hodnota se potvrdí hned
  const [rokText, setRokText] = useState(String(rok));
  useEffect(() => setRokText(String(rok)), [rok]);
  const potvrdRok = (text: string) => {
    const n = parseInt(text, 10);
    if (Number.isFinite(n)) onRokChange(Math.min(rokDo, Math.max(rokOd, n)));
    else setRokText(String(rok));
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Rok výhledu */}
      <label className="flex shrink-0 items-center gap-2 text-sm text-slate-600">
        <span className="hidden sm:inline">Rok</span>
        <input
          type="number"
          inputMode="numeric"
          min={rokOd}
          max={rokDo}
          step={1}
          value={rokText}
          aria-label={`Rok výhledu (${rokOd}–${rokDo})`}
          title={`Rok výhledu (${rokOd}–${rokDo})`}
          onChange={(e) => {
            setRokText(e.target.value);
            const n = parseInt(e.target.value, 10);
            if (n >= rokOd && n <= rokDo) onRokChange(n);
          }}
          onBlur={(e) => potvrdRok(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && potvrdRok((e.target as HTMLInputElement).value)}
          className="h-9 w-24 rounded-sm border border-slate-300 bg-white px-2 text-sm font-semibold tabular-nums text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </label>

      {/* Posun roku o 5 let */}
      <div className="inline-flex shrink-0 border border-slate-300 text-sm font-medium">
        {([-5, 5] as const).map((d, i) => {
          const cil = Math.min(rokDo, Math.max(rokOd, rok + d));
          return (
            <button
              key={d}
              type="button"
              disabled={cil === rok}
              onClick={() => onRokChange(cil)}
              aria-label={d < 0 ? "O 5 let zpět" : "O 5 let dopředu"}
              title={d < 0 ? "O 5 let zpět" : "O 5 let dopředu"}
              className={`h-[34px] px-2.5 tabular-nums text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-white ${
                i ? "border-l border-slate-300" : ""
              }`}
            >
              {d < 0 ? "−5" : "+5"}
            </button>
          );
        })}
      </div>

      {/* Zpět do současnosti (první rok výhledu) */}
      <button
        type="button"
        disabled={rok === rokOd}
        onClick={() => onRokChange(rokOd)}
        title={`Zpět do současnosti (${rokOd})`}
        className="h-9 shrink-0 rounded-sm border border-slate-300 bg-white px-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-white"
      >
        Současnost
      </button>
    </div>
  );
}
