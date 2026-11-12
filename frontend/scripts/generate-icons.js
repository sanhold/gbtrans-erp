// Génère les icônes PWA (any + maskable) depuis public/brand/logo-icon.png.
// Utilise pngjs (déjà présent en dépendance transitive) : `node scripts/generate-icons.js`
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const root = path.join(__dirname, '..', 'public');
const src = PNG.sync.read(fs.readFileSync(path.join(root, 'brand', 'logo-icon.png')));
const BG = [17, 45, 78]; // marine du logo (#112d4e), pour un fond sans raccord visible

// Rognage sur le carré arrondi du logo (marge transparente exclue)
let minX = src.width, minY = src.height, maxX = 0, maxY = 0;
for (let y = 0; y < src.height; y++) for (let x = 0; x < src.width; x++) {
  if (src.data[(y * src.width + x) * 4 + 3] > 200) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
}
const cw = maxX - minX + 1, ch = maxY - minY + 1;

// Rendu : fond marine pleine page + logo à `ratio` de la taille, moyenne par boîte (anti-aliasing)
function render(size, ratio) {
  const out = new PNG({ width: size, height: size });
  const inner = Math.round(size * ratio), off = Math.round((size - inner) / 2);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const o = (y * size + x) * 4;
    let r = BG[0], g = BG[1], b = BG[2];
    const ix = x - off, iy = y - off;
    if (ix >= 0 && iy >= 0 && ix < inner && iy < inner) {
      const x0 = minX + Math.floor((ix * cw) / inner), x1 = minX + Math.max(Math.floor(((ix + 1) * cw) / inner), Math.floor((ix * cw) / inner) + 1);
      const y0 = minY + Math.floor((iy * ch) / inner), y1 = minY + Math.max(Math.floor(((iy + 1) * ch) / inner), Math.floor((iy * ch) / inner) + 1);
      let sr = 0, sg = 0, sb = 0, sa = 0, n = 0;
      for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) {
        const p = (yy * src.width + xx) * 4, a = src.data[p + 3] / 255;
        sr += src.data[p] * a; sg += src.data[p + 1] * a; sb += src.data[p + 2] * a; sa += a; n++;
      }
      const a = sa / n;
      r = (sr / n) + BG[0] * (1 - a); g = (sg / n) + BG[1] * (1 - a); b = (sb / n) + BG[2] * (1 - a);
    }
    out.data[o] = r; out.data[o + 1] = g; out.data[o + 2] = b; out.data[o + 3] = 255;
  }
  return PNG.sync.write(out);
}

const w = (name, size, ratio) => { fs.writeFileSync(path.join(root, 'icons', name), render(size, ratio)); console.log(name); };
w('icon-maskable-192.png', 192, 0.64);
w('icon-maskable-512.png', 512, 0.64);
w('icon-192.png', 192, 0.9);
w('icon-512.png', 512, 0.9);
w('apple-touch-icon.png', 180, 1);
