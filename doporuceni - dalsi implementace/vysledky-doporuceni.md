# Doporučení pro sociální péči – výsledky (podle plánu v5)

Zpracováno 21. 11. 2026. Vstup: hotová predikce `obce/<kód>.json` (401 obcí), vrstvy dostupnosti, rejstřík škol MŠMT (výstup 21. 11. 2026), obce kraje, statistika 2022.

---

## 1. Co je v balíku

| Soubor | Kapitola plánu | Obsah |
|---|---|---|
| `obce/<kód>.json` (401) | 6 | původní predikce **beze změny** + nové pole `doporuceni` |
| `obce.json` | – | seznam obcí (kopie, beze změny) |
| `doporuceni_falesne.json` | 7.1 krok 4 | falešné `doporuceni` podle kontraktu (pro frontend) |
| `obce_body.geojson` | 1.1 | 401 obcí: opravený polygon, `bod_lon/bod_lat` (representative point), `obyv_2025`, `velke_mesto` |
| `skoly.csv` | 1.2 | 899 míst výuky (MŠ 499, ZŠ 400) napojených na obec; název PO, IZO, kapacita školy |
| `skoly_vyrazene.csv` | 1.2 | 29 vyřazených míst + důvod (ruční kontrola) |
| `skoly_nenapojene.csv` | 1.2 | místa bez obce – po opravách prázdné |
| `obce_skoly.csv` | 1.2 | `kod`, `ma_ms`, `ma_zs` |
| `dostupnost.csv` | 1.3–1.5 | pro 4 vrstvy × 3 režimy horní mez pásma; zóna 0–100 m v obci; rozpory; nejbližší obec s MŠ/ZŠ |
| `rozpory.csv` | 1.4 | 3 rozpory rejstřík × vrstva (ruční kontrola) |
| `nejistota.csv` | 3.3 | nejistota oblast × velikost obce (P80 × poměr úzké skupiny) |
| `nejistota_backtest.md` | 3.3, 7.2 | P80 chyby obcí, poměry úzkých skupin, zpětná trefa |
| `nejistota_orp.csv`, `nejistota_orp_predikce.csv` | 3.3 | chyby úzkých skupin na ORP (odhad stavu / predikce) |
| `obec_orp.csv` | 3.3 | vazba obec → ORP (2016–2022 a od 2023), ověřená součty ČSÚ |
| `zpetna_trefa.csv` | 7.2 | směr predikce vs. skutečnost po obcích (T = 2012) |
| `rucni_kontrola.csv` | 1.2, 1.4 | obce k ruční kontrole s dopadem na kartu |
| `kontrola_dojizdka.csv` | 7.3 | odchylky rejstřík × `MOB_DOJ_SKOLY` |
| `overeni.md` | 7.2, 7.3 | výstup kontrol a citlivosti prahů |
| `scripts/s1…s7_*.py` | 7.1 | skripty v pořadí spuštění (s6 potřebuje `model.py` + data ETL) |

---

## 2. Příprava dat (kap. 1)

**Obce (1.1)**
* 402 polygonů, **28** neplatných opraveno `make_valid()` (plán uváděl 27).
* Vyřazena **Libavá** (503941) – není v predikci; zůstává Město Libavá → 401 obcí.
* **Velká města** (> 15 000 v 2025): Olomouc, Prostějov, Přerov, Šumperk, Hranice.

**Rejstřík škol (1.2)**
* Míst výuky MŠ 516, ZŠ 412. Napojeno přes název obce + okres: MŠ 515 / 516, ZŠ 411 / 412 (po opravách).
* Ručně opravených míst **5** (plán uváděl 6): „Dolany-Véska 64“ → Dolany, „obec Olomouc“, „obec Olomouc (k.ú. Řepčín)“ → Olomouc, 2× „obec Horka nad Moravou“ → Horka nad Moravou.
* Mimo kraj vyřazeno: Valašské Meziříčí (ZŠ), Ústí – okres Vsetín (MŠ).
* Podle názvu PO vyřazeno 27 míst (16 PO): speciální, logopedické, pro sluchově postižené, dětský domov, diagnostický ústav + lesní MŠ.
  * **Lesní:** vyřazuje se jen MŠ. ZŠ téže PO (Sofisa, Svobodná škola Přerov, Bystrouška Pavlov) zůstává – plán říká „lesní MŠ vyřadit“.
* Výsledek: **282 obcí s MŠ, 214 obcí se ZŠ**.

**Dostupnost (1.3)**
* Nejmenší pásmo, ve kterém leží bod obce (pásma jsou kumulativní „0 – X“).
* Autem do 15 min: MŠ 398, ZŠ 398, dětský lékař 390, praktik 396 obcí → potvrzeno, v textech jen VHD a pěšky.
* Mimo všechny zóny VHD: 1 obec (u lékařů).
* Stav vrstev: **k roku 2022** (podle týmu; v souborech datum není). Uvedeno ve zdrojích karty.

**Rozpory (1.4)** – `rozpory.csv`, ručně projít:
| Obec | Oblast | Rejstřík | Vrstva |
|---|---|---|---|
| Babice | MŠ | ano | ne |
| Měrovice nad Hanou | ZŠ | ne | ano |
| Vlčice | ZŠ | ano | ne |

U těchto obcí se dostupnost MŠ / ZŠ nezobrazuje (platí rejstřík).

**Nejbližší obec (1.5):** jen název, bez km; počítáno v S-JTSK mezi body obcí.

---

## 3. Nejistota (kap. 3.3) – plná varianta

Spočítáno z kódu backtestu (`model.py`, ETL nad OBY02B/OBY02E). Reprodukce `backtest.md` = shoda na setinu.

**1. 80. percentil chyby obcí** (T = 2012 → 2020, 8 let, model s faktory):

| skupina | < 500 | 500–1 999 | 2 000+ |
|---|---|---|---|
| 0–14 | 30,2 % | 19,4 % | 10,3 % |
| 15–64 | 11,5 % | 7,7 % | 4,9 % |
| 65+ | 16,4 % | 11,8 % | 5,9 % |

**2. Poměr úzké skupiny k celé skupině** – predikce obcí sečtené do 13 ORP proti skutečným ročníkům ORP (T = 2012 roky 2016–2020, T = 2016 roky 2017–2020). Vazba obec → ORP sestavená z adres rejstříku a dorovnaná tak, aby součty obyvatel ORP seděly přesně (2016–2025, odchylka 0). Mezi 2022 a 2023 změnila ORP jen obec Přemyslovice (Prostějov → Konice).

| oblast | skupina | chyba úzké | chyba skupiny | poměr |
|---|---|---|---|---|
| MŠ 3–5 | 0–14 | 4,9 % | 3,1 % | 1,60 |
| ZŠ 6–10 | 0–14 | 2,2 % | 3,1 % | 0,71 |
| dětský lékař 0–18 | 0–14 | 2,8 % | 3,1 % | 0,89 |
| praktik 19+ | 15–64 | 0,6 % | 0,7 % | 0,96 |
| senioři 80+ | 65+ | 3,3 % | 1,7 % | 1,89 |

**3. Výsledná nejistota = P80 × poměr** (`nejistota.csv`):

| oblast | < 500 | 500–1 999 | 2 000+ |
|---|---|---|---|
| MŠ | 48 % | 31 % | 17 % |
| ZŠ | 21 % | 14 % | 7 % |
| dětský lékař | 27 % | 17 % | 9 % |
| praktik | 11 % | 7 % | 5 % |
| senioři | 31 % | 22 % | 11 % |

* Nejistota je vyšší než v záložní variantě (P80 místo průměru) → méně obcí s „výraznou změnou“, hlavně u MŠ v malých obcích.
* Roky po 2033 (> 8 let) a senioři vždy „orientačně“.

---

## 4. Doporučení (kap. 3–6)

**Semafor – rozložení (401 obcí)**

| | MŠ | ZŠ | dětský lékař | praktik | senioři |
|---|---|---|---|---|---|
| 🔴 výrazný růst | 0 | 0 | 0 | 7 | 233 |
| 🟠 růst | 0 | 0 | 0 | 14 | 114 |
| 🔵 pokles | 161 | 296 | 235 | 69 | 0 |
| 🟢 bez výrazné změny | 240 | 105 | 166 | 311 | 54 |

* **U dětí není v žádné obci růst.** Plyne to z predikce (porodnost držená na úrovni 2025, rychle klesající ročníky), ne z pravidel.
* Senioři: 80+ roste skoro všude → obce rozlišuje `poradi_kraj_pct` a věta „patří mezi x % nejvyšších“ (jen pro horní polovinu).
* Vlna (přechodný nárůst): 37 obcí, jen u seniorů.

**Značka ⚠ špatná dostupnost (VHD > 30 min)**
| | hodnoceno obcí | špatná |
|---|---|---|
| MŠ (jen obce bez MŠ) | 119 | 15 |
| ZŠ (jen obce bez ZŠ) | 186 | 21 |
| dětský lékař | 396 | 79 |
| praktik | 396 | 46 |

**Demo obce (ručně prošlé)**

| Obec | MŠ | ZŠ | dětský lékař | praktik | senioři |
|---|---|---|---|---|---|
| Grygov | 🔵 −33 % | 🔵 −29 % | 🔵 −21 % ⚠ | 🟢 ⚠ | 🟠 +43 % |
| Velký Týnec | 🔵 −35 % | 🔵 −30 % | 🔵 −20 % | 🔴 +13 % | 🔴 +86 % (top 14 %) |
| Šumvald | 🔵 −34 % | 🔵 −35 % | 🔵 −31 % ⚠ | 🔵 −7 % | 🟠 +34 % |
| Krčmaň | 🟢 | 🔵 −24 % (bez ZŠ) | 🟢 | 🟢 | 🟠 +46 % |
| Dub nad Moravou | 🔵 −31 % | 🔵 −28 % | 🔵 −21 % | 🟢 | 🔴 +49 % |
| Olomouc (velké město) | 🔵 −26 % | 🔵 −27 % | 🔵 −18 % | 🟢 | 🔴 +40 % |

---

## 5. Rozhodnutí nad rámec plánu (plán je neurčoval)

1. **„Minimální počet osob“** = absolutní změna (max − 2025, resp. 2025 − min) v osobách.
2. **Vlna:** po špičce výrazný pokles **měřený od špičky** (stejné prahy); ve větě je minimum po špičce.
3. **Texty pro pokles / bez změny u lékařů a seniorů** napsány analogicky k šablonám pro růst.
4. **Bez změny kvůli malému počtu:** „Bez výrazné změny (změna je menší než hodnocené minimum X osob).“ Věta „v rámci nejistoty“ by tu nebyla pravdivá.
5. **Více než 3 školy v obci:** jedna souhrnná věta (počet + součet kapacit), celý seznam zůstává v `zarizeni_v_obci`. Jinak by měla Olomouc 35 vět.
6. **Kapacita ZŠ** je kapacita celé školy (i 2. stupeň) – takto je v rejstříku.
7. **`rada`** obsahuje jen roky oblasti (bez 2025); 2025 je ve `stav_2025`.
8. **Pásma:** text „30–45 min“, „1,5–2 km“ (pásma jsou kumulativní, známe jen interval).
9. **Pořadí seniorů:** `poradi_kraj_pct` = percentil růstu k maximu (100 = nejvyšší).

---

## 6. Ověření (kap. 7.2, 7.3)

**Kontroly 7.3 – vše OK**
* 401 souborů, každý 5 oblastí, velká města mají varování a nemají dostupnost.
* Predikce v souborech **beze změny** (porovnáno bajt po bajtu bez pole `doporuceni`).
* `stav_2025` = součet ročníků 2025 ve všech oblastech; žádné NaN ani dělení nulou.
* Rejstřík × dojížďka: 88 obcí má MŠ/ZŠ, ale < 20 dojíždějících (malé školy; údaj je ze sčítání 2021 a zahrnuje i SŠ). Opačná odchylka 0.

**Citlivost prahů 7.2 – výsledek je na minimální počet osob citlivý středně**

Obce se změnou barvy:
| varianta | MŠ | ZŠ | dětský lékař | praktik | senioři |
|---|---|---|---|---|---|
| min. osob × 2 | 52 | 104 | 98 | 30 | 66 |
| min. osob × 0,5 | 4 | 65 | 27 | 29 | 29 |

Obce se změnou značky ⚠:
| hranice VHD | MŠ | ZŠ | dětský lékař | praktik |
|---|---|---|---|---|
| 20 min | 44 / 119 | 70 / 186 | 213 / 396 | 161 / 396 |
| 45 min | 12 / 119 | 17 / 186 | 60 / 396 | 35 / 396 |

20 min se chová jako 15 min (vrstvy mají pásmo 15–30).

**Zpětná trefa 7.2** – pravidla semaforu na predikci z roku 2012, roky 2013–2020, proti skutečnosti (min. 5 osob, nejistota = P80 skupiny):

| skupina | směr sedí | < 500 | 500–1 999 | 2 000+ |
|---|---|---|---|---|
| 0–14 | **69 %** | 66 % | 68 % | 80 % |
| 65+ | **80 %** | 67 % | 87 % | 100 % |
| celkem | **74 %** | | | |

* Typická chyba u dětí: predikce „bez změny“, skutečnost „růst“ (94 obcí). V letech 2012–2020 dětí přibývalo víc, než model čekal; vysoká nejistota malých obcí pak ukazuje „bez změny“.
* Opačná chyba (predikce růst/pokles, skutečnost opačný směr) nenastala ani jednou.
* Do prezentace: „směr doporučení sedí v 74 % případů, u seniorů v 80 %, ve větších obcích (2 000+) v 80–100 %“.

---

## 7. Co zbývá

1. **Ruční kontrola – `rucni_kontrola.csv`**, priorita A (ovlivňuje kartu):
   * **Ústí (Přerov), MŠ:** místo výuky zapsané v okrese Vsetín → vyřazeno → „Obec nemá vlastní MŠ“. Nejspíš chyba rejstříku.
   * **Veselíčko, ZŠ:** jediná ZŠ je při dětském domově → „Obec nemá vlastní ZŠ“. Ověřit, zda přijímá i místní děti.
   * **Babice (MŠ), Vlčice (ZŠ), Měrovice nad Hanou (ZŠ):** rozpor rejstřík × vrstva.
   * Priorita B: obce, kde vyřazená škola nemění kartu (Olomouc, Přerov, Šumperk, Zábřeh, Litovel, Uničov, Tršice, Pavlov, Horka n. M., Vlčice) – jen pro informaci.
2. **Frontend:** podle `implementace-doporuceni-nextjs.md` – vyměnit `public/data/obce/*.json`, přidat kartu.
