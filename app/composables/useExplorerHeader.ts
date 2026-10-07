export function useExplorerHeader() {
  const rootLabel = useState<string | null>("explorer-header-root", () => null);
  const menuOpen = useState("explorer-header-menu", () => false);

  return { rootLabel, menuOpen };
}
