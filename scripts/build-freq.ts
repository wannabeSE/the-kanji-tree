/**
 * Fetches newspaper frequency ranks for Joyo kanji.
 * Usage: npx jiti scripts/build-freq.ts
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { ofetch as $fetch } from "ofetch";

const BATCH = 40;

export async function buildFreqMap(joyoList?: string[]) {
  const joyo =
    joyoList ?? (await $fetch<string[]>("https://kanjiapi.dev/v1/kanji/joyo"));
  const mapping: Record<string, number> = {};

  console.log(`Fetching frequency for ${joyo.length} kanji...`);
  for (let i = 0; i < joyo.length; i += BATCH) {
    const batch = joyo.slice(i, i + BATCH);
    const results = await Promise.all(
      batch.map(async (char) => {
        const entry = await $fetch<{
          freq_mainichi_shinbun?: number | null;
        }>(`https://kanjiapi.dev/v1/kanji/${encodeURIComponent(char)}`).catch(
          () => null,
        );
        return { char, freq: entry?.freq_mainichi_shinbun ?? null };
      }),
    );
    for (const { char, freq } of results) {
      if (freq != null) mapping[char] = freq;
    }
    console.log(`  ${Math.min(i + BATCH, joyo.length)}/${joyo.length}`);
  }

  const out = resolve(process.cwd(), "server/assets/freq.json");
  writeFileSync(out, `${JSON.stringify(mapping)}\n`, "utf-8");
  console.log(
    `Successfully generated frequency map (${Object.keys(mapping).length} kanji) at ${out}`,
  );
}

const isDirectRun = process.argv[1]?.includes("build-freq");
if (isDirectRun) {
  buildFreqMap().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
