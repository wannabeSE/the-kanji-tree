/**
 * Compares stroke counts / components between parent and child kanji.
 */

export interface StrokeDiff {
  parent: string;
  child: string;
  parentStrokes: number;
  childStrokes: number;
  addedStrokes: number;
  sharedComponents: string[];
  uniqueToChild: string[];
}

export function compareStrokes(
  parent: string,
  child: string,
  parentStrokes: number,
  childStrokes: number,
  parentComponents: string[] = [],
  childComponents: string[] = [],
): StrokeDiff {
  const parentSet = new Set(parentComponents);
  const sharedComponents = childComponents.filter((c) => parentSet.has(c));
  const uniqueToChild = childComponents.filter((c) => !parentSet.has(c));

  return {
    parent,
    child,
    parentStrokes,
    childStrokes,
    addedStrokes: Math.max(0, childStrokes - parentStrokes),
    sharedComponents,
    uniqueToChild,
  };
}

export function isLikelyChild(
  parentStrokes: number,
  childStrokes: number,
  parentComponents: string[],
  childComponents: string[],
): boolean {
  if (childStrokes <= parentStrokes) return false;
  const parentSet = new Set(parentComponents);
  return (
    parentComponents.every((c) => childComponents.includes(c)) ||
    [...parentSet].some((c) => childComponents.includes(c))
  );
}
