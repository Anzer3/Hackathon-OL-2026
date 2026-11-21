"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import MapGL, {
  AttributionControl,
  Layer,
  NavigationControl,
  ScaleControl,
  Source,
  type LayerProps,
  type MapLayerMouseEvent,
  type MapRef,
} from "react-map-gl/maplibre";
import type { ExpressionSpecification, GeoJSONSource, MapGeoJSONFeature, StyleSpecification } from "maplibre-gl";
import {
  KRAJ_CENTER,
  KRAJ_GEOJSON_URL,
  OBCE_GEOJSON_URL,
  VYPLNE_GEOJSON_URL,
  type Bbox,
  type Uzemi,
} from "@/lib/obce";
import type { PrumernyVek } from "@/lib/types";
import NacitaniMapy from "./NacitaniMapy";
import { BARVA_BEZ_DAT, VEK_STUPNE } from "@/lib/vek";

/** Světlý podklad zdarma a bez API klíče. */
const MAP_STYLE = "https://tiles.openfreemap.org/styles/positron";
/** Záložní styl bez podkladu – když není internet, mapa ukáže jen obce, jejich barvy a hranice. */
const MAP_STYLE_OFFLINE: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [{ id: "pozadi", type: "background", paint: { "background-color": "#f8fafc" } }],
};
/** Jak dlouho čekat na podklad, než se použije záložní styl. */
const MAP_STYLE_TIMEOUT_MS = 4000;
/** Hranice, za které nejde mapu posunout: rozsah kraje (16,71–17,92 / 49,27–50,45) + rezerva. */
const MAX_BOUNDS: [number, number, number, number] = [16.2, 48.95, 18.4, 50.75];
const OBRYS = "#0f172a";

/*
 * Výkon: veškeré zvýraznění, viditelnost částí a barvy jdou přes „feature-state“
 * (setFeatureState na jednotlivé prvky). Styly vrstev jsou konstanty mimo komponentu,
 * takže se při pohybu myši nemění paint ani filtry a React mapu nepřekresluje.
 */

/** Jednoduchá barevná stupnice: průměrný věk z feature-state → barva. */
const BARVA_PODLE_VEKU: ExpressionSpecification = [
  "step",
  ["coalesce", ["feature-state", "vek"], -1],
  BARVA_BEZ_DAT,
  0,
  VEK_STUPNE[0].barva,
  ...VEK_STUPNE.slice(1).flatMap((s) => [s.od, s.barva]),
] as unknown as ExpressionSpecification;

const stav = (klic: string): ExpressionSpecification => ["boolean", ["feature-state", klic], false];

const OBCE_FILL: LayerProps = {
  id: "obce-fill",
  type: "fill",
  paint: {
    "fill-color": BARVA_PODLE_VEKU,
    // Obec pod kurzorem se skryje – místo ní se kreslí její zvětšená kopie (vrstva „hover-fill“)
    "fill-opacity": ["case", stav("zvetsen"), 0, 0.75],
  },
};
/** Zvětšená kopie obce pod kurzorem (geometrie se mění za běhu, barva je ve vlastnosti `barva`). */
const HOVER_FILL: LayerProps = {
  id: "hover-fill",
  type: "fill",
  // Při najetí se barva zneprůhlední
  paint: { "fill-color": ["get", "barva"], "fill-opacity": 1 },
};
/** Černá hranice zvětšené obce pod kurzorem (původní obrys vybrané obce se při hoveru skryje). */
const HOVER_LINE: LayerProps = {
  id: "hover-line",
  type: "line",
  layout: { "line-join": "round" },
  paint: {
    "line-color": OBRYS,
    "line-width": 2,
    "line-opacity": 1,
  },
};
const PRAZDNE: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };
/** O kolik se obec při najetí zvětší (1 + K) a jak dlouho to trvá. */
const ZVETSENI = 0;
const ZVETSENI_MS = 120;

type Geom = { type: string; coordinates: unknown };

/** Zvětší geometrii (polygon / multipolygon) kolem středu. */
function skaluj(c: unknown, [cx, cy]: [number, number], f: number): unknown {
  if (typeof (c as number[])[0] === "number") {
    const [x, y] = c as number[];
    return [cx + (x - cx) * f, cy + (y - cy) * f];
  }
  return (c as unknown[]).map((p) => skaluj(p, [cx, cy], f));
}

function stredGeometrie(c: unknown, b: [number, number, number, number] = [Infinity, Infinity, -Infinity, -Infinity]) {
  if (typeof (c as number[])[0] === "number") {
    const [x, y] = c as number[];
    b[0] = Math.min(b[0], x);
    b[1] = Math.min(b[1], y);
    b[2] = Math.max(b[2], x);
    b[3] = Math.max(b[3], y);
  } else (c as unknown[]).forEach((p) => stredGeometrie(p, b));
  return b;
}

/** Barva obce podle průměrného věku – stejná stupnice jako výplň mapy. */
function barvaVeku(v: number | undefined): string {
  if (v === undefined) return BARVA_BEZ_DAT;
  let barva = VEK_STUPNE[0].barva;
  for (const s of VEK_STUPNE) if (v >= s.od) barva = s.barva;
  return barva;
}
/** Výplň mezer mezi obcemi (zjednodušené hranice nesedí přesně) – barvou sousední obce, pod obcemi. */
const VYPLNE_FILL: LayerProps = {
  id: "vyplne-fill",
  type: "fill",
  paint: { "fill-color": BARVA_PODLE_VEKU, "fill-opacity": 0.75, "fill-antialias": false },
};
const OBCE_LINE: LayerProps = {
  id: "obce-line",
  type: "line",
  paint: {
    "line-color": "#ffffff",
    "line-width": 0.6,
    "line-opacity": 0.8,
  },
};
/** Obrys vybrané obce (až po kliknutí, ne při najetí myší) – samostatná vrstva úplně nahoře, aby ho nepřekryly bílé hranice sousedů. */
const hoverObrys = (id: string, source: string, viditelne: ExpressionSpecification) =>
  ({
  id,
  source,
  type: "line",
  layout: { "line-join": "round" },
  paint: {
    "line-color": "#000000",
    "line-width": 2,
    "line-opacity": ["case", viditelne, 1, 0] as unknown as ExpressionSpecification,
  },
  }) as LayerProps;
const OBCE_HOVER = hoverObrys("obce-hover", "obce", ["all", stav("vybrano"), ["!", stav("zvetsen")]] as unknown as ExpressionSpecification);
/** Hranice vybraného kraje */
const KRAJ_LINE: LayerProps = {
  id: "kraj-line",
  type: "line",
  layout: { "line-join": "round", "line-cap": "round" },
  paint: { "line-color": OBRYS, "line-width": ["interpolate", ["linear"], ["zoom"], 7, 1.2, 12, 2] },
};
const INTERAKTIVNI = ["obce-fill"];

type Prvek = { kod: string; nazev: string };

export default function MapView({
  uzemi,
  onSelect,
  fokus,
  vek,
  krajVybran,
  aktivni = true,
}: {
  /** Mapa je právě vidět (jinak se zruší hover a skryje tooltip) */
  aktivni?: boolean;
  /** `null` = žádná obec není vybraná */
  uzemi: Uzemi | null;
  /** Zda je vybraný kraj (zatím jen Olomoucký) → tučně ohraničit */
  krajVybran: boolean;
  /** `zamerit` = vystředit a přiblížit mapu na vybrané území */
  onSelect: (uzemi: Uzemi, zamerit: boolean) => void;
  /** Kam mapu zaměřit (rozsah území); `n` se mění při každém výběru */
  fokus: { bbox: Bbox; n: number } | null;
  vek: PrumernyVek | null;
}) {
  const mapRef = useRef<MapRef>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [nacteno, setNacteno] = useState(false);
  // Naše vrstvy se vkládají pod první vrstvu s popisky podkladu → názvy zůstanou nad barvami
  const [podPopisky, setPodPopisky] = useState<string | undefined>();
  const [kurzor, setKurzor] = useState(false);
  /** Mapa je vykreslená a obarvená → skryje se načítací kolečko */
  const [pripraveno, setPripraveno] = useState(false);
  /** `null` = zatím se zjišťuje, zda je podklad dostupný */
  const [styl, setStyl] = useState<string | StyleSpecification | null>(null);

  // Podklad mapy jen když je dostupný (jinak záložní styl → aplikace běží i bez internetu)
  useEffect(() => {
    const ctrl = new AbortController();
    const casovac = setTimeout(() => ctrl.abort(), MAP_STYLE_TIMEOUT_MS);
    fetch(MAP_STYLE, { signal: ctrl.signal })
      .then((r) => setStyl(r.ok ? MAP_STYLE : MAP_STYLE_OFFLINE))
      .catch(() => setStyl(MAP_STYLE_OFFLINE))
      .finally(() => clearTimeout(casovac));
    return () => {
      clearTimeout(casovac);
      ctrl.abort();
    };
  }, []);

  // Stav uložený mimo React – mění se při každém pohybu myši
  const hoverRef = useRef<Prvek | null>(null);
  const vybranoRef = useRef<string | null>(null);
  const rafRef = useRef<number | null>(null);
  const animRef = useRef<number | null>(null);
  const zvetsenaRef = useRef<string | null>(null);
  const geomRef = useRef<Map<string, { geometry: Geom; stred: [number, number] }>>(new Map());
  const vekRef = useRef(vek);
  vekRef.current = vek;
  const uzemiRef = useRef(uzemi);
  uzemiRef.current = uzemi;

  // Geometrie obcí pro zvětšenou kopii při najetí (soubor je už načtený pro mapu → z cache)
  useEffect(() => {
    const ctrl = new AbortController();
    fetch(OBCE_GEOJSON_URL, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((gj: { features: { properties: { kod: string }; geometry: Geom }[] }) => {
        geomRef.current = new Map(
          gj.features.map((f) => {
            const b = stredGeometrie(f.geometry.coordinates);
            return [String(f.properties.kod), { geometry: f.geometry, stred: [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2] }];
          }),
        );
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, []);

  const nastav = useCallback(
    (zdroj: "obce" | "vyplne", kod: string, state: Record<string, unknown>) =>
      mapRef.current?.getMap().setFeatureState({ source: zdroj, id: kod }, state),
    [],
  );

  // Vystředění a přiblížení na vybrané území (i na obec vybranou ještě před načtením mapy)
  useEffect(() => {
    if (!fokus || !nacteno) return;
    const [w, s, e, n] = fokus.bbox;
    mapRef.current?.fitBounds(
      [
        [w, s],
        [e, n],
      ],
      { padding: 48, maxZoom: 13, duration: 900 },
    );
  }, [fokus, nacteno]);

  // Barvy: průměrný věk do feature-state (jen při změně roku / dat)
  useEffect(() => {
    if (!nacteno || !vek) return;
    for (const [kod, v] of Object.entries(vek.obce)) {
      nastav("obce", kod, { vek: v });
      nastav("vyplne", kod, { vek: v });
    }
  }, [nacteno, vek, nastav]);

  // Vybraná obec: obrys
  useEffect(() => {
    if (!nacteno) return;
    if (vybranoRef.current) nastav("obce", vybranoRef.current, { vybrano: false });
    if (uzemi) nastav("obce", uzemi.obecKod, { vybrano: true });
    vybranoRef.current = uzemi?.obecKod ?? null;
  }, [nacteno, uzemi, nastav]);

  /** Obec pod kurzorem. */
  const prvekZ = (features: MapGeoJSONFeature[] | undefined): Prvek | null => {
    const f = features?.[0];
    if (!f) return null;
    const p = f.properties as { kod: string; nazev: string };
    return { kod: String(p.kod), nazev: String(p.nazev) };
  };

  /** Krátce zvětší obec pod kurzorem (`null` = vrátit zpět). */
  const zvetsi = (kod: string | null) => {
    const map = mapRef.current?.getMap();
    const src = map?.getSource("hover") as GeoJSONSource | undefined;
    if (animRef.current) cancelAnimationFrame(animRef.current);
    if (zvetsenaRef.current) nastav("obce", zvetsenaRef.current, { zvetsen: false });
    zvetsenaRef.current = null;
    const g = kod ? geomRef.current.get(kod) : undefined;
    if (!src) return;
    if (!kod || !g) {
      src.setData(PRAZDNE);
      return;
    }
    const barva = barvaVeku(vekRef.current?.obce[kod]);
    const t0 = performance.now();
    const krok = (now: number) => {
      const p = Math.min(1, (now - t0) / ZVETSENI_MS);
      src.setData({
        type: "Feature",
        properties: { barva, vybrano: uzemiRef.current?.obecKod === kod },
        geometry: {
          type: g.geometry.type,
          coordinates: skaluj(g.geometry.coordinates, g.stred, 1 + ZVETSENI * p),
        },
      } as unknown as GeoJSON.Feature);
      if (p < 1) animRef.current = requestAnimationFrame(krok);
    };
    krok(t0);
    nastav("obce", kod, { zvetsen: true });
    zvetsenaRef.current = kod;
  };

  // Výběr se změnil (klik na obec pod kurzorem) → překreslit zvětšenou kopii s obrysem
  useEffect(() => {
    if (nacteno && hoverRef.current) zvetsi(hoverRef.current.kod);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uzemi?.obecKod]);

  const zmenHover = (novy: Prvek | null) => {
    const stary = hoverRef.current;
    if (stary?.kod === novy?.kod) return;
    zvetsi(novy?.kod ?? null);
    if (stary) nastav("obce", stary.kod, { hover: false });
    if (novy) nastav("obce", novy.kod, { hover: true });
    hoverRef.current = novy;
    setKurzor(Boolean(novy));
    const t = tooltipRef.current;
    if (t) {
      t.textContent = novy?.nazev ?? "";
      t.style.display = novy ? "block" : "none";
    }
  };

  // Mapa se skryla (záložka „Další přehledy“) → zrušit hover a schovat tooltip s názvem obce
  useEffect(() => {
    if (aktivni) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    zmenHover(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aktivni]);

  const onMove = (e: MapLayerMouseEvent) => {
    const features = e.features;
    const { x, y } = e.point;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    // Max. jednou za snímek
    rafRef.current = requestAnimationFrame(() => {
      zmenHover(prvekZ(features));
      const t = tooltipRef.current;
      if (t) t.style.transform = `translate(${x}px, ${y - 10}px) translate(-50%, -100%)`;
    });
  };

  const onClick = (e: MapLayerMouseEvent) => {
    const p = prvekZ(e.features);
    if (!p) return;
    // Klik na obec → vybrat a zaměřit
    onSelect({ obecKod: p.kod }, true);
  };

  // Kolečko zmizí, až je mapa vykreslená a obarvená (jinak by se obce a podklad dokreslovaly postupně)
  useEffect(() => {
    if (!nacteno || !vek || pripraveno) return;
    const map = mapRef.current?.getMap();
    if (!map) return;
    const hotovo = () => setPripraveno(true);
    map.once("idle", hotovo);
    const pojistka = setTimeout(hotovo, 10000); // kdyby se mapa nikdy neuklidnila (pomalá síť)
    return () => {
      map.off("idle", hotovo);
      clearTimeout(pojistka);
    };
  }, [nacteno, vek, pripraveno]);

  if (!styl) return <NacitaniMapy />;

  return (
    <div className="relative h-full w-full">
      <MapGL
        ref={mapRef}
        initialViewState={{
          longitude: KRAJ_CENTER.lon,
          latitude: KRAJ_CENTER.lat,
          zoom: KRAJ_CENTER.zoom,
        }}
        mapStyle={styl}
        // Omezení pohybu: kraj + rezerva kolem něj, a nejmenší přiblížení
        maxBounds={MAX_BOUNDS}
        minZoom={7}
        style={{ width: "100%", height: "100%" }}
        attributionControl={false}
        interactiveLayerIds={INTERAKTIVNI}
        onLoad={(e) => {
          // Autorství: sbalené do tlačítka „i“ (rozbalí se kliknutím)
          e.target.getContainer().querySelector(".maplibregl-ctrl-attrib")?.classList.remove("maplibregl-compact-show");
          const vrstvy = e.target.getStyle().layers;
          setPodPopisky(vrstvy.find((l) => l.type === "symbol")?.id);
          // Názvy míst černě s bílým obrysem
          for (const l of vrstvy) {
            if (l.type !== "symbol" || !l.layout?.["text-field"]) continue;
            e.target.setPaintProperty(l.id, "text-color", "#000000");
            e.target.setPaintProperty(l.id, "text-halo-color", "#ffffff");
            e.target.setPaintProperty(l.id, "text-halo-width", 1.2);
            e.target.setPaintProperty(l.id, "text-halo-blur", 0);
          }
          setNacteno(true);
        }}
        onMouseMove={onMove}
        onMouseLeave={() => {
          if (rafRef.current) cancelAnimationFrame(rafRef.current);
          zmenHover(null);
        }}
        onClick={onClick}
        cursor={kurzor ? "pointer" : "grab"}
      >
        <AttributionControl position="bottom-left" compact customAttribution="Hranice obcí © ČÚZK (CC BY 4.0)" />
        <NavigationControl position="bottom-right" showCompass={false} />
        <ScaleControl position="bottom-right" unit="metric" />

        <Source id="vyplne" type="geojson" data={VYPLNE_GEOJSON_URL} promoteId="kod">
          <Layer {...VYPLNE_FILL} beforeId={podPopisky} />
        </Source>
        <Source id="obce" type="geojson" data={OBCE_GEOJSON_URL} promoteId="kod">
          <Layer {...OBCE_FILL} beforeId={podPopisky} />
          <Layer {...OBCE_LINE} beforeId={podPopisky} />
        </Source>
        {krajVybran && (
          <Source id="kraj" type="geojson" data={KRAJ_GEOJSON_URL}>
            <Layer {...KRAJ_LINE} beforeId={podPopisky} />
          </Source>
        )}
        {/* Obrys vybrané obce */}
        <Layer {...OBCE_HOVER} beforeId={podPopisky} />
        {/* Zvětšená kopie obce pod kurzorem – nad obrysem vybrané obce, takže ho překrývá */}
        <Source id="hover" type="geojson" data={PRAZDNE}>
          <Layer {...HOVER_FILL} beforeId={podPopisky} />
          <Layer {...HOVER_LINE} beforeId={podPopisky} />
        </Source>
      </MapGL>

      <NacitaniMapy viditelne={!pripraveno} />

      {/* Název území pod kurzorem – posouvá se přímo přes DOM, bez Reactu */}
      <div
        ref={tooltipRef}
        className="pointer-events-none absolute left-0 top-0 z-10 whitespace-nowrap rounded-sm bg-slate-900 px-2 py-1 text-xs font-semibold text-white"
        style={{ display: "none" }}
      />

      {/* Legenda – na výšku, nejstarší nahoře */}
      <div className="pointer-events-none absolute left-3 top-3 rounded-sm border border-slate-300 bg-white/95 px-3 py-2.5 text-xs text-slate-600">
        <p className="mb-2 text-sm font-semibold text-slate-800">
          Průměrný věk{vek ? ` (${vek.rok})` : ""}
        </p>
        <ul className="space-y-0.5">
          {VEK_STUPNE.map((s, i) => ({ s, i }))
            .reverse()
            .map(({ s, i }) => {
              const dalsi = VEK_STUPNE[i + 1];
              const popisek =
                i === 0 ? `méně než ${VEK_STUPNE[1].od}` : dalsi ? `${s.od}–${dalsi.od}` : `${s.od} a více`;
              return (
                <li key={i} className="flex items-center gap-2">
                  <span className="h-5 w-8 shrink-0" style={{ background: s.barva }} />
                  <span className="tabular-nums">{popisek}</span>
                </li>
              );
            })}
        </ul>
      </div>
    </div>
  );
}
