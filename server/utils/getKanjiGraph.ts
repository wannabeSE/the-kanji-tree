import kanjiGraph from "../assets/kanji-graph.json";

export interface KanjiGraphNode {
  parents: string[];
  children: string[];
  ids?: string | null;
  addedFrom?: Record<string, string[]>;
}

export interface KanjiTransform {
  parent: string;
  added: string[];
  addedLabels: string[];
  child: string;
  formula: string;
}

export type KanjiGraph = Record<string, KanjiGraphNode>;

const STROKE_PRIMITIVES = new Set(["一", "丨", "丶", "丿", "乙", "亅"]);

const graph = kanjiGraph as KanjiGraph;

export function getKanjiGraph(char: string): KanjiGraphNode {
  return graph[char] ?? { parents: [], children: [], ids: null, addedFrom: {} };
}

export function searchKanjiGraph(q: string): string[] {
  if (!q) return [];
  return Object.keys(graph).filter((kanji) => kanji.includes(q));
}

export function formatAdded(part: string): string {
  const isJoyoKanji = Boolean(graph[part]) && !STROKE_PRIMITIVES.has(part);
  return isJoyoKanji ? part : `[${part}]`;
}

export function formatTransform(
  parent: string,
  added: string[],
  child: string,
): string {
  if (!added.length) return `${parent} → ${child}`;
  return `${parent}+${added.map(formatAdded).join("+")} → ${child}`;
}

export function getTransforms(char: string): {
  fromParents: KanjiTransform[];
  toChildren: KanjiTransform[];
} {
  const node = getKanjiGraph(char);

  const fromParents = node.parents.map((parent) => {
    const added = node.addedFrom?.[parent] ?? [];
    return {
      parent,
      added,
      addedLabels: added.map(formatAdded),
      child: char,
      formula: formatTransform(parent, added, char),
    };
  });

  const toChildren = node.children.map((child) => {
    const added = getKanjiGraph(child).addedFrom?.[char] ?? [];
    return {
      parent: char,
      added,
      addedLabels: added.map(formatAdded),
      child,
      formula: formatTransform(char, added, child),
    };
  });

  return { fromParents, toChildren };
}

export interface TreeNodePayload {
  id: string;
  ids: string | null;
  kind: "radical" | "kanji";
  childCount: number;
  added: string[];
  addedLabels: string[];
  children: TreeNodePayload[];
}

function sortChildren(parent: string, children: string[]): string[] {
  const preferred = new Set(["休", "林", "森", "本", "未", "末", "朱"]);
  return [...children].sort((a, b) => {
    const prefA = preferred.has(a) ? 0 : 1;
    const prefB = preferred.has(b) ? 0 : 1;
    if (prefA !== prefB) return prefA - prefB;
    const addedA = getKanjiGraph(a).addedFrom?.[parent]?.length ?? 99;
    const addedB = getKanjiGraph(b).addedFrom?.[parent]?.length ?? 99;
    if (addedA !== addedB) return addedA - addedB;
    return a.localeCompare(b, "ja");
  });
}

export function buildTreeNode(
  char: string,
  parent: string | null = null,
): TreeNodePayload {
  const node = getKanjiGraph(char);
  const added = parent ? (node.addedFrom?.[parent] ?? []) : [];
  const isAtomic = !node.ids || node.ids === char;
  const kind: "radical" | "kanji" =
    isAtomic && node.children.length > 0 && node.parents.length === 0
      ? "radical"
      : "kanji";

  return {
    id: char,
    ids: node.ids ?? null,
    kind,
    childCount: node.children.length,
    added,
    addedLabels: added.map(formatAdded),
    children: sortChildren(char, node.children).map((child) => ({
      id: child,
      ids: getKanjiGraph(child).ids ?? null,
      kind: getKanjiGraph(child).parents.length === 0 ? "radical" : "kanji",
      childCount: getKanjiGraph(child).children.length,
      added: getKanjiGraph(child).addedFrom?.[char] ?? [],
      addedLabels: (getKanjiGraph(child).addedFrom?.[char] ?? []).map(
        formatAdded,
      ),
      children: [],
    })),
  };
}

export function graphStats() {
  const chars = Object.keys(graph);
  let radicals = 0;
  let withChildren = 0;
  for (const char of chars) {
    const node = graph[char];
    if (!node) continue;
    if (node.children.length) withChildren++;
    if (!node.parents.length && node.children.length) radicals++;
  }
  return {
    total: chars.length,
    withChildren,
    radicals,
  };
}
