// Requer `npm install --no-save sharp` antes de rodar — não é dependência do bot,
// só ferramenta pontual pra rasterizar SVG em PNG pros emojis customizados.
import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "../emoji-assets");

const emojis = {
  sakura_sim: `<svg viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg"><circle cx="28" cy="28" r="26" fill="#f2a6c0"/><path d="M18 29l7 7 14-15" stroke="#3a2430" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  sakura_amei: `<svg viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg"><circle cx="28" cy="28" r="26" fill="#c6547c"/><path d="M28 41c-9-6-14-11-14-17a8 8 0 0 1 14-5 8 8 0 0 1 14 5c0 6-5 11-14 17z" fill="#fff8f6"/></svg>`,
  fuji_nao: `<svg viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg"><circle cx="28" cy="28" r="26" fill="#c9a6de"/><path d="M20 20l16 16M36 20L20 36" stroke="#3a2430" stroke-width="4" fill="none" stroke-linecap="round"/></svg>`,
  matcha_boa: `<svg viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg"><circle cx="28" cy="28" r="26" fill="#9bbf8a"/><path d="M28 14c6 4 10 10 10 16a10 10 0 0 1-20 0c0-6 4-12 10-16z" fill="#221820"/></svg>`,
  coral_novo: `<svg viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg"><circle cx="28" cy="28" r="26" fill="#f2947c"/><path d="M28 12l4 10 10 2-8 7 2 11-8-6-8 6 2-11-8-7 10-2z" fill="#3a2430"/></svg>`,
  senpai_top: `<svg viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg"><circle cx="28" cy="28" r="26" fill="#efa0c3"/><text x="28" y="37" font-family="sans-serif" font-weight="900" font-size="24" fill="#3a2430" text-anchor="middle">先</text></svg>`,
};

await import("node:fs/promises").then((fs) => fs.mkdir(OUT_DIR, { recursive: true }));

for (const [name, svg] of Object.entries(emojis)) {
  const outPath = path.join(OUT_DIR, `${name}.png`);
  await sharp(Buffer.from(svg)).resize(256, 256).png().toFile(outPath);
  console.log(`gerado: ${outPath}`);
}
