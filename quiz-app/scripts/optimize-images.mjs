import sharp from 'sharp';
import { readdirSync, statSync, readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';

const SRC_DIR = 'src';
const PUBLIC_DIR = 'public';

// Recursively collect all source files
function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

// Find every referenced image, two ways:
//  1. Literal /assets/....png paths in JSX/CSS
//  2. The A('name.png') helper in Box.jsx -> /assets/figma/name.png
const refRe = /assets\/[A-Za-z0-9 _.()/-]+\.(?:png|jpe?g)/gi;
const aRe = /\bA\(\s*['"]([^'"]+\.(?:png|jpe?g))['"]\s*\)/gi;
const refs = new Set();
for (const f of walk(SRC_DIR)) {
  if (!/\.(jsx?|css)$/.test(f)) continue;
  const text = readFileSync(f, 'utf8');
  let m;
  while ((m = refRe.exec(text))) refs.add(m[0]);
  while ((m = aRe.exec(text))) refs.add(`assets/figma/${m[1]}`);
}

console.log(`Found ${refs.size} referenced images\n`);

let beforeTotal = 0, afterTotal = 0;
const results = [];

for (const ref of [...refs].sort()) {
  const inPath = join(PUBLIC_DIR, ref);
  if (!existsSync(inPath)) { console.log(`MISSING: ${inPath}`); continue; }
  const outPath = inPath.replace(/\.(png|jpe?g)$/i, '.webp');
  const before = statSync(inPath).size;
  const meta = await sharp(inPath).metadata();

  let pipeline = sharp(inPath);
  // Only downscale if absurdly large; keep crisp otherwise.
  if (meta.width > 1920) pipeline = pipeline.resize({ width: 1920, withoutEnlargement: true });
  await pipeline.webp({ quality: 80, effort: 6 }).toFile(outPath);

  const after = statSync(outPath).size;
  beforeTotal += before; afterTotal += after;
  results.push({ ref, dim: `${meta.width}x${meta.height}`, before, after });
}

const mb = (b) => (b / 1048576).toFixed(2) + ' MB';
const kb = (b) => (b / 1024).toFixed(0) + ' KB';
for (const r of results) {
  console.log(`${r.ref}\n   ${r.dim}  ${kb(r.before)} -> ${kb(r.after)}  (-${(100 - r.after / r.before * 100).toFixed(0)}%)`);
}
console.log(`\nTOTAL: ${mb(beforeTotal)} -> ${mb(afterTotal)}  (-${(100 - afterTotal / beforeTotal * 100).toFixed(1)}%)`);
