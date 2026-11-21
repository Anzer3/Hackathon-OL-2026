"use client";

import { useMemo, useRef, useState } from "react";
import type { Uzemi } from "@/lib/obce";
import type { ObecZaznam as Obec } from "@/lib/types";

/** Porovnání bez diakritiky a velikosti písmen („tesetice“ najde „Těšetice“). */
const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Lišta nad mapou: vyhledání obce. */
export default function TopBar({
  obce,
  onSelect,
}: {
  obce: Obec[];
  onSelect: (uzemi: Uzemi) => void;
}) {
  const [dotaz, setDotaz] = useState("");
  const [otevreno, setOtevreno] = useState(false);
  const [aktivni, setAktivni] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const vysledky = useMemo(() => {
    // Slova dotazu („hranice mor“ → Hranice (na Moravě)); pomlčky se ignorují
    const slova = norm(dotaz).split(/[\s\-–]+/).filter(Boolean);
    if (!slova.length) return [];
    const q = slova[0];
    const skore = (o: Obec) => {
      const text = norm(o.nazev);
      if (!slova.every((s) => text.includes(s))) return -1;
      return text.startsWith(q) ? 0 : 1; // obce začínající dotazem první
    };
    return obce
      .map((o) => ({ o, s: skore(o) }))
      .filter((x) => x.s >= 0)
      .sort((a, b) => a.s - b.s || a.o.nazev.localeCompare(b.o.nazev, "cs"))
      .slice(0, 40)
      .map((x) => x.o);
  }, [dotaz, obce]);

  const vyber = (o: Obec) => {
    onSelect({ obecKod: o.kod });
    setDotaz("");
    setOtevreno(false);
    inputRef.current?.blur();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!vysledky.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setAktivni((i) => (i + 1) % vysledky.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setAktivni((i) => (i - 1 + vysledky.length) % vysledky.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      vyber(vysledky[aktivni]);
    } else if (e.key === "Escape") {
      setOtevreno(false);
    }
  };

  return (
    <div className="relative z-40 flex items-center gap-2 border-b border-slate-300 bg-white px-3 py-2">
      {/* Vyhledávání obce */}
      <div className="relative min-w-0 flex-1">
        <svg
          viewBox="0 0 20 20"
          className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <circle cx="9" cy="9" r="6" />
          <path d="m14 14 4 4" strokeLinecap="square" />
        </svg>
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-expanded={otevreno && vysledky.length > 0}
          aria-controls="obce-vysledky"
          aria-label="Vyhledat obec"
          placeholder="Vyhledat obec…"
          value={dotaz}
          onChange={(e) => {
            setDotaz(e.target.value);
            setAktivni(0);
            setOtevreno(true);
          }}
          onFocus={() => setOtevreno(true)}
          onBlur={() => setTimeout(() => setOtevreno(false), 150)}
          onKeyDown={onKeyDown}
          className="h-9 w-full rounded-sm border border-slate-300 bg-white pl-8 pr-3 text-sm placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        {otevreno && dotaz.trim() && (
          <ul
            id="obce-vysledky"
            role="listbox"
            className="absolute left-0 right-0 top-full z-20 mt-px max-h-96 overflow-auto rounded-sm border border-slate-300 bg-white shadow-md"
          >
            {vysledky.length ? (
              vysledky.map((o, i) => (
                <li
                  key={o.kod}
                  role="option"
                  aria-selected={i === aktivni}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    vyber(o);
                  }}
                  onMouseEnter={() => setAktivni(i)}
                  className={`flex cursor-pointer items-baseline justify-between gap-3 border-l-2 px-3 py-1.5 text-sm ${
                    i === aktivni ? "border-brand-500 bg-slate-100" : "border-transparent"
                  }`}
                >
                  <span className="truncate font-semibold text-slate-900">{o.nazev}</span>
                  <span className="shrink-0 text-xs text-slate-500">okres {o.okres}</span>
                </li>
              ))
            ) : (
              <li className="px-3 py-2 text-sm text-slate-500">Nic nenalezeno.</li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
