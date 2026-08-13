import fs from "node:fs/promises";

export async function loadState(path) {
  try {
    const raw = await fs.readFile(path, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === "ENOENT") return {};
    throw err;
  }
}

export async function saveState(path, state) {
  await fs.writeFile(path, JSON.stringify(state, null, 2), "utf8");
}
