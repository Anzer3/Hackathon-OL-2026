// Find holes ("území nikoho") inside the region on a raster: cells not covered by any obec and not
// reachable from the outside are holes. Each hole is assigned to the obec it borders the most and
// written as rectangles (one per row run), slightly enlarged so they tuck under the neighbours.
const { rings, KX } = require('./geo');
const DEG = 111320;

function findHoles(features, { cellM = 20, grow = 0.6 } = {}) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const f of features) for (const r of rings(f.geometry)) for (const [x, y] of r) {
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  const dx = cellM / (DEG * KX), dy = cellM / DEG;
  x0 -= 2 * dx; y0 -= 2 * dy; x1 += 2 * dx; y1 += 2 * dy;
  const W = Math.ceil((x1 - x0) / dx), H = Math.ceil((y1 - y0) / dy);
  const id = new Int16Array(W * H); // 0 = empty, fi+1 = obec

  // scanline fill (even-odd over all rings of the feature), cell centres
  features.forEach((f, fi) => {
    const rs = rings(f.geometry);
    let fy0 = Infinity, fy1 = -Infinity;
    for (const r of rs) for (const [, y] of r) { if (y < fy0) fy0 = y; if (y > fy1) fy1 = y; }
    const r0 = Math.max(0, Math.floor((fy0 - y0) / dy)), r1 = Math.min(H - 1, Math.ceil((fy1 - y0) / dy));
    for (let row = r0; row <= r1; row++) {
      const cy = y0 + (row + 0.5) * dy;
      const xs = [];
      for (const r of rs) for (let k = 0; k < r.length - 1; k++) {
        const [ax, ay] = r[k], [bx, by] = r[k + 1];
        if ((ay > cy) !== (by > cy)) xs.push(ax + ((cy - ay) / (by - ay)) * (bx - ax));
      }
      xs.sort((a, b) => a - b);
      for (let i = 0; i + 1 < xs.length; i += 2) {
        const c0 = Math.max(0, Math.ceil((xs[i] - x0) / dx - 0.5)), c1 = Math.min(W - 1, Math.floor((xs[i + 1] - x0) / dx - 0.5));
        for (let c = c0; c <= c1; c++) id[row * W + c] = fi + 1;
      }
    }
  });

  // flood the outside (-1) from the border
  const q = new Int32Array(W * H);
  let qh = 0, qt = 0;
  const push = (i) => { if (id[i] === 0) { id[i] = -1; q[qt++] = i; } };
  for (let c = 0; c < W; c++) { push(c); push((H - 1) * W + c); }
  for (let r = 0; r < H; r++) { push(r * W); push(r * W + W - 1); }
  while (qh < qt) {
    const i = q[qh++], c = i % W;
    if (c > 0) push(i - 1); if (c < W - 1) push(i + 1);
    if (i >= W) push(i - W); if (i < (H - 1) * W) push(i + W);
  }

  // label holes, pick owner, emit row-run rectangles
  const holesByOwner = new Map();
  let count = 0, cells = 0;
  const r6 = (v) => Math.round(v * 1e6) / 1e6;
  for (let s = 0; s < W * H; s++) {
    if (id[s] !== 0) continue;
    qh = qt = 0; id[s] = -2; q[qt++] = s;
    const votes = new Map();
    while (qh < qt) {
      const i = q[qh++], c = i % W;
      for (const j of [c > 0 ? i - 1 : -1, c < W - 1 ? i + 1 : -1, i - W, i + W]) {
        if (j < 0 || j >= W * H) continue;
        if (id[j] === 0) { id[j] = -2; q[qt++] = j; }
        else if (id[j] > 0) votes.set(id[j] - 1, (votes.get(id[j] - 1) ?? 0) + 1);
      }
    }
    if (!votes.size) continue;
    const owner = [...votes.entries()].reduce((a, b) => (b[1] > a[1] ? b : a))[0];
    const comp = Array.from(q.subarray(0, qt)).sort((a, b) => a - b);
    const polys = holesByOwner.get(owner) ?? holesByOwner.set(owner, []).get(owner);
    for (let k = 0; k < comp.length; ) {
      const row = Math.floor(comp[k] / W);
      const c0 = comp[k] % W;
      let c1 = c0;
      while (k + 1 < comp.length && comp[k + 1] === comp[k] + 1 && Math.floor(comp[k + 1] / W) === row) { k++; c1++; }
      k++;
      const ax = r6(x0 + (c0 - grow) * dx), bx = r6(x0 + (c1 + 1 + grow) * dx);
      const ay = r6(y0 + (row - grow) * dy), by = r6(y0 + (row + 1 + grow) * dy);
      polys.push([[[ax, ay], [bx, ay], [bx, by], [ax, by], [ax, ay]]]);
    }
    count++; cells += qt;
  }

  const out = {
    type: 'FeatureCollection',
    features: [...holesByOwner.entries()].map(([fi, polys]) => ({
      type: 'Feature',
      id: Number(features[fi].properties.kod),
      properties: { kod: features[fi].properties.kod },
      geometry: { type: 'MultiPolygon', coordinates: polys },
    })),
  };
  return { out, count, cells, areaM2: cells * cellM * cellM, grid: [W, H] };
}

module.exports = { findHoles };
