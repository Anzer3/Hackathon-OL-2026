import type { Oblast, Uroven } from "@/types/doporuceni";
import { MiniGraf } from "./MiniGraf";

export const SEMAFOR: Record<Uroven, { barva: string; popis: string }> = {
  vyrazny_rust: { barva: "#d32f2f", popis: "Výrazný růst" },
  rust: { barva: "#f57c00", popis: "Růst" },
  pokles: { barva: "#1976d2", popis: "Výrazný pokles" },
  ok: { barva: "#388e3c", popis: "Bez výrazné změny" },
};

/**
 * Jedna oblast doporučení: semafor, značka ⚠, název a věk, mini graf, texty.
 * Barvu nenese jen kolečko → vedle je vždy text úrovně. Texty jsou hotové → nic se neskládá ani nepřepočítává.
 */
export function OblastRadek({ oblast: o }: { oblast: Oblast }) {
  const s = SEMAFOR[o.uroven];
  return (
    <article className="border border-slate-200 bg-white p-5">
      <header className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {o.uroven === "ok" ? (
          <span className="inline-block h-3 w-3 shrink-0 rounded-full" style={{ background: s.barva }} aria-hidden />
        ) : (
          <svg width="14" height="14" viewBox="0 0 14 14" className="shrink-0" aria-hidden>
            <path d={o.uroven === "pokles" ? "M1 3h12L7 12z" : "M7 2l6 9H1z"} fill={s.barva} />
          </svg>
        )}
        <h3 className="text-sm font-semibold text-slate-900">{o.nazev}</h3>
        <span className="text-xs text-slate-500">({o.vek} let)</span>
        <span className="text-xs font-medium text-slate-700">{s.popis}</span>
        {o.spatna_dostupnost && (
          <span className="rounded-sm bg-brand-200 px-1.5 py-0.5 text-[11px] font-semibold text-slate-900">
            ⚠ špatná dostupnost
          </span>
        )}
      </header>
      <div className="mt-3">
        <MiniGraf oblast={o} barva={s.barva} w={240} h={48} />
      </div>
      <ul className="mt-3 space-y-1.5 text-sm leading-relaxed text-slate-700">
        {o.texty.map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </ul>
    </article>
  );
}
