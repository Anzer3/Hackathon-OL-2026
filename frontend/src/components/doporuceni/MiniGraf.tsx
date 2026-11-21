import type { Oblast } from "@/types/doporuceni";

/**
 * Malý graf vývoje cílové skupiny: stav 2025 + řada let oblasti (bez knihovny).
 * Čárkovaná čára = stav 2025. Osa Y je od minima řady (jen tvar vývoje), čísla jsou v textech.
 */
export function MiniGraf({ oblast: o, barva, w = 160, h = 40 }: { oblast: Oblast; barva: string; w?: number; h?: number }) {
  const roky = [o.stav_2025.rok, ...o.rada.roky];
  const hod = [o.stav_2025.hodnota, ...o.rada.hodnoty];
  const lo = Math.min(...hod);
  const hi = Math.max(...hod);
  const x = (i: number) => (i / (roky.length - 1)) * (w - 4) + 2;
  const y = (v: number) => (hi === lo ? h / 2 : h - 2 - ((v - lo) / (hi - lo)) * (h - 4));
  const d = hod.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return (
    <svg width={w} height={h} role="img" aria-label={`${o.nazev}: ${roky[0]}–${roky[roky.length - 1]}`} className="block">
      <line x1={2} x2={w - 2} y1={y(hod[0])} y2={y(hod[0])} stroke="#bbb" strokeDasharray="3 3" />
      <path d={d} fill="none" stroke={barva} strokeWidth={2} />
      <title>{roky.map((r, i) => `${r}: ${Math.round(hod[i])}`).join("\n")}</title>
    </svg>
  );
}
