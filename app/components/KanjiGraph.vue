<template>
  <div ref="host" class="kanji-canvas h-full min-h-0 w-full overflow-hidden" />
</template>

<script setup lang="ts">
import * as d3 from "d3";

export interface TreeNodePayload {
  id: string;
  ids: string | null;
  kind: "radical" | "kanji";
  childCount: number;
  added: string[];
  addedLabels: string[];
  children: TreeNodePayload[];
}

interface LocalNode extends TreeNodePayload {
  children: LocalNode[];
  hiddenChildren?: LocalNode[];
  isMore?: boolean;
  moreCount?: number;
}

const props = defineProps<{
  tree: TreeNodePayload;
  selectedId?: string | null;
}>();

const emit = defineEmits<{
  select: [id: string];
}>();

const host = ref<HTMLDivElement | null>(null);
const NODE_W = 120;
const NODE_H = 56;
const VISIBLE_LIMIT = 10;
const MORE_PREFIX = "__more__:";

type Point = { x: number; y: number };

function cloneTree(node: TreeNodePayload): LocalNode {
  return {
    ...node,
    children: node.children.map(cloneTree),
  };
}

function moreSentinel(parentId: string, remaining: number): LocalNode {
  return {
    id: `${MORE_PREFIX}${parentId}`,
    ids: null,
    kind: "kanji",
    childCount: 0,
    added: [],
    addedLabels: [],
    children: [],
    isMore: true,
    moreCount: remaining,
  };
}

function applyFanout(node: LocalNode) {
  if (node.isMore) return;

  node.children = node.children.filter((child) => !child.isMore);
  const pool = [...node.children, ...(node.hiddenChildren ?? [])];
  node.hiddenChildren = pool.slice(VISIBLE_LIMIT);
  node.children = pool.slice(0, VISIBLE_LIMIT).map((child) => {
    applyFanout(child);
    return child;
  });

  if (node.hiddenChildren.length) {
    node.children.push(moreSentinel(node.id, node.hiddenChildren.length));
  }
}

function fanoutCount(node: LocalNode) {
  return node.children.filter((child) => !child.isMore).length;
}

let rootData = cloneTree(props.tree);
applyFanout(rootData);
let hasCentered = false;
let zoomBehavior: d3.ZoomBehavior<SVGSVGElement, unknown> | null = null;
let resizeObserver: ResizeObserver | null = null;

async function loadChildren(id: string): Promise<LocalNode[]> {
  const payload = await $fetch<{ tree: TreeNodePayload }>(
    `/api/kanji/tree?root=${encodeURIComponent(id)}`,
  );
  return payload.tree.children.map(cloneTree);
}

function findNode(node: LocalNode, id: string): LocalNode | null {
  if (node.id === id) return node;
  for (const child of node.children) {
    const hit = findNode(child, id);
    if (hit) return hit;
  }
  return null;
}

function revealMore(parentId: string) {
  const target = findNode(rootData, parentId);
  if (!target?.hiddenChildren?.length) return;

  const batch = target.hiddenChildren.splice(0, VISIBLE_LIMIT);
  target.children = target.children.filter((child) => !child.isMore);
  target.children.push(...batch);
  if (target.hiddenChildren.length) {
    target.children.push(moreSentinel(parentId, target.hiddenChildren.length));
  }
  draw({ recenter: false });
}

async function toggleExpand(id: string) {
  const target = findNode(rootData, id);
  if (!target || target.childCount === 0 || target.isMore) return;

  if (target.children.some((child) => !child.isMore)) {
    target.hiddenChildren = [];
    target.children = [];
  } else {
    target.children = await loadChildren(id);
    target.hiddenChildren = [];
    applyFanout(target);
  }
  draw({ recenter: false });
}

function draw(options: { recenter: boolean }) {
  const el = host.value;
  if (!el) return;

  const width = el.clientWidth || 800;
  const height = el.clientHeight || 600;
  const previous = el.querySelector("svg") as SVGSVGElement | null;
  const priorTransform =
    previous && zoomBehavior ? d3.zoomTransform(previous) : null;

  d3.select(el).selectAll("svg").remove();

  const svg = d3
    .select(el)
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("class", "block h-full w-full");

  const scene = svg.append("g");

  zoomBehavior = d3
    .zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.2, 2.5])
    .on("zoom", (event) => {
      scene.attr("transform", event.transform.toString());
    });

  svg.call(zoomBehavior);

  const visibleFan = Math.max(fanoutCount(rootData), 1);
  const levelGap = 420 + visibleFan * 28;
  const siblingGap = NODE_H + 32;

  const hierarchy = d3.hierarchy(rootData, (d) => d.children);
  const treeLayout = d3
    .tree<LocalNode>()
    .nodeSize([siblingGap, NODE_W + levelGap]);
  const root = treeLayout(hierarchy);

  type LinkPts = { source: Point; target: Point };

  const linkGen = d3
    .linkHorizontal<LinkPts, Point>()
    .x((d) => d.y)
    .y((d) => d.x);

  const links = root.links().filter((d) => !d.target.data.isMore);

  scene
    .append("g")
    .attr("fill", "none")
    .attr("stroke", "#c8c8c8")
    .attr("stroke-width", 1.25)
    .selectAll("path")
    .data(links)
    .join("path")
    .attr("d", (d) =>
      linkGen({
        source: { x: d.source.x, y: d.source.y + NODE_W / 2 },
        target: { x: d.target.x, y: d.target.y - NODE_W / 2 },
      }),
    );

  scene
    .append("g")
    .selectAll("text")
    .data(links.filter((d) => d.target.data.addedLabels.length))
    .join("text")
    .attr("x", (d) => (d.source.y + NODE_W / 2 + d.target.y - NODE_W / 2) / 2)
    .attr("y", (d) => (d.source.x + d.target.x) / 2 - 6)
    .attr("text-anchor", "middle")
    .attr("fill", "#e8a0a0")
    .attr("font-size", 13)
    .text((d) => `+${d.target.data.addedLabels.join("+")}`);

  const node = scene
    .append("g")
    .selectAll("g")
    .data(root.descendants())
    .join("g")
    .attr(
      "transform",
      (d) => `translate(${d.y - NODE_W / 2},${d.x - NODE_H / 2})`,
    )
    .style("cursor", "pointer")
    .on("click", (event, d) => {
      event.stopPropagation();
      if (d.data.isMore) {
        revealMore(d.data.id.slice(MORE_PREFIX.length));
        return;
      }
      emit("select", d.data.id);
    });

  node
    .append("rect")
    .attr("width", NODE_W)
    .attr("height", NODE_H)
    .attr("rx", 12)
    .attr("ry", 12)
    .attr("fill", (d) => {
      if (d.data.isMore) return "#6d6d6d";
      if (d.data.id === props.selectedId) return "#dcefdc";
      if (d.data.kind === "radical") return "#f3d4cf";
      return "#ffffff";
    })
    .attr("stroke", (d) => {
      if (d.data.isMore) return "#8a8a8a";
      if (d.data.id === props.selectedId) return "#3d8c4a";
      return "#d0d0d0";
    })
    .attr("stroke-width", (d) => (d.data.id === props.selectedId ? 2 : 1));

  node
    .append("text")
    .attr("x", (d) => (d.data.isMore ? NODE_W / 2 : 16))
    .attr("y", NODE_H / 2 + 11)
    .attr("text-anchor", (d) => (d.data.isMore ? "middle" : "start"))
    .attr("font-size", (d) => (d.data.isMore ? 18 : 34))
    .attr("fill", (d) => (d.data.isMore ? "#f3f3f3" : "#222"))
    .attr("font-family", (d) => (d.data.isMore ? "sans-serif" : "serif"))
    .text((d) => (d.data.isMore ? `+${d.data.moreCount}` : d.data.id));

  node
    .filter((d) => d.data.kind === "radical" && !d.data.isMore)
    .append("circle")
    .attr("cx", NODE_W - 18)
    .attr("cy", 16)
    .attr("r", 10)
    .attr("fill", "#e7b8b2");

  node
    .filter((d) => d.data.kind === "radical" && !d.data.isMore)
    .append("text")
    .attr("x", NODE_W - 18)
    .attr("y", 20)
    .attr("text-anchor", "middle")
    .attr("font-size", 9)
    .attr("fill", "#7a3f3a")
    .attr("font-weight", 700)
    .text("R");

  const expandable = node.filter(
    (d) => d.data.childCount > 0 && !d.data.isMore,
  );

  expandable
    .append("circle")
    .attr("cx", NODE_W)
    .attr("cy", NODE_H / 2)
    .attr("r", 9)
    .attr("fill", "#e05a4f")
    .attr("stroke", "#fff")
    .attr("stroke-width", 1.5)
    .on("click", (event, d) => {
      event.stopPropagation();
      toggleExpand(d.data.id);
    });

  expandable
    .append("text")
    .attr("x", NODE_W)
    .attr("y", NODE_H / 2 + 4)
    .attr("text-anchor", "middle")
    .attr("font-size", 11)
    .attr("fill", "#fff")
    .attr("pointer-events", "none")
    .text((d) => (d.data.children.some((child) => !child.isMore) ? "‹" : "›"));

  if (options.recenter || !hasCentered || !priorTransform) {
    const minX = d3.min(root.descendants(), (d) => d.x) ?? 0;
    const maxX = d3.max(root.descendants(), (d) => d.x) ?? 0;
    const midX = (minX + maxX) / 2;
    svg.call(
      zoomBehavior.transform,
      d3.zoomIdentity.translate(56, height / 2 - midX).scale(1),
    );
    hasCentered = true;
  } else {
    svg.call(zoomBehavior.transform, priorTransform);
  }
}

watch(
  () => props.tree.id,
  () => {
    rootData = cloneTree(props.tree);
    applyFanout(rootData);
    hasCentered = false;
    draw({ recenter: true });
  },
);

watch(
  () => props.selectedId,
  () => draw({ recenter: false }),
);

onMounted(() => {
  draw({ recenter: true });
  resizeObserver = new ResizeObserver(() => draw({ recenter: false }));
  if (host.value) resizeObserver.observe(host.value);
});

onUnmounted(() => {
  resizeObserver?.disconnect();
});
</script>
