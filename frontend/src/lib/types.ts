/**
 * Datový kontrakt s modelem (navrh-aplikace.md kap. 2 = predikcni_model_plan_final.md kap. 5).
 * Soubory leží v public/data a vyrábí je model v Pythonu.
 */

import type { Doporuceni } from "@/types/doporuceni";

/** Položka `data/obce.json`. Názvy nejsou unikátní → identifikátor je vždy `kod`. */
export type ObecZaznam = {
  /** Kód obce ČSÚ, např. "505218" */
  kod: string;
  /** Název bez „(okr. …)“ */
  nazev: string;
  okres: string;
};

/** Soubor `data/obce/<kód>.json` (stejný tvar má i předpočítaný `data/kraj.json`). */
export type DataObce = ObecZaznam & {
  historie: {
    /** 2007 … 2025 (u obcí vzniklých později kratší) */
    roky: number[];
    /** Skutečný počet obyvatel v těch letech */
    celkem: number[];
  };
  projekce: {
    /** 2025 … 2055; 2025 = současný stav */
    roky: number[];
    /** Pro každý rok 101 čísel: věk 0 … 99, poslední = 100+ */
    muzi: number[][];
    zeny: number[][];
  };
  /** Doporučení pro sociální péči (nezávisí na roce). Jen u obcí – `kraj.json` ho nemá. */
  doporuceni?: Doporuceni;
};

/** `data/prumerny-vek.json` (scripts/souhrn.mjs): průměrný věk obcí pro každý rok projekce. */
export type PrumernyVekSoubor = {
  roky: number[];
  /** kód obce → průměrný věk v jednotlivých letech `roky` */
  obce: Record<string, number[]>;
};

/** Průměrný věk obyvatel všech obcí ve zvoleném roce – pro obarvení mapy. */
export type PrumernyVek = {
  rok: number;
  /** kód obce → průměrný věk v letech */
  obce: Record<string, number>;
};

/** Počet obyvatel v jedné věkové skupině, např. { skupina: "65–79", pocet: 21000 } (vstup AgeChart). */
export type VekovaSkupina = {
  skupina: string;
  pocet: number;
};
