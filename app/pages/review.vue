<template>
  <div class="h-full overflow-y-auto">
    <main class="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-10">
      <p v-if="loading" class="text-sm text-neutral-500">
        Loading your reviews…
      </p>
      <p v-else-if="loadError" class="text-sm text-red-400">{{ loadError }}</p>

      <section v-else-if="!queue.length" class="card space-y-3 text-center">
        <h1 class="text-2xl font-semibold">Nothing to review</h1>
        <p class="text-sm text-neutral-400">
          No cards are due and you have no new cards left for today.
        </p>
        <div class="flex justify-center gap-2">
          <NuxtLink to="/learn" class="btn-primary">Learn new kanji</NuxtLink>
          <NuxtLink to="/progress" class="btn-secondary">See progress</NuxtLink>
        </div>
      </section>

      <template v-else-if="current">
        <div class="space-y-2">
          <div
            class="flex items-center justify-between text-xs text-neutral-400"
          >
            <span>{{ index + 1 }} / {{ queue.length }}</span>
            <span
              v-if="current.isNew"
              class="rounded-full bg-sky-400/20 px-2 py-0.5 text-sky-300"
            >
              New card
            </span>
          </div>
          <div class="h-1 overflow-hidden rounded-full bg-white/10">
            <div
              class="h-full bg-white transition-all"
              :style="{ width: `${(index / queue.length) * 100}%` }"
            />
          </div>
        </div>

        <section class="card space-y-5 text-center">
          <p class="eyebrow">
            {{
              current.facet === "meaning"
                ? "What does it mean?"
                : "How is it read?"
            }}
          </p>
          <p class="text-8xl leading-none" lang="ja">{{ current.kanji }}</p>

          <button
            v-if="!revealed"
            type="button"
            class="btn-primary w-full"
            @click="reveal"
          >
            Show answer <kbd class="ml-2 text-xs opacity-60">Space</kbd>
          </button>

          <div v-else class="space-y-4 text-left">
            <p v-if="!entry" class="text-sm text-neutral-500">
              Loading details…
            </p>
            <template v-else-if="current.facet === 'meaning'">
              <div>
                <p class="eyebrow">Meanings</p>
                <p class="text-lg text-white">
                  {{ entry.meanings.join(", ") }}
                </p>
              </div>
              <p v-if="entry.heisig_en" class="text-sm text-neutral-400">
                Keyword:
                <span class="text-neutral-100">{{ entry.heisig_en }}</span>
              </p>
            </template>
            <template v-else>
              <div v-for="group in readingGroups" :key="group.label">
                <p class="eyebrow">{{ group.label }}</p>
                <p class="flex flex-wrap gap-1.5" lang="ja">
                  <span
                    v-for="(reading, i) in group.items"
                    :key="reading"
                    class="rounded-full px-2.5 py-0.5 text-sm ring-1"
                    :class="
                      i === 0
                        ? 'bg-white text-neutral-900 ring-white'
                        : 'bg-white/5 ring-white/15'
                    "
                  >
                    <KunReading :reading="reading" />
                    <span
                      v-if="i === 0"
                      class="ml-1 text-[10px] font-semibold uppercase opacity-60"
                      >Primary</span
                    >
                  </span>
                </p>
              </div>
              <ul v-if="cardWords.length" class="space-y-1">
                <li
                  v-for="word in cardWords"
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
            <p
              v-if="mnemonic"
              class="rounded-xl bg-amber-400/10 p-3 text-sm text-amber-100"
            >
              <span class="eyebrow block text-amber-300/70">Your mnemonic</span>
              {{ mnemonic }}
            </p>

            <div class="grid grid-cols-4 gap-2 pt-2">
              <button
                v-for="g in GRADES"
                :key="g.grade"
                type="button"
                class="rounded-xl px-2 py-3 text-sm font-semibold transition disabled:opacity-50"
                :class="g.class"
                :disabled="submitting"
                @click="answer(g.grade)"
              >
                {{ g.label }}
                <kbd class="block text-[10px] font-normal opacity-60">{{
                  g.grade
                }}</kbd>
              </button>
            </div>
            <p v-if="answerError" role="alert" class="text-sm text-red-400">
              {{ answerError }}
            </p>
          </div>
        </section>
        <p class="text-center text-xs text-neutral-500">
          Grade yourself honestly: Again if you didn’t remember it, Hard if it
          took real effort.
        </p>
      </template>

      <section v-else class="space-y-4">
        <div class="card space-y-4">
          <h1 class="text-2xl font-semibold">Session complete</h1>
          <dl class="grid grid-cols-3 gap-3 text-center">
            <div>
              <dd class="text-2xl font-semibold tabular-nums">
                {{ results.length }}
              </dd>
              <dt class="text-xs text-neutral-400">answers</dt>
            </div>
            <div>
              <dd class="text-2xl font-semibold tabular-nums">
                {{ accuracy }}%
              </dd>
              <dt class="text-xs text-neutral-400">remembered</dt>
            </div>
            <div>
              <dd class="text-2xl font-semibold tabular-nums">{{ minutes }}</dd>
              <dt class="text-xs text-neutral-400">
                {{ minutes === 1 ? "minute" : "minutes" }}
              </dt>
            </div>
          </dl>
          <p class="text-sm text-neutral-400">
            <span v-for="g in GRADES" :key="g.grade" class="mr-3">
              {{ g.label }}:
              {{ results.filter((r) => r.grade === g.grade).length }}
            </span>
          </p>
          <p
            v-if="leeches.length"
            class="rounded-xl bg-red-500/10 p-3 text-sm text-red-200"
          >
            Leech{{ leeches.length > 1 ? "es" : "" }}: {{ leeches.join(" ") }}.
            You keep forgetting {{ leeches.length > 1 ? "these" : "this one" }}.
            Open it in the Explorer and write a mnemonic.
          </p>
        </div>

        <div v-if="unlocked.length" class="card space-y-2">
          <h2 class="eyebrow">Words you can now read</h2>
          <p class="text-xs text-neutral-500">
            Common words built only from kanji you are reviewing.
          </p>
          <ul class="space-y-1">
            <li
              v-for="word in unlocked"
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
        </div>

        <div class="flex gap-2">
          <button type="button" class="btn-primary" @click="load">
            Check for more
          </button>
          <NuxtLink to="/progress" class="btn-secondary">See progress</NuxtLink>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import type { KanjiCardData } from "~/components/KanjiCard.vue";

definePageMeta({ middleware: "auth" });

type Facet = "meaning" | "reading";
type Grade = 1 | 2 | 3 | 4;
interface Card {
  kanji: string;
  facet: Facet;
  isNew: boolean;
}
interface Word {
  written: string;
  pronounced: string;
  meaning: string;
}
type Entry = KanjiCardData & { meanings: string[] };

const GRADES: { grade: Grade; label: string; class: string }[] = [
  {
    grade: 1,
    label: "Again",
    class: "bg-red-500/20 text-red-200 hover:bg-red-500/30",
  },
  {
    grade: 2,
    label: "Hard",
    class: "bg-amber-500/20 text-amber-200 hover:bg-amber-500/30",
  },
  {
    grade: 3,
    label: "Good",
    class: "bg-green-500/20 text-green-200 hover:bg-green-500/30",
  },
  {
    grade: 4,
    label: "Easy",
    class: "bg-sky-500/20 text-sky-200 hover:bg-sky-500/30",
  },
];
const MAX_REPEATS = 3;

const { refresh: refreshStatuses } = useKanjiStatus();

const queue = ref<Card[]>([]);
const index = ref(0);
const revealed = ref(false);
const loading = ref(true);
const loadError = ref("");
const submitting = ref(false);
const answerError = ref("");
const notes = ref<Record<string, string>>({});
const entries = reactive<Record<string, Entry>>({});
const words = reactive<Record<string, Word[]>>({});
const results = ref<
  { kanji: string; facet: Facet; grade: Grade; ms: number }[]
>([]);
const leeches = ref<string[]>([]);
const unlocked = ref<Word[]>([]);
let shownAt = 0;

const current = computed(() => queue.value[index.value] ?? null);
const entry = computed(() =>
  current.value ? entries[current.value.kanji] : undefined,
);
const cardWords = computed(() =>
  current.value ? (words[current.value.kanji] ?? []).slice(0, 3) : [],
);
const mnemonic = computed(() =>
  current.value ? notes.value[current.value.kanji] : "",
);
const readingGroups = computed(() =>
  [
    { label: "On readings", items: entry.value?.on_readings ?? [] },
    { label: "Kun readings", items: entry.value?.kun_readings ?? [] },
  ].filter((g) => g.items.length),
);
const accuracy = computed(() =>
  results.value.length
    ? Math.round(
        (results.value.filter((r) => r.grade > 1).length /
          results.value.length) *
          100,
      )
    : 0,
);
const minutes = computed(() =>
  Math.max(
    1,
    Math.round(results.value.reduce((sum, r) => sum + r.ms, 0) / 60_000),
  ),
);

async function prefetch(from: number) {
  const chars = [
    ...new Set(queue.value.slice(from, from + 3).map((c) => c.kanji)),
  ];
  await Promise.all(
    chars.map(async (char) => {
      if (!entries[char]) {
        const data = await $fetch<Entry>(
          `/api/kanji/${encodeURIComponent(char)}`,
        ).catch(() => null);
        if (data) entries[char] = data;
      }
      if (!words[char])
        words[char] = await $fetch<{ words: Word[] }>(
          `/api/words/${encodeURIComponent(char)}`,
        )
          .then((r) => r.words)
          .catch(() => []);
    }),
  );
}

async function load() {
  loading.value = true;
  loadError.value = "";
  try {
    const data = await $fetch<{ cards: Card[]; notes: Record<string, string> }>(
      "/api/me/review/queue",
    );
    queue.value = data.cards;
    notes.value = data.notes;
    index.value = 0;
    revealed.value = false;
    results.value = [];
    leeches.value = [];
    unlocked.value = [];
    shownAt = Date.now();
    prefetch(0);
  } catch (e) {
    loadError.value = errorMessage(e, "Could not load your reviews");
  } finally {
    loading.value = false;
  }
}

function reveal() {
  revealed.value = true;
}

async function answer(grade: Grade) {
  const card = current.value;
  if (!card || submitting.value) return;
  submitting.value = true;
  answerError.value = "";
  const ms = Date.now() - shownAt;
  try {
    const res = await $fetch<{ leech: boolean }>("/api/me/review/answer", {
      method: "POST",
      body: { kanji: card.kanji, facet: card.facet, grade, durationMs: ms },
    });
    results.value.push({ kanji: card.kanji, facet: card.facet, grade, ms });
    if (res.leech && !leeches.value.includes(card.kanji))
      leeches.value.push(card.kanji);
    const repeats = queue.value.filter(
      (c) => c.kanji === card.kanji && c.facet === card.facet,
    ).length;
    if (grade === 1 && repeats < MAX_REPEATS)
      queue.value.push({ ...card, isNew: false });
    index.value++;
    revealed.value = false;
    shownAt = Date.now();
    prefetch(index.value);
    if (!current.value) finish();
  } catch (e) {
    answerError.value = errorMessage(e, "Could not save that answer");
  } finally {
    submitting.value = false;
  }
}

async function finish() {
  refreshStatuses();
  const kanji = [...new Set(results.value.map((r) => r.kanji))].slice(0, 20);
  if (!kanji.length) return;
  unlocked.value = await $fetch<{ words: Word[] }>("/api/me/vocab", {
    query: { kanji: kanji.join("") },
  })
    .then((r) => r.words)
    .catch(() => []);
}

function onKey(event: KeyboardEvent) {
  const target = event.target as HTMLElement | null;
  if (target?.closest("input, textarea, select") || !current.value) return;
  if (!revealed.value && (event.key === " " || event.key === "Enter")) {
    event.preventDefault();
    reveal();
  } else if (revealed.value && ["1", "2", "3", "4"].includes(event.key)) {
    event.preventDefault();
    answer(Number(event.key) as Grade);
  }
}

onMounted(() => {
  load();
  window.addEventListener("keydown", onKey);
});
onBeforeUnmount(() => window.removeEventListener("keydown", onKey));
</script>
