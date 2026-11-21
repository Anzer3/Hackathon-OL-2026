/**
 * Obce v Olomouckém kraji.
 * - seznam obcí pro výběr: public/data/obce.json (výstup modelu, src/lib/data.ts)
 * - public/obce-olomoucky-kraj.geojson – hranice 402 obcí (ČÚZK INSPIRE, CC BY 4.0, zjednodušeno);
 *   z hranic se bere jen rozsah obce pro přiblížení mapy. Libavá je na mapě, ale model ji vynechává (bez obyvatel).
 */
/** Rozsah území [západ, jih, východ, sever] ve stupních */
export type Bbox = [number, number, number, number];

/** Kraj – zatím jediný; kód NUTS 3 (Olomoucký kraj = CZ071). */
export const KRAJ = { kod: "CZ071", nazev: "Olomoucký kraj" } as const;

/** Vybrané území: obec. */
export type Uzemi = { obecKod: string };

export const OBCE_GEOJSON_URL = "/obce-olomoucky-kraj.geojson";
/** Vnější hranice kraje – spočítaná z hranic obcí */
export const KRAJ_GEOJSON_URL = "/kraj-olomoucky.geojson";
/** Výplně mezer mezi obcemi (scripts/hranice) – každá patří sousední obci podle `kod` */
export const VYPLNE_GEOJSON_URL = "/vyplne-olomoucky-kraj.geojson";

export const KRAJ_CENTER = { lat: 49.72, lon: 17.2, zoom: 7.9 };

/** Rozsah let, které lze zvolit (2025 = současný stav, se kterým se porovnává). */
export const ROK_OD = 2026;
export const ROK_DO = 2055;

/**
 * Prezentace: obec vybraná po spuštění (`null` = celý kraj) a obce na rychlé přepnutí v panelu.
 * Kódy podle data/obce.json.
 */
export const PREZENTACE: { vychoziObec: string | null; rychleVolby: string[] } = {
  // Velký Týnec: satelit Olomouce, od 2007 +41 % obyvatel, přesto do 2040 výrazně ubude předškoláků
  vychoziObec: null,
  rychleVolby: ["505650", "552372"], // Velký Týnec, Medlov
};

type Geometrie = { type: string; coordinates: unknown };

/** Rozsah geometrie (projde všechny souřadnice polygonu / multipolygonu). */
function rozsah(g: Geometrie): Bbox {
  const b: Bbox = [Infinity, Infinity, -Infinity, -Infinity];
  const projdi = (c: unknown) => {
    if (typeof (c as number[])[0] === "number") {
      const [x, y] = c as number[];
      if (x < b[0]) b[0] = x;
      if (y < b[1]) b[1] = y;
      if (x > b[2]) b[2] = x;
      if (y > b[3]) b[3] = y;
    } else (c as unknown[]).forEach(projdi);
  };
  projdi(g.coordinates);
  return b;
}

/** Rozsahy obcí z hranic (kód obce → bbox) – pro přiblížení mapy na vybranou obec. */
export async function nactiRozsahyObci(signal?: AbortSignal): Promise<Map<string, Bbox>> {
  const res = await fetch(OBCE_GEOJSON_URL, { signal });
  const gj = (await res.json()) as { features: { properties: { kod: string }; geometry: Geometrie }[] };
  return new Map(gj.features.map((f) => [String(f.properties.kod), rozsah(f.geometry)]));
}
