"use client";

import { useState } from "react";
import { ROK_ZAKLAD, type RadekPyramidy } from "@/lib/adapter";
import { formatNumber } from "@/lib/format";

/** Rozměry ve viewBoxu (SVG se roztáhne na šířku panelu). */
const W = 372;
const STRED = 30; // sloupec s popisky věku
const STRANA = (W - STRED) / 2;
const RADEK = 3;
const NAHORE = 4;
const VYSKA_GRAFU = 101 * RADEK;
const H = NAHORE + VYSKA_GRAFU + 20;
/** Popisky osy u malých obcí (maximum pod 10 osob na ročník) s desetinným místem. */
const osaFmt = new Intl.NumberFormat("cs-CZ", { maximumFractionDigits: 1 });

const LEVA_OSA = STRANA; // x nuly mužů
const PRAVA_OSA = STRANA + STRED; // x nuly žen

const BARVA_MUZI = "var(--color-chart-men)";
const BARVA_ZENY = "var(--color-chart-women)";
const BARVA_ZAKLAD = "#64748b"; // slate-500

/** Nejbližší „hezké“ číslo ≥ x (1, 2, 2,5, 5 × 10^n). */
function hezkeMaximum(x: number): number {
  if (x <= 0) return 1;
  const rad = 10 ** Math.floor(Math.log10(x));
  for (const k of [1, 2, 2.5, 5, 10]) if (k * rad >= x) return k * rad;
  return 10 * rad;
}

const yRadku = (vek: number) => NAHORE + (100 - vek) * RADEK;

/** Věková pyramida: muži vlevo, ženy vpravo; sloupce = zvolený rok, obrys = stav 2025 (4. část výpisu). */
export default function Pyramida({ radky, rok }: { radky: RadekPyramidy[]; rok: number }) {
  const [vek, setVek] = useState<number | null>(null);

  const max = hezkeMaximum(Math.max(...radky.flatMap((r) => [r.muzi, r.zeny, r.muziZaklad, r.zenyZaklad])));
  const sx = (n: number) => (n / max) * STRANA;

  /** Obrys stavu 2025 jako schody po ročnících. */
  const obrys = (hodnota: (r: RadekPyramidy) => number, smer: -1 | 1) => {
    const osa = smer < 0 ? LEVA_OSA : PRAVA_OSA;
    let d = "";
    for (let v = 100; v >= 0; v--) {
      const x = osa + smer * sx(hodnota(radky[v]));
      const y = yRadku(v);
      d += `${v === 100 ? "M" : "L"}${x.toFixed(2)},${y}L${x.toFixed(2)},${y + RADEK}`;
    }
    return d;
  };

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const y = ((e.clientY - box.top) / box.height) * H;
    const v = 100 - Math.floor((y - NAHORE) / RADEK);
    setVek(v >= 0 && v <= 100 ? v : null);
  };

  const r = vek === null ? null : radky[vek];
  const popisVeku = (v: number) => (v === 100 ? "100+" : String(v));

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5" style={{ background: BARVA_MUZI }} /> Muži {rok}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5" style={{ background: BARVA_ZENY }} /> Ženy {rok}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0 w-3 border-t-2" style={{ borderColor: BARVA_ZAKLAD }} /> Stav {ROK_ZAKLAD}
        </span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full overflow-visible"
        role="img"
        aria-label={`Věková pyramida ${rok} ve srovnání s rokem ${ROK_ZAKLAD}`}
        onMouseMove={onMove}
        onMouseLeave={() => setVek(null)}
      >
        {vek !== null && <rect x={0} y={yRadku(vek)} width={W} height={RADEK} fill="#e2e8f0" />}

        {radky.map((r) => (
          <g key={r.vek}>
            <rect x={LEVA_OSA - sx(r.muzi)} y={yRadku(r.vek)} width={sx(r.muzi)} height={RADEK} fill={BARVA_MUZI} />
            <rect x={PRAVA_OSA} y={yRadku(r.vek)} width={sx(r.zeny)} height={RADEK} fill={BARVA_ZENY} />
          </g>
        ))}

        <path d={obrys((r) => r.muziZaklad, -1)} fill="none" stroke={BARVA_ZAKLAD} strokeWidth={1.25} />
        <path d={obrys((r) => r.zenyZaklad, 1)} fill="none" stroke={BARVA_ZAKLAD} strokeWidth={1.25} />

        {/* Věk uprostřed */}
        {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((v) => (
          <text
            key={v}
            x={W / 2}
            y={yRadku(v) + RADEK / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={9}
            fill="#64748b"
          >
            {popisVeku(v)}
          </text>
        ))}

        {/* Osa počtu */}
        <line x1={0} x2={LEVA_OSA} y1={NAHORE + VYSKA_GRAFU} y2={NAHORE + VYSKA_GRAFU} stroke="#cbd5e1" />
        <line x1={PRAVA_OSA} x2={W} y1={NAHORE + VYSKA_GRAFU} y2={NAHORE + VYSKA_GRAFU} stroke="#cbd5e1" />
        {[0, 0.5, 1].flatMap((k) =>
          [
            { x: LEVA_OSA - k * STRANA, a: (k === 1 ? "start" : k === 0 ? "end" : "middle") as "start" | "end" | "middle" },
            { x: PRAVA_OSA + k * STRANA, a: (k === 1 ? "end" : k === 0 ? "start" : "middle") as "start" | "end" | "middle" },
          ].map(({ x, a }, i) => (
            <text key={`${k}-${i}`} x={x} y={H - 5} textAnchor={a} fontSize={9} fill="#64748b">
              {max < 10 ? osaFmt.format(k * max) : formatNumber(k * max)}
            </text>
          )),
        )}
      </svg>

      <p className="mt-1 h-4 text-xs tabular-nums text-slate-600">
        {r ? (
          <>
            <span className="font-semibold text-slate-900">Věk {popisVeku(r.vek)}:</span> muži {formatNumber(r.muzi)} (
            {ROK_ZAKLAD}: {formatNumber(r.muziZaklad)}) · ženy {formatNumber(r.zeny)} ({ROK_ZAKLAD}:{" "}
            {formatNumber(r.zenyZaklad)})
          </>
        ) : (
          <span className="text-slate-400">Najeďte myší na pyramidu pro počty v jednotlivém věku.</span>
        )}
      </p>
    </div>
  );
}
