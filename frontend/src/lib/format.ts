/**
 * Zaokrouhlení až při zobrazení (navrh-aplikace.md kap. 4):
 * osoby na celá čísla, procenta na 1 desetinné místo.
 */
const numberFmt = new Intl.NumberFormat("cs-CZ", { maximumFractionDigits: 0 });
const pctFmt = new Intl.NumberFormat("cs-CZ", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** 1234.6 → "1 235" */
export const formatNumber = (n: number) => numberFmt.format(Math.round(n));

/**
 * Zaokrouhlí nezáporná čísla na celé osoby tak, aby jejich součet = zaokrouhlený součet
 * (metoda největších zbytků) – v tabulce pak součet skupin sedí na řádek Celkem.
 * `cil` = zaokrouhlený součet, na který se má trefit (jinak se spočítá z hodnot).
 */
export function zaokrouhliNaSoucet(hodnoty: number[], cil = Math.round(hodnoty.reduce((s, x) => s + x, 0))): number[] {
  const vysledek = hodnoty.map(Math.floor);
  let zbyva = cil - vysledek.reduce((s, x) => s + x, 0);
  const poradi = hodnoty.map((x, i) => ({ i, zbytek: x - Math.floor(x) })).sort((a, b) => b.zbytek - a.zbytek);
  for (const { i } of poradi) {
    if (zbyva <= 0) break;
    vysledek[i] += 1;
    zbyva -= 1;
  }
  // Pojistka (cíl menší než součet dolních částí) – ubrat u nejmenších zbytků
  for (const { i } of [...poradi].reverse()) {
    if (zbyva >= 0) break;
    if (vysledek[i] > 0) {
      vysledek[i] -= 1;
      zbyva += 1;
    }
  }
  return vysledek;
}

/** Změna v osobách se znaménkem: 12.4 → "+12", −3 → "−3", 0.2 → "0" */
export function formatZmenaOsob(n: number): string {
  const r = Math.round(n);
  if (r === 0) return "0";
  return `${r > 0 ? "+" : "−"}${numberFmt.format(Math.abs(r))}`;
}

/** Změna v % se znaménkem: 5.23 → "+5,2 %", null → "–" */
export function formatZmenaPct(pct: number | null): string {
  if (pct === null) return "–";
  const r = Math.round(pct * 10) / 10;
  if (r === 0) return "0,0 %";
  return `${r > 0 ? "+" : "−"}${pctFmt.format(Math.abs(r))} %`;
}
