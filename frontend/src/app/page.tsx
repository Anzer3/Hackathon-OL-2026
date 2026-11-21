"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import SidePanel, { type LoadStatus } from "@/components/SidePanel";
import DoporuceniView from "@/components/DoporuceniView";
import GrafyView from "@/components/GrafyView";
import NacitaniMapy from "@/components/NacitaniMapy";
import Navigace, { type Zalozka } from "@/components/Navigace";
import TopBar from "@/components/TopBar";
import { vypocitejVypis } from "@/lib/adapter";
import { nactiKraj, nactiObec, nactiPrumernyVek, nactiSeznamObci } from "@/lib/data";
import { KRAJ, PREZENTACE, ROK_DO, ROK_OD, nactiRozsahyObci, type Bbox, type Uzemi } from "@/lib/obce";
import type { DataObce, ObecZaznam, PrumernyVek, PrumernyVekSoubor } from "@/lib/types";

// MapLibre potřebuje prohlížeč → bez SSR
const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => <NacitaniMapy />,
});

/** Zatím je k dispozici jen Olomoucký kraj, a ten je vždy vybraný. */
const KRAJ_VYBRAN = true;

export default function Home() {
  /** `null` = žádná obec není vybraná → zobrazují se data za celý kraj */
  const [uzemi, setUzemi] = useState<Uzemi | null>(
    PREZENTACE.vychoziObec ? { obecKod: PREZENTACE.vychoziObec } : null,
  );
  const [rok, setRok] = useState(ROK_OD);
  const [obce, setObce] = useState<ObecZaznam[]>([]);
  const [rozsahy, setRozsahy] = useState<Map<string, Bbox>>(new Map());
  const [fokus, setFokus] = useState<{ bbox: Bbox; n: number } | null>(null);
  const [status, setStatus] = useState<LoadStatus>({ kind: "loading" });
  /** Data vybraného území (obec nebo kraj) ve formátu datového kontraktu */
  const [data, setData] = useState<DataObce | null>(null);
  const [vekSoubor, setVekSoubor] = useState<PrumernyVekSoubor | null>(null);
  /** Šířka levého panelu (px) – nastavuje se tažením za jeho pravý okraj */
  const [sirkaPanelu, setSirkaPanelu] = useState(420);
  const [zalozka, setZalozka] = useState<Zalozka>("mapa");

  const zacniTah = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const x0 = e.clientX;
    const w0 = sirkaPanelu;
    const max = () => Math.max(320, window.innerWidth - 320);
    const onMove = (ev: PointerEvent) => setSirkaPanelu(Math.min(max(), Math.max(320, w0 + ev.clientX - x0)));
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  // Při startu: seznam obcí (výběr), průměrný věk (barvy mapy), rozsahy obcí (přiblížení mapy)
  useEffect(() => {
    nactiSeznamObci()
      .then(setObce)
      .catch(() => setStatus({ kind: "error", message: "Seznam obcí se nepodařilo načíst (data/obce.json)." }));
    nactiPrumernyVek().then(setVekSoubor).catch(() => {});
    const ctrl = new AbortController();
    nactiRozsahyObci(ctrl.signal).then(setRozsahy).catch(() => {});
    return () => ctrl.abort();
  }, []);

  const obecPodleKodu = useMemo(() => new Map(obce.map((o) => [o.kod, o])), [obce]);
  /** Rozsah celého kraje = sjednocení rozsahů obcí */
  const krajBbox = useMemo<Bbox | null>(
    () =>
      rozsahy.size
        ? [...rozsahy.values()].reduce<Bbox>(
            (b, r) => [Math.min(b[0], r[0]), Math.min(b[1], r[1]), Math.max(b[2], r[2]), Math.max(b[3], r[3])],
            [Infinity, Infinity, -Infinity, -Infinity],
          )
        : null,
    [rozsahy],
  );

  const zamer = (bbox: Bbox | undefined | null) => {
    if (bbox) setFokus((f) => ({ bbox, n: (f?.n ?? 0) + 1 }));
  };

  // Po načtení hranic přiblížit na předvybranou obec
  useEffect(() => {
    if (PREZENTACE.vychoziObec) zamer(rozsahy.get(PREZENTACE.vychoziObec));
  }, [rozsahy]);

  /** Zruší výběr obce → zpět na data za celý kraj a pohled na celý kraj. */
  const zpetNaKraj = () => {
    setUzemi(null);
    zamer(krajBbox);
  };

  /** Vybere obec; se `zamerit` mapu vystředí a přiblíží na její rozsah. Obce bez dat (Libavá) nejdou vybrat. */
  const vyber = (u: Uzemi, zamerit = true) => {
    if (obce.length && !obecPodleKodu.has(u.obecKod)) return;
    setUzemi(u);
    if (zamerit) zamer(rozsahy.get(u.obecKod));
  };

  // Data vybraného území – soubor obce se načte až při výběru (načtené se pamatují v src/lib/data.ts)
  useEffect(() => {
    let platne = true;
    setData(null);
    setStatus({ kind: "loading" });
    (uzemi ? nactiObec(uzemi.obecKod) : nactiKraj())
      .then((d) => {
        if (!platne) return;
        setData(d);
        setStatus({ kind: "done" });
      })
      .catch(() => {
        if (platne) setStatus({ kind: "error", message: "Data obce se nepodařilo načíst. Zkuste to prosím znovu." });
      });
    return () => {
      platne = false;
    };
  }, [uzemi]);

  // Změna roku nic nenačítá – jen znovu zavolá adaptér
  const vypis = useMemo(() => (data ? vypocitejVypis(data, rok) : null), [data, rok]);

  // Průměrný věk všech obcí ve zvoleném roce (barvy mapy)
  const vek = useMemo<PrumernyVek | null>(() => {
    if (!vekSoubor) return null;
    const i = vekSoubor.roky.indexOf(rok);
    return { rok, obce: Object.fromEntries(Object.entries(vekSoubor.obce).map(([kod, r]) => [kod, r[i]])) };
  }, [vekSoubor, rok]);

  const rychleVolby = useMemo(
    () => PREZENTACE.rychleVolby.map((k) => obecPodleKodu.get(k)).filter((o): o is ObecZaznam => Boolean(o)),
    [obecPodleKodu],
  );

  return (
    <main className="flex h-dvh flex-col-reverse md:flex-row">
      <aside
        className="relative h-[50dvh] w-full shrink-0 border-t border-slate-300 bg-white md:h-full md:w-[var(--panel-w)] md:border-r md:border-t-0"
        style={{ "--panel-w": `${sirkaPanelu}px` } as React.CSSProperties}
      >
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Změnit šířku panelu"
          title="Tažením změníte šířku panelu"
          onPointerDown={zacniTah}
          onDoubleClick={() => setSirkaPanelu(420)}
          className="absolute inset-y-0 -right-1 z-20 hidden w-2 cursor-col-resize touch-none transition-colors hover:bg-slate-400/50 active:bg-slate-500/60 md:block"
        />
        <SidePanel
          bezVyberu={uzemi === null}
          obec={uzemi ? obecPodleKodu.get(uzemi.obecKod) : undefined}
          onZpetNaKraj={zpetNaKraj}
          rok={rok}
          rokOd={ROK_OD}
          rokDo={ROK_DO}
          onRokChange={setRok}
          status={status}
          vypis={vypis}
          rychleVolby={rychleVolby}
          onRychlaVolba={(kod) => vyber({ obecKod: kod })}
        />
      </aside>
      <div className="flex min-h-0 flex-1 flex-col">
        <TopBar obce={obce} onSelect={vyber} />
        <Navigace aktivni={zalozka} onZmena={setZalozka} />
        <div className="relative min-h-0 flex-1">
          <MapView uzemi={uzemi} onSelect={vyber} fokus={fokus} vek={vek} krajVybran={KRAJ_VYBRAN} aktivni={zalozka === "mapa"} />
          {/* Mapa zůstává načtená pod grafy, aby se po návratu nemusela znovu stavět */}
          {zalozka === "grafy" && (
            <div className="absolute inset-0 z-30 bg-white">
              <GrafyView
                nazev={uzemi ? (obecPodleKodu.get(uzemi.obecKod)?.nazev ?? "…") : KRAJ.nazev}
                rok={rok}
                vypis={status.kind === "done" ? vypis : null}
              />
            </div>
          )}
          {zalozka === "doporuceni" && (
            <div className="absolute inset-0 z-30 bg-white">
              <DoporuceniView
                nazev={uzemi ? (obecPodleKodu.get(uzemi.obecKod)?.nazev ?? "…") : KRAJ.nazev}
                bezVyberu={uzemi === null}
                data={status.kind === "done" ? data?.doporuceni : undefined}
              />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
