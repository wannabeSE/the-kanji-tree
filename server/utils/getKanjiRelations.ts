import { readFileSync } from "node:fs";
import { join } from "node:path";

interface KanjiIdsEntry {
  ids: string;
  components: string[];
  stroke_count: number;
}

type KanjiIdsTable = Record<string, KanjiIdsEntry>;

let cachedTable: KanjiIdsTable | null = null;

function loadKanjiIds(): KanjiIdsTable {
  if (cachedTable) return cachedTable;
  const path = join(process.cwd(), "server/assets/kanji-ids.json");
  cachedTable = JSON.parse(readFileSync(path, "utf-8")) as KanjiIdsTable;
  return cachedTable;
}

export function getKanjiRelations(char: string): {
  parents: string[];
  children: string[];
} {
  const table = loadKanjiIds();
  const entry = table[char];

  const parents = entry?.components.filter((c) => table[c]) ?? [];

  const children = Object.entries(table)
    .filter(([k, v]) => k !== char && v.components.includes(char))
    .map(([k]) => k);

  return { parents, children };
}
