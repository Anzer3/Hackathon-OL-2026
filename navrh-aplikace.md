# Napojení dat do hotového dema

**Výchozí stav:** frontend (demo) je hotový a zobrazuje výpis pro jednu obec a zvolený rok. Chybí jen skutečná data.

**Úkol:** nahradit současná (ukázková) data v demu výstupem modelu – statickými JSON soubory z Pythonu (viz `predikcni_model_plan.md`, kap. 5). Vzhled ani komponenty se nemění.

---

## 1. Princip napojení

* Model vyrobí JSON soubory → zkopírují se do dema → demo je načte a předá komponentám.
* Mezi soubory a komponentami je **jedna převodní funkce (adaptér)**: vezme data obce a zvolený rok a vrátí čísla přesně ve tvaru, jaký komponenty už teď používají.
* Komponenty se tak nepřepisují. Mění se jen místo, odkud data berou.

---

## 2. Datový kontrakt (vstup)

Musí být shodný s kap. 5 v `predikcni_model_plan.md`.

### `data/obce.json`
Pole objektů seřazené podle názvu:

| Pole | Typ | Příklad |
|---|---|---|
| `kod` | text | `"505218"` |
| `nazev` | text | `"Šumvald"` |
| `okres` | text | `"Olomouc"` |

Názvy nejsou unikátní (Bohuslavice, Doloplazy, Jindřichov, Lipová) → ve výběru zobrazovat **„název (okres)“**, identifikátor je vždy `kod`.

### `data/obce/<kód>.json`

| Pole | Obsah |
|---|---|
| `kod`, `nazev`, `okres` | identifikace |
| `historie.roky` | 2007 … 2025 (u novějších obcí kratší) |
| `historie.celkem` | skutečný počet obyvatel v těch letech |
| `projekce.roky` | 2025 … 2055 |
| `projekce.muzi` | pro každý rok pole 101 čísel: věk 0 … 99, poslední = 100+ |
| `projekce.zeny` | totéž pro ženy |

Rok 2025 v `projekce` je současný stav, se kterým se vše porovnává.

**Pokud demo už používá jiný formát dat:** neměnit demo ani kontrakt, jen adaptér (kap. 4) převede jedno na druhé.

---

## 3. Umístění a načítání souborů

* Soubory zkopírovat do složky pro statické soubory dema (u Vite `public/data/`).
* `obce.json` načíst jednou při startu → naplní výběr obce.
* Soubor obce načíst až při výběru obce; už načtené obce si pamatovat (nenačítat znovu).
* Změna roku nic nenačítá, jen znovu zavolá adaptér.
* Aplikaci spouštět přes server (`npm run dev`, na demo `npm run build` + `npm run preview`). Otevření `index.html` dvojklikem načítání souborů zablokuje.

---

## 4. Adaptér: z dat obce na čísla pro komponenty

Vstup: data obce + zvolený rok. Počítá se vždy pro **2025** a **zvolený rok**.

### Věkové skupiny
| Skupina | Věk (indexy v poli) |
|---|---|
| nejmenší děti | 0–2 |
| předškoláci | 3–5 |
| školáci | 6–14 |
| mládež | 15–19 |
| produktivní věk | 20–64 |
| mladší senioři | 65–79 |
| starší senioři | 80–100 (vč. 100+) |

Definici skupin mít na jednom místě (jedna konstanta). Pokud demo používá jiné skupiny, upravit jen tuto konstantu.

### Co adaptér vrací (pro jednotlivé části výpisu)

| Část výpisu | Čísla |
|---|---|
| 1. Skupiny ve zvoleném roce | počet v každé skupině = součet mužů + žen přes věky skupiny |
| 2. Změna – graf | změna v % pro každou skupinu = (zvolený rok − 2025) / 2025 × 100 |
| 3. Změna – tabulka | pro každou skupinu a pro celkem: 2025, zvolený rok, změna v osobách, změna v % |
| 4. Pyramida | muži a ženy po ročnících 0–100+ pro 2025 a pro zvolený rok |
| 5. Celkový počet | řada skutečnosti 2007–2025 (`historie`) + řada predikce 2025–zvolený rok (součty z `projekce`); čísla 2025, zvolený rok, změna v % |

### Pravidla
* Počítat s desetinnými čísly, zaokrouhlovat až při zobrazení (osoby na celá čísla, procenta na 1 desetinné místo).
* Je-li počet ve skupině v roce 2025 nula → změna v % = „–“.
* Řady v grafu 5 se potkají v roce 2025 (rok 2025 je v obou).

---

## 5. Postup

1. Od týmu modelu převzít **falešná data** ve finálním formátu.
2. Zjistit, v jakém tvaru komponenty dema čísla teď dostávají.
3. Napsat adaptér (kap. 4) a napojit načítání (kap. 3).
4. Odstranit ukázková data z dema.
5. Ověřit na falešných datech (kap. 6).
6. Vyměnit falešná data za skutečná – kód se už nemění.
7. `npm run build` + `npm run preview`, vyzkoušet bez internetu.

---

## 6. Kontrola před demem

* Součet skupin v tabulce = řádek Celkem.
* Celkem za 2025 v tabulce = poslední bod skutečnosti v grafu 5.
* Pro rok 2026 i 2055 se vše vykreslí.
* Obce se stejným názvem (např. obě Lipové) se dají vybrat a ukazují různá čísla.
* Malá obec (pod 100 obyvatel) i Olomouc – osy grafů se přizpůsobí.
* Obec vzniklá v roce 2016 (např. Kozlov) – graf skutečnosti začíná až 2016.
* Běží bez internetu.
* Pro prezentaci předvybraná obec s příběhem a 1–2 další na rychlé přepnutí.
