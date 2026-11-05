<template>
  <div class="h-full overflow-y-auto scroll-pt-20 [scrollbar-gutter:stable]">
    <main class="mx-auto w-full max-w-5xl space-y-8 px-4 py-10 md:px-8">
      <div
        class="flex w-full flex-col gap-6 md:flex-row md:items-end md:justify-between"
      >
        <div class="space-y-2">
          <p
            class="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500"
          >
            Newspaper rank
          </p>
          <h1 class="text-4xl font-semibold tracking-tight md:text-5xl">
            Most used kanji
          </h1>
          <p class="max-w-lg text-sm leading-relaxed text-neutral-400">
            Ranked from Mainichi Shinbun. #1 is the most common. Pick a rank
            range or a school year, optionally narrow it by JLPT, then tap a
            character to open it in the tree.
          </p>
        </div>

        <div class="flex flex-col items-start gap-2">
          <div class="flex flex-wrap gap-2">
            <button
              v-for="preset in RANGE_PRESETS"
              :key="preset.max"
              type="button"
              class="rounded-full px-3.5 py-1.5 text-sm font-medium transition"
              :class="
                grade == null && maxFreq === preset.max
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'bg-white/10 text-neutral-400 hover:bg-white/15 hover:text-white'
              "
              @click="setRange(preset.max)"
            >
              {{ preset.label }}
            </button>
          </div>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="year in SCHOOL_YEARS"
              :key="year"
              type="button"
              class="rounded-full px-3.5 py-1.5 text-sm font-medium transition"
              :class="
                grade === year
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'bg-white/10 text-neutral-400 hover:bg-white/15 hover:text-white'
              "
              @click="setGrade(year)"
            >
              {{ year === 8 ? "Secondary" : `Year ${year}` }}
            </button>
          </div>
          <div class="flex w-fit flex-wrap gap-1 rounded-full bg-white/5 p-1">
            <button
              type="button"
              class="rounded-full px-3.5 py-1.5 text-sm font-medium transition"
              :class="
                jlpt == null
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-400 hover:bg-white/10 hover:text-white'
              "
              @click="setJlpt(null)"
            >
              All
            </button>
            <button
              v-for="level in JLPT_SCALE"
              :key="level"
              type="button"
              class="rounded-full px-3.5 py-1.5 text-sm font-medium transition"
              :class="
                jlpt === level
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-400 hover:bg-white/10 hover:text-white'
              "
              @click="setJlpt(level)"
            >
              N{{ level }}
            </button>
          </div>
          <label
            v-if="loggedIn"
            class="flex cursor-pointer items-center gap-2 text-sm text-neutral-400"
          >
            <input v-model="hideKnown" type="checkbox" class="accent-white" />
            Hide known kanji
          </label>
        </div>
      </div>

      <p v-if="pending && !items.length" class="text-sm text-neutral-500">
        Loading…
      </p>
      <p v-else-if="error" class="text-sm text-red-400">
        Could not load frequency list.
      </p>

      <p v-else-if="!items.length" class="text-sm text-neutral-500">
        No{{ jlpt != null ? ` N${jlpt}` : "" }} kanji
        {{ grade != null ? `in ${yearName(grade)}` : `in top ${maxFreq}` }}.
      </p>

      <p v-else-if="!shown.length && pending" class="text-sm text-neutral-500">
        Loading…
      </p>
      <p v-else-if="!shown.length" class="text-sm text-neutral-500">
        You know every kanji in this list. Turn off “Hide known kanji” to see
        them.
      </p>

      <ul v-else class="freq-grid">
        <li v-for="item in shown" :key="item.kanji">
          <NuxtLink
            :to="{ path: '/', query: { root: item.kanji } }"
            class="group relative flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-2xl bg-[#2c2c2e] ring-1 ring-white/10 transition hover:-translate-y-0.5 hover:bg-[#3a3a3c] hover:ring-white/25"
            :style="
              item.status
                ? {
                    boxShadow: `inset 0 0 0 2px ${STATUS_STYLE[item.status].dark}`,
                  }
                : undefined
            "
          >
            <span
              v-if="item.status"
              class="absolute top-1 left-1/2 -translate-x-1/2 rounded-full px-1.5 text-[9px] font-semibold uppercase tracking-wide text-neutral-900"
              :style="{ backgroundColor: STATUS_STYLE[item.status].dark }"
            >
              {{ STATUS_STYLE[item.status].label }}
            </span>
            <span class="text-3xl leading-none text-white md:text-4xl">{{
              item.kanji
            }}</span>
            <span class="flex flex-wrap items-center justify-center gap-1">
              <span
                v-if="item.freq != null"
                class="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium tabular-nums text-neutral-400 group-hover:text-neutral-200"
              >
                #{{ item.freq }}
              </span>
              <span
                v-if="item.jlpt != null"
                class="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                :style="{
                  backgroundColor: jlptColors(item.jlpt)?.bg,
                  color: jlptColors(item.jlpt)?.fg,
                }"
              >
                N{{ item.jlpt }}
              </span>
            </span>
          </NuxtLink>
        </li>
      </ul>

      <div v-if="items.length" class="flex flex-col items-center gap-3 pb-10">
        <p class="text-xs tabular-nums text-neutral-500">
          {{ items.length }} / {{ total }}{{ jlpt != null ? ` N${jlpt}` : "" }}
          {{ grade != null ? `in ${yearName(grade)}` : `in top ${maxFreq}` }}
        </p>
        <button
          v-if="hasMore"
          type="button"
          class="rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-200 disabled:opacity-50"
          :disabled="pending"
          @click="loadMore"
        >
          {{ pending ? "Loading…" : "Load 20 more" }}
        </button>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { JLPT_SCALE, jlptColors, type JlptLevel } from "~/utils/jlpt";
import { STATUS_STYLE } from "~/utils/status";

type FreqItem = { kanji: string; freq: number | null; jlpt: number | null };

type SearchPayload = {
  count: number;
  results: FreqItem[];
};

const PAGE_SIZE = 20;

const SCHOOL_YEARS = [1, 2, 3, 4, 5, 6, 8] as const;

const RANGE_PRESETS = [
  { label: "Top 20", max: 20 },
  { label: "Top 100", max: 100 },
  { label: "Top 200", max: 200 },
  { label: "Top 500", max: 500 },
  { label: "Top 800", max: 800 },
  { label: "Top 1000", max: 1000 },
] as const;

const maxFreq = ref<number | null>(20);
const grade = ref<number | null>(null);
const jlpt = ref<JlptLevel | null>(null);
const items = ref<FreqItem[]>([]);
const total = ref(0);
const pending = ref(false);
const error = ref(false);
let requestId = 0;

const hasMore = computed(() => items.value.length < total.value);

const { loggedIn, statusOf } = useKanjiStatus();
const hideKnown = ref(false);
// ponytail: filters loaded pages only, so a page can show fewer than 20; push to /api/search if that bothers users.
const shown = computed(() =>
  items.value
    .map((item) => ({ ...item, status: statusOf(item.kanji) }))
    .filter((item) => !hideKnown.value || item.status !== "mature"),
);

// Hiding known kanji only removes them from pages already loaded, so keep
// reading until an unknown one appears or the list runs out.
watch(shown, (list) => {
  if (!hideKnown.value || pending.value || list.length || !hasMore.value)
    return;
  const before = items.value.length;
  fetchSlice(before, PAGE_SIZE, false).then(() => {
    if (items.value.length === before) total.value = items.value.length;
  });
});

async function fetchSlice(offset: number, limit: number, reset: boolean) {
  const id = ++requestId;
  pending.value = true;
  error.value = false;
  try {
    const data = await $fetch<SearchPayload>("/api/search", {
      query: {
        maxFreq: maxFreq.value ?? undefined,
        grade: grade.value ?? undefined,
        jlpt: jlpt.value ?? undefined,
        limit,
        offset,
      },
    });
    if (id !== requestId) return;
    total.value = data.count;
    items.value = reset ? data.results : [...items.value, ...data.results];
  } catch {
    if (id !== requestId) return;
    error.value = true;
    if (reset) items.value = [];
  } finally {
    if (id === requestId) pending.value = false;
  }
}

function yearName(year: number) {
  return year === 8 ? "secondary Jōyō" : `school year ${year}`;
}

function setRange(max: number) {
  const fromGrade = grade.value != null;
  if (!fromGrade && max === maxFreq.value && items.value.length) return;

  const previous = maxFreq.value ?? 0;
  grade.value = null;
  const growing = !fromGrade && max > previous;
  maxFreq.value = max;

  if (growing && items.value.length) {
    const nextCount = Math.min(max, items.value.length + PAGE_SIZE);
    fetchSlice(0, nextCount, true);
    return;
  }

  fetchSlice(0, PAGE_SIZE, true);
}

function setGrade(year: number) {
  if (year === grade.value && maxFreq.value == null && items.value.length)
    return;
  grade.value = year;
  maxFreq.value = null;
  fetchSlice(0, PAGE_SIZE, true);
}

function setJlpt(level: JlptLevel | null) {
  if (level === jlpt.value && items.value.length) return;
  jlpt.value = level;
  fetchSlice(0, PAGE_SIZE, true);
}

function loadMore() {
  if (pending.value || !hasMore.value) return;
  fetchSlice(items.value.length, PAGE_SIZE, false);
}

onMounted(() => {
  if (!items.value.length) fetchSlice(0, PAGE_SIZE, true);
});

if (import.meta.server) {
  await fetchSlice(0, PAGE_SIZE, true);
}
</script>

<style scoped>
.freq-grid {
  display: grid;
  width: 100%;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.75rem;
}

@media (min-width: 640px) {
  .freq-grid {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
}

@media (min-width: 768px) {
  .freq-grid {
    grid-template-columns: repeat(8, minmax(0, 1fr));
  }
}
</style>
