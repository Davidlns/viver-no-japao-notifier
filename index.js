import path from "node:path";
import { fileURLToPath } from "node:url";
import "dotenv/config";
import { loadState, saveState } from "./lib/state.js";
import * as youtube from "./checkers/youtube.js";
import * as news from "./checkers/news.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATE_PATH = path.resolve(__dirname, process.env.STATE_FILE || "state.json");

const CHECKERS = [
  { key: "youtube", run: youtube.check },
  { key: "news", run: news.check },
];

async function main() {
  console.log(`[${new Date().toISOString()}] Iniciando verificação...`);

  const state = await loadState(STATE_PATH);
  let changed = false;

  const results = await Promise.allSettled(
    CHECKERS.map(async (checker) => ({
      key: checker.key,
      ...(await checker.run(state[checker.key])),
    }))
  );

  results.forEach((result, i) => {
    const key = CHECKERS[i].key;
    if (result.status === "fulfilled") {
      console.log(`[${key}] ${result.value.message}`);
      if (result.value.state !== undefined) {
        state[key] = result.value.state;
        changed = true;
      }
    } else {
      console.error(`[${key}] erro: ${result.reason.message}`);
    }
  });

  if (changed) {
    await saveState(STATE_PATH, state);
  }
}

main().catch((err) => {
  console.error(`[erro] ${err.message}`);
  process.exit(1);
});
