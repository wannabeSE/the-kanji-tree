<template>
  <article class="space-y-3">
    <header class="flex items-baseline gap-4">
      <span class="text-5xl font-medium leading-none">{{
        props.kanji.kanji
      }}</span>
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
        <span v-if="props.kanji.grade != null"
          >Grade {{ props.kanji.grade }}</span
        >
      </div>
    </header>

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

    <section v-if="props.kanji.on_readings?.length">
      <h3
        class="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500"
      >
        On
      </h3>
      <p>{{ props.kanji.on_readings.join("、") }}</p>
    </section>

    <section v-if="props.kanji.kun_readings?.length">
      <h3
        class="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500"
      >
        Kun
      </h3>
      <p>{{ props.kanji.kun_readings.join("、") }}</p>
    </section>
  </article>
</template>

<script setup lang="ts">
export interface KanjiCardData {
  kanji: string;
  meanings?: string[];
  kun_readings?: string[];
  on_readings?: string[];
  jlpt?: number | null;
  grade?: number | null;
  stroke_count?: number;
  freq_mainichi_shinbun?: number | null;
}

const props = defineProps<{
  kanji: KanjiCardData;
}>();
</script>
