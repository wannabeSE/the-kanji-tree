<template>
  <article class="space-y-3">
    <header class="flex items-baseline gap-4">
      <div class="shrink-0 space-y-1">
        <span class="block text-5xl font-medium leading-none">{{
          props.kanji.kanji
        }}</span>
        <p v-if="props.kanji.heisig_en" class="text-xs text-neutral-400">
          Keyword:
          <span class="text-neutral-200">{{ props.kanji.heisig_en }}</span>
        </p>
      </div>
      <div class="flex flex-wrap gap-2 text-sm text-neutral-400">
        <span v-if="props.kanji.stroke_count"
          >{{ props.kanji.stroke_count }} strokes</span
        >
        <span
          v-if="props.kanji.jlpt != null"
          class="rounded px-1.5 py-0.5 text-xs font-semibold"
          :style="{
            backgroundColor: jlptColors(props.kanji.jlpt)?.bg,
            color: jlptColors(props.kanji.jlpt)?.fg,
          }"
          >JLPT N{{ props.kanji.jlpt }}</span
        >
        <span v-if="gradeLabel">{{ gradeLabel }}</span>
      </div>
    </header>

    <KanjiStudyActions
      v-if="!props.hideActions"
      :kanji="props.kanji.kanji"
      :keyword="props.kanji.heisig_en"
    />

    <section v-if="props.kanji.freq_mainichi_shinbun != null" class="space-y-1">
      <h3
        class="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500"
      >
        Newspaper frequency
      </h3>
      <p class="text-sm">
        Rank
        <span class="font-semibold text-white">{{
          props.kanji.freq_mainichi_shinbun
        }}</span>
        <span class="text-neutral-500"> / 2501</span>
      </p>
      <p class="text-xs leading-relaxed text-neutral-500">
        Lower rank means more common (1 = most frequent). Un-ranked kanji are
        outside the top 2501.
      </p>
    </section>

    <section v-if="props.kanji.meanings?.length">
      <h3
        class="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500"
      >
        Meanings
      </h3>
      <p>{{ props.kanji.meanings.join(", ") }}</p>
    </section>

    <section
      v-if="props.kanji.alternate_stroke_counts?.length"
      class="space-y-1"
    >
      <h3
        class="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500"
      >
        Other stroke counts
      </h3>
      <p class="text-xs leading-relaxed text-neutral-500">
        Also recorded as {{ props.kanji.alternate_stroke_counts.join(", ") }}.
        These are common miscounts, not equally valid counts.
      </p>
    </section>

    <section v-if="props.kanji.notes?.length" class="space-y-1">
      <h3
        class="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500"
      >
        Notes
      </h3>
      <p
        v-for="(note, index) in props.kanji.notes"
        :key="index"
        class="text-sm leading-relaxed"
      >
        {{ note }}
      </p>
    </section>

    <div v-if="hasReadings" class="space-y-3">
      <p class="text-xs leading-relaxed text-neutral-500">
        Tap a reading to list the kanji that use it. Results show up under
        Search. The dictionary lists the first on reading and the first kun
        reading first: learn those before the others. That is not a count of how
        often they are used.
      </p>
      <p
        v-if="props.activeReading"
        class="text-xs font-medium text-neutral-200"
      >
        Showing kanji read {{ props.activeReading }} in Search.
      </p>
      <section
        v-for="group in readingGroups"
        :key="group.label"
        class="space-y-1"
      >
        <h3
          class="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500"
        >
          {{ group.label }}
        </h3>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="(reading, index) in group.items"
            :key="reading"
            type="button"
            class="inline-flex cursor-pointer items-center gap-1 rounded-full px-2.5 py-0.5 ring-1 transition"
            :class="
              reading === props.activeReading
                ? 'bg-white text-neutral-900 ring-white'
                : 'bg-white/5 text-neutral-100 ring-white/15 hover:bg-white/10 hover:ring-white/30'
            "
            :aria-pressed="reading === props.activeReading"
            :aria-label="
              group.primary && index === 0
                ? `List kanji read ${reading}, the primary reading`
                : `List kanji read ${reading}`
            "
            @click="emit('reading', reading)"
          >
            {{ reading }}
            <span
              v-if="group.primary && index === 0"
              class="text-[10px] font-semibold uppercase tracking-wide opacity-70"
            >
              Primary
            </span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="size-3 opacity-60"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          </button>
        </div>
      </section>
    </div>
  </article>
</template>

<script setup lang="ts">
export interface KanjiCardData {
  kanji: string;
  meanings?: string[];
  kun_readings?: string[];
  on_readings?: string[];
  name_readings?: string[];
  heisig_en?: string | null;
  jlpt?: number | null;
  grade?: number | null;
  stroke_count?: number;
  alternate_stroke_counts?: number[];
  notes?: string[];
  freq_mainichi_shinbun?: number | null;
}

const props = defineProps<{
  kanji: KanjiCardData;
  activeReading?: string | null;
  hideActions?: boolean;
}>();

const emit = defineEmits<{
  reading: [reading: string];
}>();

const readingGroups = computed(() =>
  [
    { label: "On readings", items: props.kanji.on_readings, primary: true },
    { label: "Kun readings", items: props.kanji.kun_readings, primary: true },
    {
      label: "Name-only readings",
      items: props.kanji.name_readings,
      primary: false,
    },
  ].filter((group) => group.items?.length),
);

const gradeLabel = computed(() => {
  const grade = props.kanji.grade;
  if (grade != null && grade >= 1 && grade <= 6) return `School year ${grade}`;
  if (grade === 8) return "Secondary Jōyō";
  if (grade === 9) return "Jinmeiyō";
  return null;
});

const hasReadings = computed(() => readingGroups.value.length > 0);
</script>
