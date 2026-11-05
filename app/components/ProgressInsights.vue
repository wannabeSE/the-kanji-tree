<template>
  <div class="grid gap-4 md:grid-cols-2">
    <section class="card space-y-3">
      <h2 class="eyebrow">Reading families</h2>
      <p class="text-xs leading-relaxed text-neutral-500">
        Jōyō kanji that share the main on reading of kanji you studied recently.
        Learning them together makes the reading stick.
      </p>
      <p v-if="loading(readingsStatus)" class="text-sm text-neutral-500">
        Loading…
      </p>
      <p v-else-if="readingsStatus === 'error'" class="text-sm text-red-400">
        Could not load reading families.
      </p>
      <p
        v-else-if="!readings?.families.length"
        class="text-sm text-neutral-500"
      >
        Review a few kanji to see their reading families here.
      </p>
      <ul v-else class="space-y-3">
        <li
          v-for="family in readings.families"
          :key="family.reading"
          class="space-y-1"
        >
          <p class="text-sm">
            <span class="font-semibold text-white" lang="ja">{{
              family.reading
            }}</span>
            <span class="text-neutral-400">
              {{ family.known }} of {{ family.total }} known<template
                v-if="family.studying"
                >, {{ family.studying }} studying</template
              >
            </span>
          </p>
          <div class="flex flex-wrap gap-1">
            <NuxtLink
              v-for="k in family.kanji"
              :key="k.kanji"
              :to="{ path: '/', query: { root: k.kanji } }"
              class="grid size-8 place-items-center rounded-lg text-lg ring-1 ring-white/10 hover:ring-white/40"
              :style="
                k.status
                  ? {
                      backgroundColor: STATUS_STYLE[k.status].dark,
                      color: '#111',
                    }
                  : undefined
              "
              :title="k.status ? STATUS_STYLE[k.status].label : 'Not started'"
              lang="ja"
            >
              {{ k.kanji }}
            </NuxtLink>
          </div>
        </li>
      </ul>
    </section>

    <section class="card space-y-3">
      <h2 class="eyebrow">Words you can read</h2>
      <p class="text-xs leading-relaxed text-neutral-500">
        Common words made only of kanji you have passed at least once (young or
        known), from your {{ vocab?.basedOn.length ?? 0 }} most recent kanji.
      </p>
      <p v-if="loading(vocabStatus)" class="text-sm text-neutral-500">
        Loading…
      </p>
      <p v-else-if="vocabStatus === 'error'" class="text-sm text-red-400">
        Could not load words.
      </p>
      <p v-else-if="!vocab?.words.length" class="text-sm text-neutral-500">
        None yet. Pass a few reviews and words will start to unlock.
      </p>
      <template v-else>
        <p class="text-2xl font-semibold tabular-nums">
          {{ vocab.words.length }}
        </p>
        <ul class="max-h-64 space-y-1 overflow-y-auto">
          <li
            v-for="word in vocab.words"
            :key="word.written + word.pronounced"
            class="text-sm"
          >
            <span class="text-white" lang="ja">{{ word.written }}</span>
            <span class="ml-2 text-neutral-400" lang="ja">{{
              word.pronounced
            }}</span>
            <span class="ml-2 text-xs text-neutral-500">{{
              word.meaning
            }}</span>
          </li>
        </ul>
      </template>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { KanjiStatus } from "#shared/utils/status";

interface Families {
  families: {
    reading: string;
    total: number;
    known: number;
    studying: number;
    kanji: { kanji: string; status: KanjiStatus | null }[];
  }[];
}
interface Vocab {
  words: { written: string; pronounced: string; meaning: string }[];
  basedOn: string[];
}

const loading = (status: string) => status === "idle" || status === "pending";

const { data: readings, status: readingsStatus } = useFetch<Families>(
  "/api/me/readings",
  {
    lazy: true,
    server: false,
  },
);
const { data: vocab, status: vocabStatus } = useFetch<Vocab>("/api/me/vocab", {
  lazy: true,
  server: false,
});
</script>
