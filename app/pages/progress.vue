<template>
  <div class="h-full overflow-y-auto [scrollbar-gutter:stable]">
    <main class="mx-auto w-full max-w-5xl space-y-8 px-4 py-10 md:px-8">
      <div
        class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"
      >
        <div class="space-y-2">
          <p class="eyebrow">Your progress</p>
          <h1 class="text-4xl font-semibold tracking-tight md:text-5xl">
            Progress
          </h1>
          <p class="max-w-lg text-sm leading-relaxed text-neutral-400">
            “Known” means you have passed a kanji’s meaning and reading with a
            review interval of 3 weeks or more.
          </p>
        </div>
        <div v-if="summary" class="flex flex-wrap gap-2">
          <NuxtLink to="/review" class="btn-primary">
            Review now ({{ summary.counts.dueNow + summary.counts.newToday }})
          </NuxtLink>
          <NuxtLink to="/learn" class="btn-secondary">Learn new kanji</NuxtLink>
        </div>
      </div>

      <p
        v-if="status === 'pending' && !summary"
        class="text-sm text-neutral-500"
      >
        Loading…
      </p>
      <p v-else-if="error" class="text-sm text-red-400">
        Could not load your progress.
      </p>

      <template v-if="summary">
        <div class="grid grid-cols-2 gap-3 md:grid-cols-6">
          <div v-for="tile in tiles" :key="tile.label" class="card">
            <p class="text-2xl font-semibold tabular-nums">{{ tile.value }}</p>
            <p class="text-xs text-neutral-400">{{ tile.label }}</p>
          </div>
        </div>
        <p
          v-if="!summary.streak.reviewedToday"
          class="text-xs text-neutral-500"
        >
          Review today to keep the streak.
        </p>

        <section class="card space-y-4">
          <h2 class="eyebrow">Goal</h2>
          <form
            class="flex flex-wrap items-end gap-3"
            @submit.prevent="saveSettings"
          >
            <label class="space-y-1 text-sm">
              <span class="block text-neutral-400">Target JLPT level</span>
              <select v-model="form.target_jlpt" class="field">
                <option :value="null">No target</option>
                <option v-for="level in JLPT_SCALE" :key="level" :value="level">
                  N{{ level }}
                </option>
              </select>
            </label>
            <label class="space-y-1 text-sm">
              <span class="block text-neutral-400">New cards per day</span>
              <input
                v-model.number="form.daily_new_limit"
                type="number"
                min="0"
                max="100"
                class="field w-28"
              />
            </label>
            <button type="submit" class="btn-primary" :disabled="saving">
              {{ saving ? "Saving…" : "Save" }}
            </button>
            <p v-if="saveError" role="alert" class="text-sm text-red-400">
              {{ saveError }}
            </p>
          </form>
          <p class="text-xs leading-relaxed text-neutral-500">
            Each kanji has two cards, meaning and reading, so 10 new cards a day
            starts 5 new kanji a day.
          </p>
          <div v-if="summary.goal" class="space-y-2">
            <StatusBar
              :label="`N${summary.goal.target} and easier`"
              :tally="summary.goal"
            />
            <p class="text-sm text-neutral-300">
              <template v-if="summary.goal.remaining === 0">
                You have started every kanji up to N{{ summary.goal.target }}.
              </template>
              <template v-else-if="summary.goal.finishDate">
                {{ summary.goal.remaining }} kanji left to start. At
                {{ summary.goal.kanjiPerDay }} a day you will have started them
                all by <strong>{{ formatDate(summary.goal.finishDate) }}</strong
                >.
              </template>
              <template v-else>
                {{ summary.goal.remaining }} kanji left. Set new cards per day
                above 0 to get a finish date.
              </template>
            </p>
          </div>
        </section>

        <section class="card space-y-4">
          <h2 class="eyebrow">Activity</h2>
          <div
            ref="heatmapScroller"
            class="overflow-x-auto pb-1"
          >
            <div
              class="heatmap"
              role="img"
              :aria-label="`${summary.totalReviews} reviews in total`"
            >
              <span v-for="n in heatmapOffset" :key="`pad-${n}`" />
              <span
                v-for="day in summary.heatmap"
                :key="day.date"
                class="rounded-[2px]"
                :style="{ backgroundColor: heatColor(day.count) }"
                :title="`${day.date}: ${day.count} reviews`"
              />
            </div>
          </div>
          <p class="text-xs text-neutral-500">
            Each square is a day over the last year. Darker green means more
            reviews.
          </p>
        </section>

        <div class="grid gap-4 md:grid-cols-2">
          <section class="card space-y-3">
            <h2 class="eyebrow">Accuracy</h2>
            <p class="text-xs leading-relaxed text-neutral-500">
              Share of reviews answered Hard, Good, or Easy rather than Again.
            </p>
            <dl class="grid grid-cols-2 gap-3">
              <div v-for="a in summary.accuracy" :key="`${a.days}-${a.facet}`">
                <dt class="text-xs text-neutral-400">
                  {{ a.facet === "meaning" ? "Meaning" : "Reading" }}, last
                  {{ a.days }} days
                </dt>
                <dd class="text-xl font-semibold tabular-nums">
                  {{
                    a.total
                      ? `${Math.round((a.correct / a.total) * 100)}%`
                      : "—"
                  }}
                  <span class="text-xs font-normal text-neutral-500"
                    >{{ a.total }} reviews</span
                  >
                </dd>
              </div>
            </dl>
          </section>

          <section class="card space-y-3">
            <h2 class="eyebrow">Reviews due, next 14 days</h2>
            <MiniBars
              :bars="
                summary.forecast.map((f, i) => ({
                  key: f.date,
                  label: i === 0 ? 'Today' : shortDate(f.date),
                  value: f.count,
                }))
              "
              :label-every="2"
            />
          </section>

          <section class="card space-y-3 md:col-span-2">
            <h2 class="eyebrow">New kanji studied per week</h2>
            <MiniBars
              :bars="
                summary.weekly.map((w) => ({
                  key: w.week,
                  label: shortDate(w.week),
                  value: w.count,
                }))
              "
            />
          </section>
        </div>

        <section class="card space-y-4">
          <h2 class="eyebrow">JLPT levels</h2>
          <StatusBar
            v-for="track in tracksBy('jlpt')"
            :key="track.label"
            :label="track.label"
            :tally="track"
          />
        </section>

        <section class="card space-y-4">
          <h2 class="eyebrow">School years and Jōyō</h2>
          <StatusBar
            v-for="track in [...tracksBy('grade'), ...tracksBy('joyo')]"
            :key="track.label"
            :label="track.label"
            :tally="track"
          />
        </section>

        <section class="card space-y-4">
          <h2 class="eyebrow">Newspaper coverage</h2>
          <p
            v-for="band in summary.frequency"
            :key="band.top"
            class="text-sm text-neutral-300"
          >
            You know
            <strong class="text-white">{{ band.mature }}</strong> of the top
            {{ band.top }} newspaper kanji
            <span class="text-neutral-500">({{ band.total }} with a rank)</span
            >.
          </p>
          <StatusBar
            v-for="band in summary.frequency"
            :key="`bar-${band.top}`"
            :label="`Top ${band.top}`"
            :tally="band"
          />
        </section>

        <section v-if="summary.leeches.length" class="card space-y-3">
          <h2 class="eyebrow">Leeches</h2>
          <p class="text-xs leading-relaxed text-neutral-500">
            Cards you have forgotten 8 times or more. Open one and write a
            mnemonic, or ignore it for now.
          </p>
          <ul class="flex flex-wrap gap-2">
            <li
              v-for="leech in summary.leeches"
              :key="`${leech.kanji}-${leech.facet}`"
            >
              <NuxtLink
                :to="{ path: '/', query: { root: leech.kanji } }"
                class="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 ring-1 ring-white/10 hover:bg-white/10"
              >
                <span class="text-2xl">{{ leech.kanji }}</span>
                <span class="text-xs text-neutral-400">
                  {{ leech.facet }} · {{ leech.lapses }} lapses
                </span>
              </NuxtLink>
            </li>
          </ul>
        </section>

        <ProgressInsights />
        <ProgressData @imported="refresh" />
      </template>
    </main>
  </div>
</template>

<script setup lang="ts">
import { JLPT_SCALE } from "~/utils/jlpt";
import type { StatusTally } from "~/components/StatusBar.vue";

definePageMeta({ middleware: "auth" });

type Track = StatusTally & { group: string; label: string };
interface Summary {
  settings: { daily_new_limit: number; target_jlpt: number | null; tz: string };
  counts: StatusTally & { suspended: number; dueNow: number; newToday: number };
  tracks: Track[];
  frequency: (StatusTally & { top: number })[];
  heatmap: { date: string; count: number }[];
  streak: { current: number; longest: number; reviewedToday: boolean };
  accuracy: { days: number; facet: string; correct: number; total: number }[];
  forecast: { date: string; count: number }[];
  weekly: { week: string; count: number }[];
  goal:
    | (StatusTally & {
        target: number;
        remaining: number;
        kanjiPerDay: number;
        finishDate: string | null;
      })
    | null;
  leeches: { kanji: string; facet: string; lapses: number }[];
  totalReviews: number;
}

const {
  data: summary,
  status,
  error,
  refresh,
} = await useFetch<Summary>("/api/me/summary");

const tiles = computed(() => {
  const s = summary.value;
  if (!s) return [];
  return [
    { label: "Due now", value: s.counts.dueNow },
    { label: "New cards today", value: s.counts.newToday },
    { label: "Known kanji", value: s.counts.mature },
    {
      label: "Studying",
      value: s.counts.new + s.counts.learning + s.counts.young,
    },
    {
      label: "Day streak",
      value: s.streak.current,
    },
    { label: "Longest streak", value: s.streak.longest },
  ];
});

const tracksBy = (group: string) =>
  summary.value?.tracks.filter((t) => t.group === group) ?? [];

const heatmapOffset = computed(() => {
  const first = summary.value?.heatmap[0]?.date;
  if (!first) return 0;
  return (new Date(`${first}T00:00:00Z`).getUTCDay() + 6) % 7;
});

function heatColor(count: number) {
  if (!count) return "rgba(255,255,255,0.06)";
  if (count < 10) return "#166534";
  if (count < 30) return "#16a34a";
  if (count < 60) return "#22c55e";
  return "#86efac";
}

// Most recent days are on the right; start there on narrow screens.
const heatmapScroller = ref<HTMLElement | null>(null);
function scrollHeatmap() {
  nextTick(() => {
    requestAnimationFrame(() => {
      const el = heatmapScroller.value;
      if (el) el.scrollLeft = el.scrollWidth;
    });
  });
}
watch(heatmapScroller, scrollHeatmap);
watch(() => summary.value?.heatmap.length, scrollHeatmap);

const shortDate = (key: string) =>
  new Date(`${key}T00:00:00Z`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
const formatDate = (key: string) =>
  new Date(`${key}T00:00:00Z`).toLocaleDateString(undefined, {
    dateStyle: "long",
    timeZone: "UTC",
  });

const form = reactive({
  target_jlpt: null as number | null,
  daily_new_limit: 10,
});
watch(
  () => summary.value?.settings,
  (settings) => {
    if (!settings) return;
    form.target_jlpt = settings.target_jlpt;
    form.daily_new_limit = settings.daily_new_limit;
  },
  { immediate: true },
);

const saving = ref(false);
const saveError = ref("");
async function saveSettings() {
  saving.value = true;
  saveError.value = "";
  try {
    await $fetch("/api/me/settings", {
      method: "PUT",
      body: {
        ...form,
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    });
    await refresh();
  } catch (e) {
    saveError.value = errorMessage(e, "Could not save");
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.heatmap {
  display: grid;
  grid-template-rows: repeat(7, 11px);
  grid-auto-flow: column;
  grid-auto-columns: 11px;
  gap: 3px;
  width: max-content;
}
</style>
