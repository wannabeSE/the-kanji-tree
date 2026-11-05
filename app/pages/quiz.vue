<template>
  <div class="h-full overflow-y-auto">
    <main class="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-10">
      <div class="space-y-2">
        <p class="eyebrow">Practice</p>
        <h1 class="text-3xl font-semibold tracking-tight">Quiz</h1>
        <p class="text-sm leading-relaxed text-neutral-400">
          Multiple-choice practice on the kanji you are studying. Wrong options
          come from look-alike kanji, kanji with the same reading, and kanji
          with the same stroke count. Quiz answers don’t change your review
          schedule.
        </p>
      </div>

      <div class="flex flex-wrap gap-1 rounded-2xl bg-white/5 p-1 text-sm">
        <button
          v-for="m in MODES"
          :key="m.id"
          type="button"
          class="rounded-xl px-3 py-1.5 font-medium transition"
          :class="
            mode === m.id
              ? 'bg-white text-neutral-900'
              : 'text-neutral-400 hover:text-white'
          "
          @click="start(m.id)"
        >
          {{ m.label }}
        </button>
      </div>

      <p v-if="loading" class="text-sm text-neutral-500">Building questions…</p>
      <p v-else-if="loadError" class="text-sm text-red-400">{{ loadError }}</p>
      <p v-else-if="!mode" class="text-sm text-neutral-500">
        Pick a quiz type to start.
      </p>
      <p v-else-if="!questions.length" class="text-sm text-neutral-500">
        No questions of this type for your kanji yet. Try another type.
      </p>

      <template v-else-if="question">
        <p v-if="!fromStudied" class="text-xs text-neutral-500">
          You are studying fewer than 4 kanji, so these come from your target
          JLPT level.
        </p>
        <div class="flex justify-between text-xs text-neutral-400">
          <span>{{ position + 1 }} / {{ questions.length }}</span>
          <span>{{ score }} correct</span>
        </div>
        <section class="card space-y-4 text-center">
          <p v-if="question.display" class="text-6xl leading-tight" lang="ja">
            {{ question.display }}
          </p>
          <p class="text-lg text-white">{{ question.prompt }}</p>
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="(option, i) in question.options"
              :key="option"
              type="button"
              class="rounded-2xl px-2 py-3 ring-1 transition"
              :class="[
                mode === 'meaning' ? 'text-5xl' : 'text-xl',
                optionClass(i),
              ]"
              :disabled="picked != null"
              lang="ja"
              @click="pick(i)"
            >
              <KunReading v-if="mode === 'reading'" :reading="option" />
              <template v-else>{{ option }}</template>
            </button>
          </div>
          <template v-if="picked != null">
            <p
              class="text-sm"
              :class="
                picked === question.answer ? 'text-green-300' : 'text-red-300'
              "
            >
              {{ picked === question.answer ? "Correct." : "Not quite." }}
              <span class="text-neutral-300">{{ question.explain }}</span>
            </p>
            <button type="button" class="btn-primary w-full" @click="next">
              {{ position === questions.length - 1 ? "See score" : "Next" }}
            </button>
          </template>
        </section>
      </template>

      <section v-else class="card space-y-3 text-center">
        <p class="text-4xl font-semibold tabular-nums">
          {{ score }} / {{ questions.length }}
        </p>
        <p v-if="missed.length" class="text-sm text-neutral-400">
          Worth another look:
          <NuxtLink
            v-for="k in missed"
            :key="k"
            :to="{ path: '/', query: { root: k } }"
            class="mx-0.5 text-lg text-white underline"
            lang="ja"
            >{{ k }}</NuxtLink
          >
        </p>
        <button type="button" class="btn-primary" @click="start(mode!)">
          Another round
        </button>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: "auth" });

type Mode = "meaning" | "reading" | "stroke" | "okurigana" | "word";
interface Question {
  kanji: string;
  prompt: string;
  display?: string;
  options: string[];
  answer: number;
  explain: string;
}

const MODES: { id: Mode; label: string }[] = [
  { id: "meaning", label: "Meaning" },
  { id: "reading", label: "Reading" },
  { id: "word", label: "Word reading" },
  { id: "okurigana", label: "Okurigana" },
  { id: "stroke", label: "Stroke count" },
];

const mode = ref<Mode | null>(null);
const questions = ref<Question[]>([]);
const fromStudied = ref(true);
const position = ref(0);
const picked = ref<number | null>(null);
const score = ref(0);
const missed = ref<string[]>([]);
const loading = ref(false);
const loadError = ref("");

const question = computed(() => questions.value[position.value] ?? null);

async function start(next: Mode) {
  mode.value = next;
  loading.value = true;
  loadError.value = "";
  try {
    const data = await $fetch<{ questions: Question[]; fromStudied: boolean }>(
      "/api/me/quiz",
      {
        query: { mode: next, count: 10 },
      },
    );
    if (mode.value !== next) return;
    questions.value = data.questions;
    fromStudied.value = data.fromStudied;
    position.value = 0;
    picked.value = null;
    score.value = 0;
    missed.value = [];
  } catch (e) {
    loadError.value = errorMessage(e, "Could not build a quiz");
  } finally {
    if (mode.value === next) loading.value = false;
  }
}

function pick(i: number) {
  if (picked.value != null || !question.value) return;
  picked.value = i;
  if (i === question.value.answer) score.value++;
  else if (!missed.value.includes(question.value.kanji))
    missed.value.push(question.value.kanji);
}

function next() {
  position.value++;
  picked.value = null;
}

function optionClass(i: number) {
  if (picked.value == null) return "bg-white/5 ring-white/10 hover:bg-white/10";
  if (i === question.value?.answer) return "bg-green-500/25 ring-green-400";
  if (i === picked.value) return "bg-red-500/25 ring-red-400";
  return "bg-white/5 ring-white/10 opacity-50";
}
</script>
