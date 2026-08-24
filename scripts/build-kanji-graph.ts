/**
 * Fetches CHISE IDS + Joyo kanji and writes parent/child graph JSON.
 *
 * Usage: npm run build:kanji-graph
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { ofetch as $fetch } from "ofetch";
import { KANJI_OVERIDES } from "./kanji-overrides";

const IDS_URL =
  "https://gitlab.chise.org/CHISE/ids/-/raw/master/IDS-UCS-Basic.txt";
const JOYO_URL = "https://kanjiapi.dev/v1/kanji/joyo";
const JLPT_URL = (level: number) =>
  `https://kanjiapi.dev/v1/kanji/jlpt-${level}`;

const IDC_MIN = 0x2ff0;
const IDC_MAX = 0x2fff;
const CDP_ENTITY = /&[^;]+;/g;

/** Used as parents they flood the graph; still allowed as the "added" stroke. */
const STROKE_PRIMITIVES = new Set(["一", "丨", "丶", "丿", "乙", "亅"]);

export interface GraphNode {
  parents: string[];
  children: string[];
  ids: string | null;
  /** parent → glyphs added to that parent to form this character */
  addedFrom: Record<string, string[]>;
}

function isIdeographicDescriptionChar(code: number): boolean {
  return code >= IDC_MIN && code <= IDC_MAX;
}

/** Glyphs in an IDS string, including radicals; keeps duplicates (林 = 木+木). */
function extractGlyphs(ids: string): string[] {
  const stripped = ids.replace(CDP_ENTITY, "");
  const glyphs: string[] = [];
  for (const char of stripped) {
    const code = char.codePointAt(0);
    if (code == null) continue;
    if (isIdeographicDescriptionChar(code)) continue;
    if (/\s/.test(char)) continue;
    glyphs.push(char);
  }
  return glyphs;
}

function addedRelativeTo(parent: string, glyphs: string[]): string[] {
  const remaining = [...glyphs];
  const index = remaining.indexOf(parent);
  if (index >= 0) remaining.splice(index, 1);
  return remaining;
}

async function buildKanjiGraph() {
  console.log("Fetching Joyo kanji list...");
  const joyoList = await $fetch<string[]>(JOYO_URL);
  const joyoSet = new Set(joyoList);

  console.log("Fetching CHISE IDS dataset...");
  const idsRaw = await $fetch<string>(IDS_URL);

  const graph: Record<string, GraphNode> = {};

  for (const char of joyoSet) {
    graph[char] = { parents: [], children: [], ids: null, addedFrom: {} };
  }

  const addEdge = (parent: string, child: string, added: string[]) => {
    if (!joyoSet.has(parent) || !joyoSet.has(child) || parent === child) return;
    if (STROKE_PRIMITIVES.has(parent)) return;

    const parentNode = graph[parent];
    const childNode = graph[child];
    if (!parentNode || !childNode) return;

    if (!parentNode.children.includes(child)) parentNode.children.push(child);
    if (!childNode.parents.includes(parent)) childNode.parents.push(parent);
    if (!childNode.addedFrom[parent]) childNode.addedFrom[parent] = added;
  };

  const lines = idsRaw.split(/\r?\n/);
  for (const line of lines) {
    if (line.startsWith("#") || line.startsWith(";;") || !line.trim()) continue;
    const parts = line.split("\t");
    if (parts.length < 3) continue;

    const char = parts[1];
    const idsSequence = parts[2];
    if (!char || !idsSequence || !joyoSet.has(char)) continue;

    const node = graph[char];
    if (node && !node.ids) node.ids = idsSequence;

    const glyphs = extractGlyphs(idsSequence);

    for (const subChar of glyphs) {
      if (joyoSet.has(subChar) && subChar !== char) {
        addEdge(subChar, char, addedRelativeTo(subChar, glyphs));
      }
    }
  }

  for (const [parent, children] of Object.entries(KANJI_OVERIDES)) {
    for (const { child, added } of children) {
      addEdge(parent, child, added);
    }
  }

  for (const node of Object.values(graph)) {
    node.parents.sort();
    node.children.sort();
  }

  const outputPath = resolve(process.cwd(), "server/assets/kanji-graph.json");
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(graph, null, 2)}\n`, "utf-8");
  console.log(`Successfully generated Kanji graph at ${outputPath}`);

  await buildJlptMap();
}

async function buildJlptMap() {
  console.log("Fetching JLPT kanji lists...");
  const mapping: Record<string, number> = {};

  const lists = await Promise.all(
    [1, 2, 3, 4, 5].map(async (level) => ({
      level,
      chars: await $fetch<string[]>(JLPT_URL(level)),
    })),
  );

  for (const { level, chars } of lists) {
    for (const char of chars) mapping[char] = level;
  }

  const outputPath = resolve(process.cwd(), "server/assets/jlpt.json");
  writeFileSync(outputPath, `${JSON.stringify(mapping)}\n`, "utf-8");
  console.log(
    `Successfully generated JLPT map (${Object.keys(mapping).length} kanji) at ${outputPath}`,
  );
}

buildKanjiGraph().catch((err) => {
  console.error(err);
  process.exit(1);
});
