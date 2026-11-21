/**
 * Pole `doporuceni` v souboru `data/obce/<kód>.json` (implementace-doporuceni-nextjs.md kap. 2).
 * Hotová data od datového týmu – aplikace nic nepřepočítává, texty zobrazuje beze změny.
 */

export type Klic = "ms" | "zs" | "pldd" | "pl" | "sen";
export type Uroven = "vyrazny_rust" | "rust" | "pokles" | "ok";

export interface RokHodnota {
  rok: number;
  hodnota: number;
}

export interface Oblast {
  klic: Klic;
  /** "Mateřská škola" */
  nazev: string;
  /** "3–5" */
  vek: string;
  /** [2026, 2031] */
  obdobi: [number, number];
  /** Má obec MŠ/ZŠ (null u lékařů a seniorů) */
  v_obci: boolean | null;
  zarizeni_v_obci: { nazev: string; kapacita: number | null }[] | null;
  nejblizsi_obec: string | null;
  dostupnost: { auto_min: number | null; vhd_min: number | null; pesi_m: number | null } | null;
  spatna_dostupnost: boolean | null;
  rada: { roky: number[]; hodnoty: number[] };
  stav_2025: RokHodnota;
  max: RokHodnota;
  min: RokHodnota;
  konec: RokHodnota;
  zmena_pct_max: number | null;
  zmena_pct_min: number | null;
  zmena_pct_konec: number | null;
  nejistota_pct: number;
  uroven: Uroven;
  /** Jen `pl` */
  podil_65_plus?: { "2025": number | null; konec: number | null };
  /** Jen `sen` */
  poradi_kraj_pct?: number | null;
  /** Hotové věty – zobrazit beze změny */
  texty: string[];
  zdroje: string[];
}

export interface Doporuceni {
  velke_mesto: boolean;
  varovani: string | null;
  /** Vždy 5, pořadí ms, zs, pldd, pl, sen */
  oblasti: Oblast[];
}
