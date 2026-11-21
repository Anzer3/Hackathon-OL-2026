/**
 * Adaptér: data obce (datový kontrakt) + zvolený rok → čísla pro komponenty výpisu
 * (navrh-aplikace.md kap. 4). Počítá se vždy pro rok 2025 a zvolený rok.
 *
 * Počítá s desetinnými čísly – zaokrouhluje se až při zobrazení (src/lib/format.ts).
 */
import type { DataObce } from "./types";

/** Současný stav – první rok projekce, se kterým se vše porovnává. */
export const ROK_ZAKLAD = 2025;

/**
 * Věkové skupiny – JEDINÉ místo, kde jsou definované.
 * `od`/`do` = indexy v poli ročníků (věk v letech), 100 = 100+.
 */
export const SKUPINY = [
  { id: "deti", nazev: "Nejmenší děti", od: 0, do: 2 },
  { id: "predskolaci", nazev: "Předškoláci", od: 3, do: 5 },
  { id: "skolaci", nazev: "Školáci", od: 6, do: 14 },
  { id: "mladez", nazev: "Mládež", od: 15, do: 19 },
  { id: "produktivni", nazev: "Produktivní věk", od: 20, do: 64 },
  { id: "mladsi-seniori", nazev: "Mladší senioři", od: 65, do: 79 },
  { id: "starsi-seniori", nazev: "Starší senioři", od: 80, do: 100 },
] as const;

/** Index posledního ročníku (100+). */
const VEK_MAX = 100;

/** Porovnání 2025 se zvoleným rokem. */
export type Zmena = {
  /** Počet v roce 2025 */
  zaklad: number;
  /** Počet ve zvoleném roce */
  rok: number;
  /** Změna v osobách */
  osoby: number;
  /** Změna v % (např. 5.2 = +5,2 %); `null`, když je stav 2025 nula → zobrazí se „–“ */
  procenta: number | null;
};

export type SkupinaVypisu = Zmena & {
  id: string;
  nazev: string;
  /** „0–2“, „80+“ */
  popisek: string;
};

export type RadekPyramidy = {
  vek: number;
  muziZaklad: number;
  zenyZaklad: number;
  muzi: number;
  zeny: number;
};

/** Bod grafu celkového počtu; v roce 2025 má obě hodnoty, aby se řady potkaly. */
export type BodVyvoje = {
  rok: number;
  skutecnost?: number;
  predikce?: number;
};

export type Vypis = {
  rok: number;
  /** 1.–3. část: skupiny ve zvoleném roce + změna oproti 2025 */
  skupiny: SkupinaVypisu[];
  /** 3. a 5. část: řádek Celkem */
  celkem: Zmena;
  /** 4. část: muži a ženy po ročnících 0–100+ */
  pyramida: RadekPyramidy[];
  /** 5. část: skutečnost (historie) + predikce 2025–zvolený rok */
  vyvoj: BodVyvoje[];
  /** Průměrný věk ve zvoleném roce (klíčové údaje) */
  prumernyVek: number;
};

const popisek = (od: number, doVek: number) => (doVek >= VEK_MAX ? `${od}+` : `${od}–${doVek}`);

/**
 * Součet ročníků. Výsledek se očistí od šumu plovoucí čárky (data mají 1 desetinné místo),
 * aby např. 211,5 nebylo 211,4999… a všechny části výpisu zaokrouhlily stejně.
 */
const soucet = (a: number[], od = 0, doVek = a.length - 1) => {
  let s = 0;
  for (let v = od; v <= doVek; v++) s += a[v];
  return Math.round(s * 1e6) / 1e6;
};

function zmena(zaklad: number, rok: number): Zmena {
  return {
    zaklad,
    rok,
    osoby: rok - zaklad,
    // „Nula“ = nula po zaokrouhlení na celé osoby, jak se číslo zobrazí (jinak by vycházela nesmyslná procenta)
    procenta: Math.round(zaklad) === 0 ? null : ((rok - zaklad) / zaklad) * 100,
  };
}

/** Průměrný věk z ročníků (střed ročníku = věk + 0,5; 100+ jako 100,5). Stejně jako scripts/souhrn.mjs. */
export function prumernyVek(muzi: number[], zeny: number[]): number {
  let lidi = 0;
  let roky = 0;
  for (let v = 0; v < muzi.length; v++) {
    const n = muzi[v] + zeny[v];
    lidi += n;
    roky += n * (v + 0.5);
  }
  return lidi ? roky / lidi : 0;
}

/** Index roku v projekci; mimo rozsah vyhodí chybu. */
function indexRoku(data: DataObce, rok: number): number {
  const i = data.projekce.roky.indexOf(rok);
  if (i < 0) throw new Error(`Rok ${rok} není v projekci obce ${data.kod}.`);
  return i;
}

export function vypocitejVypis(data: DataObce, rok: number): Vypis {
  const { projekce, historie } = data;
  const i0 = indexRoku(data, ROK_ZAKLAD);
  const i1 = indexRoku(data, rok);
  const [m0, z0, m1, z1] = [projekce.muzi[i0], projekce.zeny[i0], projekce.muzi[i1], projekce.zeny[i1]];

  const skupiny: SkupinaVypisu[] = SKUPINY.map((g) => ({
    id: g.id,
    nazev: g.nazev,
    popisek: popisek(g.od, g.do),
    ...zmena(soucet(m0, g.od, g.do) + soucet(z0, g.od, g.do), soucet(m1, g.od, g.do) + soucet(z1, g.od, g.do)),
  }));

  const celkem = zmena(soucet(m0) + soucet(z0), soucet(m1) + soucet(z1));

  const pyramida: RadekPyramidy[] = m0.map((_, vek) => ({
    vek,
    muziZaklad: m0[vek],
    zenyZaklad: z0[vek],
    muzi: m1[vek],
    zeny: z1[vek],
  }));

  // Skutečnost do 2025, predikce 2025–zvolený rok; v roce 2025 obě hodnoty
  const body = new Map<number, BodVyvoje>();
  historie.roky.forEach((r, i) => body.set(r, { rok: r, skutecnost: historie.celkem[i] }));
  for (let i = i0; i <= i1; i++) {
    const r = projekce.roky[i];
    const bod = body.get(r) ?? { rok: r };
    bod.predikce = soucet(projekce.muzi[i]) + soucet(projekce.zeny[i]);
    body.set(r, bod);
  }
  const vyvoj = [...body.values()].sort((a, b) => a.rok - b.rok);

  return { rok, skupiny, celkem, pyramida, vyvoj, prumernyVek: prumernyVek(m1, z1) };
}
