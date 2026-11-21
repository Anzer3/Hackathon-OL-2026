# SPOT – frontend

Next.js + TypeScript + Tailwind CSS, mapa MapLibre (podklad OpenFreeMap, bez API klíče), grafy Recharts.

## Spuštění

```bash
cd frontend
npm install
npm run dev                      # vývoj → http://localhost:3000
npm run build && npm run preview # demo (produkční build)
```

Aplikaci vždy spouštět přes server – otevření HTML dvojklikem načítání dat zablokuje.
Běží i bez internetu: data jsou lokální, písmo se při buildu přibalí a když není dostupný
podklad mapy, mapa ukáže jen obce a jejich barvy na prázdném pozadí.

## Data z modelu

Statické JSON soubory z Pythonu (kontrakt: `navrh-aplikace.md` kap. 2) leží v `public/data/`:

```
public/data/obce.json            seznam obcí (kod, nazev, okres)
public/data/obce/<kód>.json      historie 2007–2025 + projekce 2025–2055 po ročnících 0–100+
public/data/kraj.json            ┐ předpočítá scripts/souhrn.mjs
public/data/prumerny-vek.json    ┘ (automaticky před `dev` i `build`)
```

**Výměna dat:** přepsat `public/data/obce.json` a `public/data/obce/` novými soubory z modelu
a spustit `npm run dev` / `npm run build` – kód se nemění. Skript `souhrn.mjs` při tom data
zkontroluje (počet souborů, záporná čísla / NaN, součet 2025 = skutečnost) a problémy vypíše.

- `obce.json` se načte jednou při startu, soubor obce až při jejím výběru (načtené se pamatují).
- Změna roku nic nenačítá, jen znovu zavolá adaptér.
- `kraj.json` = součet všech obcí ve stejném formátu jako obec → panel bez vybrané obce ukazuje celý kraj.
- `prumerny-vek.json` = průměrný věk obcí po letech → barvy mapy.

## Adaptér

`src/lib/adapter.ts` – `vypocitejVypis(dataObce, rok)` vrací čísla pro všechny části výpisu
(porovnání roku 2025 se zvoleným rokem). Věkové skupiny jsou definované jen tam (`SKUPINY`).
Počítá se s desetinnými čísly, zaokrouhluje se až při zobrazení (`src/lib/format.ts`).

## Prezentace

Obec vybraná po spuštění a obce na rychlé přepnutí: `PREZENTACE` v `src/lib/obce.ts`.

## Struktura

```
src/
  app/              layout a hlavní stránka (panel vlevo, lišta nad mapou, mapa)
  components/
    TopBar.tsx      kraj (zatím jen Olomoucký), vyhledání obce, pole s rokem a ±5 let
    SidePanel.tsx   vybrané území, klíčové údaje a výpis (části 1–5)
    AgeChart.tsx    1. obyvatelé ve věkových skupinách (procenta / počet)
    ZmenaChart.tsx  2. změna skupin oproti 2025 v %
    ZmenaTable.tsx  3. tabulka skupin: 2025, zvolený rok, změna, %
    Pyramida.tsx    4. věková pyramida zvoleného roku s obrysem 2025
    VyvojChart.tsx  5. celkový počet: skutečnost + predikce
    MapView.tsx     mapa obcí obarvená podle průměrného věku
  lib/
    types.ts        datový kontrakt
    data.ts         načítání JSON souborů (s pamětí)
    adapter.ts      data obce + rok → čísla pro komponenty
    format.ts       zaokrouhlení a formát čísel
    obce.ts         kraj, rozsah let, prezentace, hranice obcí
    vek.ts          barevná škála průměrného věku
public/
  data/                              výstup modelu (viz výše)
  obce-olomoucky-kraj.geojson        hranice 402 obcí (ČÚZK INSPIRE, CC BY 4.0, zjednodušeno; Libavá je bez dat)
  kraj-olomoucky.geojson             vnější hranice kraje (spočítaná z hranic obcí)
  vyplne-olomoucky-kraj.geojson      výplně mezer mezi obcemi (barvou sousední obce)
scripts/
  souhrn.mjs                         kraj.json + prumerny-vek.json + kontrola dat
  hranice/                           přichycení hranic obcí, obrys kraje a výplně mezer
```
