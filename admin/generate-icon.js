// Requer `npm install --no-save sharp` antes de rodar — ferramenta pontual.
import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const petal = `M256,266 C210,190 190,100 228,55 C240,42 256,56 256,80 C256,56 272,42 284,55 C322,100 302,190 256,266 Z`;

const petals = [0, 72, 144, 216, 288]
  .map((deg) => `<path d="${petal}" fill="#f2a6c0" stroke="#c6547c" stroke-width="4" transform="rotate(${deg} 256 256)"/>`)
  .join("\n");

const svg = `<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <circle cx="256" cy="256" r="256" fill="#221820"/>
  ${petals}
  <circle cx="256" cy="256" r="24" fill="#f2947c"/>
  <circle cx="256" cy="256" r="11" fill="#efa0c3"/>
</svg>`;

const outPath = path.resolve(__dirname, "../server-icon.png");
await sharp(Buffer.from(svg)).resize(512, 512).png().toFile(outPath);
console.log("gerado:", outPath);
