import {
  buildTreeNode,
  getKanjiGraph,
  getTransforms,
  graphStats,
} from "../../utils/getKanjiGraph";

/**
 * Collapsible hierarchy around ?root= (children start collapsed one level down).
 */
export default defineEventHandler((event) => {
  const query = getQuery(event);
  const root = typeof query.root === "string" && query.root ? query.root : "木";

  const node = getKanjiGraph(root);
  const { fromParents, toChildren } = getTransforms(root);
  const tree = buildTreeNode(root);
  const stats = graphStats();

  return {
    root,
    ids: node.ids ?? null,
    parents: node.parents,
    children: node.children,
    fromParents,
    toChildren,
    tree,
    stats: {
      ...stats,
      branch: 1 + tree.children.length,
    },
  };
});
