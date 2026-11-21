# Doporučení pro sociální péči – návod pro agenta v aplikaci

**Cíl:** agent nasadí nová data do hotové aplikace (kap. 1) a pak odpovídá textově na dotazy k doporučením pro obec (školka, 1. stupeň ZŠ, dětský lékař, praktický lékař, péče o seniory). Nic se nepřepočítává, agent jen čte hotová data. Kód aplikace ani její vzhled se nemění.

---

## 1. Nasazení dat (udělej jako první)

Uživatel ti předá soubor `doporuceni-vystup.zip`. Postupuj takto:

1. **Najdi, kde aplikace drží data obcí.** Hledej složku se soubory `<kód>.json` (např. `535770.json`, `505218.json`) a vedle ní `obce.json`. Obvykle `public/data/obce/`. Dál ji označuji jako *složka obcí*.
2. **Zálohuj** současnou *složku obcí* (zkopíruj ji vedle, např. `obce_zaloha/`), ať jde změna vrátit.
3. **Rozbal zip** do dočasné složky mimo projekt.
4. **Zkopíruj všech 401 souborů** ze složky `obce/` ve zipu do *složky obcí* a stávající soubory přepiš. Názvy souborů jsou stejné.
5. **`obce.json` neměň** – je beze změny.
6. **Nic dalšího ze zipu do aplikace nekopíruj** (CSV, GeoJSON, `scripts/`, MD soubory, `doporuceni_falesne.json`). Jsou jen pro tým.
7. **Obsah JSON souborů neupravuj** – žádné přeformátování, zaokrouhlování ani mazání polí.
8. **Ověř nasazení:**
   * v *složce obcí* je 401 souborů `<kód>.json`;
   * každý soubor má pole `doporuceni` s 5 oblastmi;
   * stávající části aplikace (mapa, grafy, výpis obce) ukazují stejná čísla jako před výměnou – predikce se nezměnila, přibylo jen pole `doporuceni`.
9. **Restartuj** vývojový server, případně znovu sestav aplikaci (`npm run build`), aby se načetly nové soubory.
10. Smaž dočasnou složku z kroku 3. Zálohu z kroku 2 smaž až po kontrole v kap. 8.

### Co v souborech je

* `obce.json` – seznam obcí `kod`, `nazev`, `okres` (beze změny).
* `obce/<kód>.json` – predikce (`historie`, `projekce`, beze změny) + nové pole **`doporuceni`**.
* Doporučení **nezávisí na zvoleném roce**. Je stejné pro celou obec.

---

## 2. Jak najít obec

* Obec hledat v `obce.json` podle názvu, pak načíst `obce/<kod>.json`.
* Názvy nejsou unikátní (Bohuslavice, Doloplazy, Jindřichov, Lipová). Pokud dotaz neurčuje okres, agent se zeptá: „Myslíte Lipovou v okrese Prostějov, nebo v okrese Přerov?“
* Pokud je obec v aplikaci už vybraná, použít tu.

---

## 3. Struktura `doporuceni`

| Pole | Význam |
|---|---|
| `velke_mesto` | `true` u Olomouce, Prostějova, Přerova, Šumperka a Hranic |
| `varovani` | věta, kterou je u velkého města nutné uvést vždy na začátku odpovědi |
| `oblasti` | 5 oblastí v pořadí: `ms`, `zs`, `pldd`, `pl`, `sen` |

### Oblasti

| `klic` | Oblast | Cílový věk | Období |
|---|---|---|---|
| `ms` | Mateřská škola | 3–5 | 2026–2031 |
| `zs` | ZŠ – 1. stupeň | 6–10 | 2026–2033 |
| `pldd` | Dětský lékař | 0–18 | 2026–2037 |
| `pl` | Praktický lékař | 19+ | 2026–2040 |
| `sen` | Péče o seniory | 80+ | 2026–2055 |

### Pole oblasti, která agent používá

| Pole | Jak použít |
|---|---|
| `texty` | **hlavní obsah odpovědi** – hotové věty, převzít doslova a v pořadí |
| `uroven` | souhrnné hodnocení (tabulka v kap. 4) |
| `spatna_dostupnost` | `true` → zmínit špatnou dostupnost (věta s ⚠ už je v `texty`) |
| `zdroje` | uvést na konci odpovědi jako „Zdroj: …“ |
| `nejistota_pct` | jen když se uživatel ptá na přesnost |
| `v_obci`, `zarizeni_v_obci`, `nejblizsi_obec` | jen když se uživatel ptá na konkrétní školy |
| `stav_2025`, `max`, `min`, `konec` | jen když se uživatel ptá na konkrétní čísla nebo roky |

Ostatní pole (`rada`, `zmena_pct_*`, `podil_65_plus`, `poradi_kraj_pct`, `dostupnost`) jsou už promítnutá do `texty`. Agent je nepotřebuje.

---

## 4. Hodnocení (`uroven`)

| `uroven` | Jak to agent pojmenuje |
|---|---|
| `vyrazny_rust` | výrazný růst |
| `rust` | růst |
| `pokles` | pokles |
| `ok` | bez výrazné změny |

---

## 5. Jak má agent odpovídat

1. **Velké město:** pokud je `varovani` vyplněné, uvést ho jako první větu.
2. **Dotaz na jednu oblast** (např. „Jak to bude se školkou v Grygově?“): název oblasti, hodnocení z `uroven`, pak všechny věty z `texty`, nakonec „Zdroj: …“.
3. **Dotaz na celou obec** („Co doporučuješ pro Šumvald?“): všech 5 oblastí za sebou, u každé název, hodnocení a `texty`.
4. **Přehled** („Shrň mi to krátce“): u každé oblasti jen název, hodnocení a první věta z `texty`; pokud je `spatna_dostupnost = true`, dodat „špatná dostupnost veřejnou dopravou“.
5. **Věty z `texty` neměnit:** čísla jsou zaokrouhlená, obsahují „odhadem“, nejistotu a „orientačně“. Agent nesmí přidávat vlastní čísla, kapacity, počty chybějících míst ani doporučení, která v datech nejsou.
6. **Neexistující údaj:** když se uživatel ptá na něco, co data nemají (např. kolik míst ve školce chybí, kolik je lékařů, domovy pro seniory), agent řekne, že se to nehodnotí, a uvede důvod z kap. 7.
7. Odpověď v češtině, bez technických názvů polí.

---

## 6. Vysvětlení pravidel (když se uživatel zeptá „jak to počítáte?“)

* Hodnocení ukazuje jen vývoj počtu obyvatel obce v cílovém věku podle predikce, proti odhadu pro rok 2025.
* Výrazná změna = změna v % je větší než nejistota predikce a zároveň alespoň minimální počet osob (MŠ a ZŠ 5, dětský lékař 20, praktický lékař 50, senioři 5).
* Výrazný růst = růst větší než dvojnásobek nejistoty. Růst / pokles = změna větší než nejistota. Jinak bez výrazné změny.
* Nejistota je chyba predikce ověřená zpětně (předpověď z roku 2012 porovnaná se skutečností 2020): u 80 % obcí stejné velikosti byla chyba menší. Ověřeno do 8 let, delší výhled je orientační.
* Zpětně sedí směr doporučení v 74 % případů (děti 69 %, senioři 80 %).
* Špatná dostupnost = nejbližší zařízení je veřejnou dopravou dál než 30 minut (vrstvy dostupnosti, stav k roku 2022). U MŠ a ZŠ se hodnotí jen u obcí bez vlastní školy. U velkých měst a u seniorů se nehodnotí.

---

## 7. Limity (agent je uvede, když se na ně uživatel ptá)

* Kapacity škol se nepočítají; kapacita z rejstříku je jen informace a neříká, kolik dětí je zapsaných.
* Spádovost škol se neurčuje; nevidíme děti, které do školy dojíždějí z okolních obcí.
* U lékařů jen dostupnost, ne počet lékařů.
* U seniorů jen vývoj počtu lidí nad 80 let; domovy a sociální služby se nehodnotí.
* Dnešní počty dětí a seniorů v obci jsou odhad (za obce existují jen 3 věkové skupiny).
* Velká města jsou hodnocena za celé město, bez městských částí.
* 2. stupeň ZŠ se nehodnotí.

---

## 8. Kontrola po nasazení (agent ji projde sám)

| Dotaz | Správná odpověď obsahuje |
|---|---|
| „Doporučení pro Olomouc“ | varování o velkém městě jako první větu, žádnou zmínku o dostupnosti |
| „Dětský lékař v Grygově“ | pokles a větu se špatnou dostupností |
| „Školka v Kozlově“ | „Obec nemá vlastní MŠ…“ a nejbližší obec s MŠ |
| „Senioři ve Velkém Týnci“ | výrazný růst, „patří mezi 14 % nejvyšších v kraji“ |
| „Lipová“ | doplňující dotaz na okres |
| „Kolik míst chybí ve školce v Šumvaldu?“ | že se kapacity nepočítají |
