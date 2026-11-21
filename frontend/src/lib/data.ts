/**
 * Načítání statických JSON souborů modelu z public/data (navrh-aplikace.md kap. 3).
 * - seznam obcí a souhrny se načtou jednou při startu,
 * - soubor obce až při jejím výběru; načtené obce se pamatují a znovu se nestahují.
 */
import type { DataObce, ObecZaznam, PrumernyVekSoubor } from "./types";

const DATA_URL = "/data";

async function nactiJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Soubor ${url} se nepodařilo načíst (${res.status}).`);
  return (await res.json()) as T;
}

/** Jednou načtené soubory (i rozpracované požadavky) – klíč = URL. */
const pamet = new Map<string, Promise<unknown>>();

function nactiJednou<T>(url: string): Promise<T> {
  let p = pamet.get(url) as Promise<T> | undefined;
  if (!p) {
    p = nactiJson<T>(url);
    // Při chybě zapomenout, aby šlo zkusit znovu
    p.catch(() => pamet.delete(url));
    pamet.set(url, p);
  }
  return p;
}

/** `data/obce.json` – seznam obcí pro výběr (seřazený podle názvu). */
export const nactiSeznamObci = () => nactiJednou<ObecZaznam[]>(`${DATA_URL}/obce.json`);

/** `data/obce/<kód>.json` – data jedné obce. */
export const nactiObec = (kod: string) => nactiJednou<DataObce>(`${DATA_URL}/obce/${encodeURIComponent(kod)}.json`);

/** `data/kraj.json` – celý kraj ve formátu obce (předpočítá scripts/souhrn.mjs). */
export const nactiKraj = () => nactiJednou<DataObce>(`${DATA_URL}/kraj.json`);

/** `data/prumerny-vek.json` – průměrný věk všech obcí ve všech letech (předpočítá scripts/souhrn.mjs). */
export const nactiPrumernyVek = () => nactiJednou<PrumernyVekSoubor>(`${DATA_URL}/prumerny-vek.json`);
