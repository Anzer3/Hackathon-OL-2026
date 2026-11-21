// Geometry helpers: segment grid index, nearest point on other features' boundaries.
const CELL = 0.005;

function rings(geom) {
  if (geom.type === 'Polygon') return geom.coordinates;
  if (geom.type === 'MultiPolygon') return geom.coordinates.flat();
  return [];
}

function buildIndex(features) {
  const grid = new Map();
  const segs = []; // [fi, ax, ay, bx, by]
  features.forEach((f, fi) => {
    for (const r of rings(f.geometry)) {
      for (let k = 0; k < r.length - 1; k++) {
        const [ax, ay] = r[k], [bx, by] = r[k + 1];
        const si = segs.length;
        segs.push([fi, ax, ay, bx, by]);
        const x0 = Math.floor(Math.min(ax, bx) / CELL), x1 = Math.floor(Math.max(ax, bx) / CELL);
        const y0 = Math.floor(Math.min(ay, by) / CELL), y1 = Math.floor(Math.max(ay, by) / CELL);
        for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) {
          const key = x + ':' + y;
          let a = grid.get(key); if (!a) grid.set(key, (a = []));
          a.push(si);
        }
      }
    }
  });
  return { grid, segs };
}

// Distances in "metres-ish": scale lon by cos(lat).
const KX = Math.cos((49.7 * Math.PI) / 180);

function nearest(idx, fi, px, py, tol, sameOk = false) {
  const cx = Math.floor(px / CELL), cy = Math.floor(py / CELL);
  let best = null, bd = tol * tol;
  for (let x = cx - 1; x <= cx + 1; x++) for (let y = cy - 1; y <= cy + 1; y++) {
    const a = idx.grid.get(x + ':' + y); if (!a) continue;
    for (const si of a) {
      const [sf, ax, ay, bx, by] = idx.segs[si];
      if (!sameOk && sf === fi) continue;
      const dx = (bx - ax) * KX, dy = by - ay;
      const qx = (px - ax) * KX, qy = py - ay;
      const L = dx * dx + dy * dy;
      let t = L ? (qx * dx + qy * dy) / L : 0;
      t = Math.max(0, Math.min(1, t));
      const ex = qx - t * dx, ey = qy - t * dy;
      const d = ex * ex + ey * ey;
      if (d < bd) {
        bd = d;
        // snap to an endpoint if very close to it, to make vertices identical
        if (t < 1e-9) best = [ax, ay];
        else if (t > 1 - 1e-9) best = [bx, by];
        else best = [ax + t * (bx - ax), ay + t * (by - ay)];
        best.d = Math.sqrt(d);
        best.sf = sf;
      }
    }
  }
  return best;
}

module.exports = { rings, buildIndex, nearest, KX };
