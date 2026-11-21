// Close gaps between neighbouring polygons by snapping each vertex onto the nearest
// boundary of another feature (within TOL metres), then derive the outer outline of the region.
// Mezery, které přichycení nezalepí, najde holes.js a uloží do vyplne-olomoucky-kraj.geojson.
// usage (z adresáře frontend): node scripts/hranice/snap.js public/obce-olomoucky-kraj.geojson public
const fs = require('fs');
const path = require('path');
const { rings, buildIndex, nearest } = require('./geo');
const { findHoles } = require('./holes');
const DEG = 111320;
const r5 = (v) => Math.round(v * 1e6) / 1e6;

function snapPasses(features, tolM, passes, filterOther) {
  let moved = 0;
  for (let p = 0; p < passes; p++) {
    const idx = buildIndex(features);
    features.forEach((ft, fi) => {
      for (const r of rings(ft.geometry)) {
        for (let k = 0; k < r.length; k++) {
          const [x, y] = r[k];
          const n = nearest(idx, fi, x, y, tolM / DEG);
          if (!n || n.d === 0) continue;
          if (filterOther && !filterOther(fi, n.sf)) continue;
          r[k] = [r5(n[0]), r5(n[1])];
          moved++;
        }
        r[r.length - 1] = r[0]; // keep ring closed
      }
    });
  }
  return moved;
}

/** Snap features of `a` onto boundaries in `b` (separate collections). */
function snapOnto(a, b, tolM) {
  const idx = buildIndex(b);
  let moved = 0;
  for (const ft of a) for (const r of rings(ft.geometry)) {
    for (let k = 0; k < r.length; k++) {
      const n = nearest(idx, -1, r[k][0], r[k][1], tolM / DEG);
      if (n && n.d > 0) { r[k] = [r5(n[0]), r5(n[1])]; moved++; }
    }
    r[r.length - 1] = r[0];
  }
  return moved;
}

/** Segments with no other feature's boundary next to them = outer edge of the region. */
function outline(features) {
  const idx = buildIndex(features);
  const tol = 100 / DEG;
  const lines = [];
  let cur = null;
  features.forEach((ft, fi) => {
    for (const r of rings(ft.geometry)) {
      cur = null;
      for (let k = 0; k < r.length - 1; k++) {
        const a = r[k], b = r[k + 1];
        const pts = [0.25, 0.5, 0.75].map((t) => [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]);
        const outer = pts.some(([x, y]) => !nearest(idx, fi, x, y, tol));
        if (outer) {
          if (cur && cur[cur.length - 1] === a) cur.push(b);
          else lines.push((cur = [a, b]));
        } else cur = null;
      }
    }
  });
  return {
    type: 'FeatureCollection',
    features: [{ type: 'Feature', properties: { nazev: 'Olomoucký kraj' }, geometry: { type: 'MultiLineString', coordinates: lines } }],
  };
}

const [obceF, outDir] = process.argv.slice(2);
const obce = JSON.parse(fs.readFileSync(obceF));

console.log('obce moved', snapPasses(obce.features, 45, 6));

const holes = findHoles(obce.features);
console.log('holes', holes.count, 'cells', holes.cells, 'area m2', holes.areaM2, 'grid', holes.grid);
const kraj = outline(obce.features);
console.log('outline lines', kraj.features[0].geometry.coordinates.length);

fs.writeFileSync(path.join(outDir, path.basename(obceF)), JSON.stringify(obce));
fs.writeFileSync(path.join(outDir, 'kraj-olomoucky.geojson'), JSON.stringify(kraj));
fs.writeFileSync(path.join(outDir, 'vyplne-olomoucky-kraj.geojson'), JSON.stringify(holes.out));
