// Generate Chrome Web Store extension icons from the source SVG.
// Rasterizes icon/app-icon.svg to transparent-background PNGs at 16/48/128.
// Run: node scripts/gen-icons.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import sharp from "sharp";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const svg = readFileSync(resolve(root, "icon/app-icon.svg"));
const sizes = [16, 48, 128];

for (const size of sizes) {
  const out = resolve(root, `public/icons/icon-${size}.png`);
  await sharp(svg, { density: 384 })
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(out);
  console.log(`wrote ${out}`);
}
