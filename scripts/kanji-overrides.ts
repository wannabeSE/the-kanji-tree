/**
 * Manual parent → child links for atomic kanji CHISE IDS does not decompose,
 * plus the extra stroke/component that produces the child.
 */
export interface KanjiOverride {
  child: string;
  added: string[];
}

export const KANJI_OVERIDES: Record<string, KanjiOverride[]> = {
  木: [
    { child: "本", added: ["一"] },
    { child: "未", added: ["一"] },
    { child: "末", added: ["一"] },
    { child: "朱", added: ["丿"] },
  ],
};
