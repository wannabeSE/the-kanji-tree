export const NAV = [
  { to: "/", label: "Explorer", icon: "tree" },
  { to: "/frequency", label: "Common kanji", icon: "list" },
  { to: "/learn", label: "Learn", icon: "book" },
  { to: "/review", label: "Review", icon: "refresh" },
  { to: "/quiz", label: "Quiz", icon: "quiz" },
  { to: "/progress", label: "Progress", icon: "chart" },
] as const;

export type NavIcon = (typeof NAV)[number]["icon"];

export function useNav() {
  const route = useRoute();
  const active = computed(() =>
    route.path === "/"
      ? "/"
      : (NAV.find((item) => item.to !== "/" && route.path.startsWith(item.to))
          ?.to ?? null),
  );

  return { NAV, active };
}
