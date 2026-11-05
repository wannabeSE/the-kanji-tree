import type { KanjiStatus } from "#shared/utils/status";

export const STATUS_STYLE: Record<
  KanjiStatus,
  { label: string; light: string; dark: string }
> = {
  new: { label: "New", light: "#e0f2fe", dark: "#38bdf8" },
  learning: { label: "Learning", light: "#fef3c7", dark: "#f59e0b" },
  young: { label: "Young", light: "#ccfbf1", dark: "#2dd4bf" },
  mature: { label: "Known", light: "#bbf7d0", dark: "#22c55e" },
  suspended: { label: "Ignored", light: "#e5e5e5", dark: "#737373" },
};
