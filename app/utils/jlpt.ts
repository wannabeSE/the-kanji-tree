export type JlptLevel = 1 | 2 | 3 | 4 | 5;

/** N5 (easiest) is green; N1 (hardest) is red. */
const JLPT_COLORS: Record<
  JlptLevel,
  { bg: string; fg: string; accent: string }
> = {
  5: { bg: "#dcfce7", fg: "#15803d", accent: "#22c55e" },
  4: { bg: "#ecfccb", fg: "#4d7c0f", accent: "#84cc16" },
  3: { bg: "#fef3c7", fg: "#b45309", accent: "#f59e0b" },
  2: { bg: "#ffedd5", fg: "#c2410c", accent: "#f97316" },
  1: { bg: "#fee2e2", fg: "#b91c1c", accent: "#ef4444" },
};

export const JLPT_SCALE: JlptLevel[] = [5, 4, 3, 2, 1];

export function isJlptLevel(
  level: number | null | undefined,
): level is JlptLevel {
  return level === 1 || level === 2 || level === 3 || level === 4 || level === 5;
}

export function jlptColors(level: number | null | undefined) {
  if (!isJlptLevel(level)) return null;
  return JLPT_COLORS[level];
}
