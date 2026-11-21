# Model a generování JSON – predikce obyvatel obcí Olomouckého kraje po jednotkách věku

**Cíl:** pro každou obec kraje předpovědět počet obyvatel po jednotkách věku ($0$–$100+$) a pohlaví pro roky 2026–2055 a uložit výsledek do statických JSON souborů, které čte aplikace.

**Data:** spojují se dvě sady ČSÚ:
* `OBY02B`: okresy a kraj po jednotkách věku,
* `OBY02E`: obce ve 3 věkových skupinách.

**Kdo co dělá:** tento dokument pokrývá vše v Pythonu (data → model → JSON). Aplikace je popsaná v `navrh-aplikace.md`. Obě části spojuje jen datový kontrakt (kap. 5), který musí být v obou dokumentech stejný.

Model počítá všechny obce najednou, protože rozpočet na věky i sladění součtů pracuje s celým okresem. Výpočet trvá zlomek sekundy.

---

## 0. Princip

Obec se v roce $T_0$ (teď 2025) rozpočítá na ročníky zvlášť pro muže a ženy. Pak se rok po roku posouvá až do roku 2055:

1. Ročník se posune o rok věku a vynásobí koeficientem změny okresu (přežití + stěhování).
2. Věk $0$ = porodnost okresu × ženy 20–39 let v obci.
3. Mladší věky se upraví migračním faktorem obce (rostoucí satelity vs. vylidňující se periferie).
4. Součet obcí se srovná na projekci okresu.

---

## 1. Data a čištění

### `OBY02B` – okresy a kraj, jednotky věku
* `IndicatorType = 2406K2` (stav k 31. 12.; bez filtru se řádky ztrojí kvůli stavům k 1. 1. a 1. 7.).
* `POHL2 ∈ {1, 2}`, bez `VEK1C = VEKC`.
* Kraj `CZ071`, okresy `CZ0711`–`CZ0715`, roky od 2007.
* Pro test přesnosti po ročnících i ORP `7101`–`7113`.

### `OBY02E` – obce, 3 skupiny
* Stejné filtry.
* Obce kraje: název končí `(okr. Jeseník|Olomouc|Prostějov|Přerov|Šumperk)`; odtud i vazba obec → okres.
* Libavá (od 2016 bez obyvatel) vyřadit → 401 obcí.
* Vazbu obec → ORP sady nemají, proto se pracuje s okresy.

### Čisté přechody (ostatní vyřadit)
| Vyřadit | Důvod |
|---|---|
| 2010→2011, 2020→2021 | přepočet po sčítání |
| 2019→2020 | covid (vyšší úmrtnost 80+) |
| 2021→2022 | migrace z Ukrajiny |

Pro $T_0 = 2025$ zbývá: 2007→2008 až 2009→2010, 2011→2012 až 2018→2019, 2022→2023 až 2024→2025.

---

## 2. Model

### 2.1 Spojení dat: rozpočet obce na ročníky (IPF)
* Pro každý okres a pohlaví tabulka obce × ročníky, start = věkový profil okresu.
* Střídavě se upravuje, dokud tabulka nesedí na obojí:
  1. součet ročníků obce ve 3 skupinách = `OBY02E`,
  2. součet obcí za ročník = okres v `OBY02B`.
* Stejná funkce se pustí i pro minulé roky (potřebuje to krok 2.4), každý rok jen se svými daty.

### 2.2 Koeficienty změny (CCR)

$$\text{CCR}(v, s) = \frac{\sum_t P(v+1, s, t+1)}{\sum_t P(v, s, t)} \quad \text{přes posledních 8 čistých přechodů}$$

* Podíl součtů, ne průměr ročních podílů (stabilnější u malých čísel).
* **Věk 0–74:** za okres.
* **Věk 75+:** za celý kraj, strop $\le 1$.
* **Věk 95+:** jeden společný koeficient za kraj (ročníky 95–99 a $100+$).

### 2.3 Narození
* $P(0, t+1) = \text{CWR}_{\text{okres}} \cdot Ž_{20\text{–}39}(t)$
* $\text{CWR}$ z **posledního** čistého přechodu (porodnost rychle klesá: v kraji 0,077 → 0,073 → 0,068; průměr by ji nadhodnotil o 7 %). Dál se drží konstantní.
* Podíl chlapců z dat (věk 0).
* Obec má CWR svého okresu.

### 2.4 Migrační faktor obce
* **Dva faktory na obec:** $m_{0\text{–}14}$ a $m_{15\text{–}64}$, společné pro muže i ženy; pro 65+ $m = 1$.
* **Věková váha** $\alpha$ (věk v roce $t+1$): 1 pro 0–39, 0,5 pro 40–49, 0 pro 50+.
* **Použití:** $\text{CCR}(v) \cdot (1 + \alpha(v)(m-1))$; pro věk 0 se stejně upraví narození.
* **Odhad** pro každý z posledních 8 čistých přechodů:
  * obec z IPF v roce $t$ se posune o rok **koeficienty a porodností okresu z téhož přechodu** → $\hat P(v)$,
  * spočítá se $m$ a pak se zprůměruje:

$$m = 1 + \frac{S_g - \sum_{v \in g} \hat P(v)}{\sum_{v \in g} \alpha(v)\,\hat P(v)}$$

  kde $S_g$ je skutečný stav skupiny $g$ v roce $t+1$.
* **Přitažení k 1 u malých obcí:** $m^* = \frac{N_g\, m + 150}{N_g + 150}$, kde $N_g$ je průměrná velikost skupiny.
* **Oříznutí** $m^*$ na 1.–99. percentil přes obce (pojistka proti extrémům).
* **Slábnutí v čase:** $m^{(h)} = 1 + 0{,}9^{\,h-1}(m^* - 1)$.
* **Ústavní zařízení:** u obcí s podílem 65+ nad 40 % (Radkova Lhota) se počet 65+ drží na úrovni roku 2025 (kapacita domova se nemění).
* Obce s krátkou historií: $m = 1$.

### 2.5 Sladění na okres
* Okres se promítá sám (okresní koeficienty, bez faktorů obcí).
* Každý rok se obce v každé buňce (pohlaví, věk) proporcionálně přepočítají na okres. Prázdná buňka se rozdělí podle velikosti obcí.
* Hodnoty zůstávají desetinné; do JSON se ukládají s 1 desetinným místem, zaokrouhluje až aplikace.

### 2.6 Přesnost (jen do prezentace)
* V aplikaci se nezobrazuje. Chyby z backtestu (kap. 3) se ukážou v prezentaci jako důkaz, že model funguje.

---

## 3. Backtest

* Model je funkce výchozího roku $T$; backtest = stejný kód, jen jiné $T$ a data jen do $T$.
* **Výchozí roky:** 2016 (kontrola 2017–2020) a 2012 (kontrola 2013–2020, horizont až 8 let).
* **Obce:** chyba počtu obyvatel a 3 skupin, zvlášť pro obce < 500, 500–1 999, 2 000+.
* **Srovnání:** (1) populace beze změny, (2) model bez faktorů obcí. Model musí porazit oba; jinak faktory obcí vypnout.
* **Ročníky (test na ORP):** 13 ORP přesně skládá 5 okresů. Každé ORP se rozpočítá stejně jako obec (jen ze 3 skupin) a porovná se skutečnými ročníky. Pro rok 2025 vychází 2,8 % lidí ve špatném ročníku; u venkovských ORP ve věku 15–39 chyba 6–10 %.

---

## 4. Postup práce (Python)

1. **Falešná data:** skript vygeneruje `obce.json` a `obce/<kód>.json` s vymyšlenými čísly přesně podle kontraktu (kap. 5). Předat frontendu hned – ten pak nečeká na model.
2. **ETL:** DuckDB nad CSV → `.parquet` (okresy, ORP, obce, čisté přechody).
3. **Model bez faktorů obcí:** IPF, koeficienty, porodnost, sladění → projekce všech obcí 2025–2055.
4. **Export JSON** (kap. 5) + kontroly (kap. 5) → předat frontendu. **Tady je funkční demo.**
5. **Backtest** + srovnání (kap. 3).
6. **Faktory obcí** (2.4) zapnout, pokud v backtestu pomůžou → znovu export.

Model je funkce výchozího roku $T$ (ETL a model zvlášť, export volá model s $T = 2025$). Backtest pak volá stejný model s jiným $T$.

---

## 5. Datový kontrakt (výstup pro aplikaci)

Musí být shodný s kap. „Datový kontrakt“ v `navrh-aplikace.md`. Změnu vždy domluvit s frontendem.

### Soubory
* `data/obce.json` – seznam obcí pro výběr.
* `data/obce/<kód>.json` – jeden soubor na obec (401 souborů, ~30 kB každý).

### `obce.json`
Pole objektů seřazené podle názvu:

| Pole | Typ | Příklad |
|---|---|---|
| `kod` | text | `"505218"` |
| `nazev` | text, bez „(okr. …)“ | `"Šumvald"` |
| `okres` | text | `"Olomouc"` |

Názvy nejsou unikátní (Bohuslavice, Doloplazy, Jindřichov, Lipová jsou v kraji dvakrát) → identifikátor je vždy `kod`.

### `obce/<kód>.json`

| Pole | Typ | Obsah |
|---|---|---|
| `kod`, `nazev`, `okres` | text | stejné jako v `obce.json` |
| `historie.roky` | pole čísel | 2007 … 2025 |
| `historie.celkem` | pole čísel | skutečný počet obyvatel z `OBY02E` (celá čísla); u obcí vzniklých později začíná prvním rokem existence |
| `projekce.roky` | pole čísel | 2025 … 2055 (31 let; 2025 = výchozí stav z IPF) |
| `projekce.muzi` | pole 31 polí po 101 číslech | muži, věk 0 … 99, poslední = 100+; 1 desetinné místo |
| `projekce.zeny` | stejně | ženy |

### Kontroly před předáním
* 401 souborů, každý kód z `obce.json` má soubor.
* Žádná záporná čísla, žádné `NaN`.
* Součet `projekce` za rok 2025 = `historie.celkem` za 2025 (odchylka < 1 osoba kvůli zaokrouhlení).
* Součet obcí v okrese za každý rok projekce = projekce okresu.

---

## 6. Limity (říct v prezentaci)

* **Tvar uvnitř skupin** přebírá obec z okresu: data za obce mají jen 3 skupiny. Ročníky za obce nejde přímo ověřit, ověřují se jen na ORP.
* **Okres míchá město a venkov:** ve věku 19–30 v ORP Olomouc ročně přibývá 0,6–1 % lidí, v ORP Konice ubývá až 3 %. Faktor obce to srovná jen v součtu skupiny. Zlepšení: počítat přes ORP (potřebuje číselník CISORP; mimo 2 datové sady).
* **Porodnost** je držena na úrovni 2025. MŠ a ZŠ za více než 3–6 let počítají s dětmi, které se ještě nenarodily.
* **Stěhování:** koeficienty míchají roky 2014–2019 a 2022–2025, kdy se do kraje stěhuje víc mladých. Tahle volba nejvíc ovlivní dlouhodobé výsledky.
* **Chyby z backtestu** pocházejí z klidných let 2013–2020, po roce 2022 může být skutečná nejistota větší.
* **Malé obce:** ročníky jsou očekávané hodnoty (desetinná čísla), ne počty konkrétních lidí.
* **Šoky** (nová zástavba, zavření podniku) model nepředvídá.
