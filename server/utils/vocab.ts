import vocab from "../assets/vocab.json";
import { fetchCommonWords } from "./kanjiApi";

export interface VocabWord {
  written: string;
  pronounced: string;
  meaning: string;
  /** Null when the word came from the dictionary fallback, not the JLPT lists. */
  jlpt: number | null;
}

interface VocabIndex {
  byKanji: Record<string, VocabWord[]>;
  kanaOnly: VocabWord[];
  words: VocabWord[];
}

const index = vocab as VocabIndex;

/** JLPT words that contain this kanji, in sheet order. Empty when the lists skip it. */
function localWordsForKanji(char: string): VocabWord[] {
  return index.byKanji[char] ?? [];
}

/**
 * JLPT words for this kanji. When the lists have none, the 8 most common
 * dictionary words, cached for a week. Kanji already in the lists never hit the network.
 */
export async function wordsForKanji(char: string): Promise<VocabWord[]> {
  const local = localWordsForKanji(char);
  if (local.length) return local;
  const common = await fetchCommonWords(char).catch(() => []);
  return common.map((word) => ({ ...word, jlpt: null }));
}

/** Every JLPT word, in sheet order, including kana-only entries. */
export function allVocabWords(): VocabWord[] {
  return index.words;
}
