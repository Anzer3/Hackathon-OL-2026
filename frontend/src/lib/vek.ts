/**
 * Barevná škála průměrného věku – pevné meze, aby šly porovnávat roky mezi sebou.
 * Světle fialová = mladší obyvatelstvo, tmavě fialová = starší.
 * (Průměrný věk se počítá z ročníků – src/lib/adapter.ts / scripts/souhrn.mjs.)
 */
export const VEK_STUPNE: { od: number; barva: string }[] = [
  { od: -Infinity, barva: "#f1e8fb" },
  { od: 40, barva: "#d9c2f0" },
  { od: 42, barva: "#b98ae0" },
  { od: 44, barva: "#8e4fc4" },
  { od: 46, barva: "#5f2a96" },
  { od: 48, barva: "#34145c" },
];

export const BARVA_BEZ_DAT = "#e2e8f0";
