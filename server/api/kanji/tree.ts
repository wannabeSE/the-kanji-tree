/**
 * Collapsible hierarchy around ?root= (children start collapsed one level down).
 */
export default defineEventHandler((event) => {
  const query = getQuery(event);
  const root = typeof query.root === "string" && query.root ? query.root : "木";
  const tree = buildTreeNode(root);
  const stats = graphStats();

  return {
    tree,
    stats: {
      ...stats,
      branch: 1 + tree.children.length,
    },
  };
});
