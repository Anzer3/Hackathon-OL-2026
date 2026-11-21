/**
 * Předpočítaný souhrn z dat modelu (public/data) – spouští se automaticky před `dev` a `build`.
 *
 * Vstup (datový kontrakt, viz navrh-aplikace.md kap. 2):
 *   public/data/obce.json, public/data/obce/<kód>.json
 * Výstup:
 *   public/data/kraj.json         – celý kraj ve STEJNÉM formátu jako soubor obce (součet všech obcí),
 *                                   takže ho aplikace zpracuje stejným adaptérem
 *   public/data/prumerny-vek.json – průměrný věk každé obce v letech projekce (barvy mapy)
 *
 * Zároveň zkontroluje data podle kap. 5 plánu modelu a případné problémy vypíše.
 *
 * Spuštění ručně: node scripts/souhrn.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DATA = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "data");
const KRAJ = { kod: "CZ071", nazev: "Olomoucký kraj", okres: "" };

const cti = (soubor) => JSON.parse(readFileSync(join(DATA, soubor), "utf8"));
const zaokrouhli = (x, mist) => Math.round(x * 10 ** mist) / 10 ** mist;
const soucet = (a) => a.reduce((s, x) => s + x, 0);

/** Průměrný věk z ročníků (střed ročníku = věk + 0,5; 100+ počítáno jako 100,5). Stejně jako src/lib/adapter.ts. */
function prumernyVek(muzi, zeny) {
  let lidi = 0;
  let roky = 0;
  for (let v = 0; v < muzi.length; v++) {
    const n = muzi[v] + zeny[v];
    lidi += n;
    roky += n * (v + 0.5);
  }
  return lidi ? roky / lidi : 0;
}

const seznam = cti("obce.json");
const chyby = [];

let kraj = null;
const historieKraje = new Map(); // rok → součet
const vek = {};

for (const { kod, nazev } of seznam) {
  let o;
  try {
    o = cti(join("obce", `${kod}.json`));
  } catch {
    chyby.push(`${kod} ${nazev}: chybí soubor obce/${kod}.json`);
    continue;
  }
  const { historie, projekce } = o;

  // Kontroly (kap. 5)
  const vsechna = [...historie.celkem, ...projekce.muzi.flat(), ...projekce.zeny.flat()];
  if (vsechna.some((x) => typeof x !== "number" || !Number.isFinite(x) || x < 0))
    chyby.push(`${kod} ${nazev}: záporné číslo nebo NaN`);
  if (projekce.muzi.length !== projekce.roky.length || projekce.muzi.some((r) => r.length !== 101))
    chyby.push(`${kod} ${nazev}: projekce nemá ${projekce.roky.length} × 101 hodnot`);
  const i2025 = historie.roky.indexOf(projekce.roky[0]);
  const rozdil = Math.abs(soucet(projekce.muzi[0]) + soucet(projekce.zeny[0]) - historie.celkem[i2025]);
  if (!(rozdil < 1)) chyby.push(`${kod} ${nazev}: součet projekce ${projekce.roky[0]} ≠ historie (rozdíl ${rozdil})`);

  // Kraj = součet obcí. Obce vzniklé později (2016 z vojenského újezdu Libavá) přispívají až od vzniku.
  historie.roky.forEach((r, i) => historieKraje.set(r, (historieKraje.get(r) ?? 0) + historie.celkem[i]));
  if (!kraj) {
    kraj = {
      ...KRAJ,
      historie: { roky: [], celkem: [] },
      projekce: {
        roky: [...projekce.roky],
        muzi: projekce.muzi.map((r) => r.map(() => 0)),
        zeny: projekce.zeny.map((r) => r.map(() => 0)),
      },
    };
  }
  for (const pohl of ["muzi", "zeny"])
    projekce[pohl].forEach((r, t) => r.forEach((x, v) => (kraj.projekce[pohl][t][v] += x)));

  vek[kod] = projekce.roky.map((_, t) => zaokrouhli(prumernyVek(projekce.muzi[t], projekce.zeny[t]), 2));
}

const roky = [...historieKraje.keys()].sort((a, b) => a - b);
kraj.historie = { roky, celkem: roky.map((r) => historieKraje.get(r)) };
// 3 desetinná místa místo 1 – součet za kraj tak sedí na skutečnost 2025 bez chyby ze zaokrouhlení
for (const pohl of ["muzi", "zeny"]) kraj.projekce[pohl] = kraj.projekce[pohl].map((r) => r.map((x) => zaokrouhli(x, 3)));

writeFileSync(join(DATA, "kraj.json"), JSON.stringify(kraj));
writeFileSync(join(DATA, "prumerny-vek.json"), JSON.stringify({ roky: kraj.projekce.roky, obce: vek }));

const vse = Object.values(vek).flat();
console.log(
  `[souhrn] ${seznam.length} obcí · kraj ${kraj.projekce.roky[0]}: ${Math.round(
    soucet(kraj.projekce.muzi[0]) + soucet(kraj.projekce.zeny[0]),
  )} obyvatel · průměrný věk obcí ${Math.min(...vse).toFixed(1)}–${Math.max(...vse).toFixed(1)}`,
);
if (chyby.length) {
  console.warn(`[souhrn] Problémy v datech (${chyby.length}):\n  ` + chyby.join("\n  "));
  process.exitCode = 1;
}
