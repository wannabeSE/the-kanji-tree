<template>
  <div class="h-full overflow-y-auto">
    <main class="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-10">
      <div class="space-y-2">
        <p class="eyebrow">Lesson</p>
        <h1 class="text-3xl font-semibold tracking-tight">Learn new kanji</h1>
        <p class="text-sm leading-relaxed text-neutral-400">
          Five kanji at a time. Parts come before the kanji built from them,
          your target JLPT level comes first, then the most common characters.
        </p>
      </div>

      <p v-if="loading" class="text-sm text-neutral-500">
        Picking your next kanji…
      </p>
      <p v-else-if="loadError" class="text-sm text-red-400">{{ loadError }}</p>

      <section
        v-else-if="!lessons.length && step !== 'done'"
        class="card space-y-3"
      >
        <p class="text-sm text-neutral-300">
          You have started every Jōyō kanji. Well done.
        </p>
        <NuxtLink to="/review" class="btn-primary">Go to reviews</NuxtLink>
      </section>

      <template v-else-if="step === 'study' && lesson">
        <div class="flex items-center gap-1" aria-hidden="true">
          <span
            v-for="(l, i) in lessons"
            :key="l.kanji"
            class="h-1 flex-1 rounded-full"
            :class="i <= position ? 'bg-white' : 'bg-white/15'"
          />
        </div>

        <section class="card space-y-5">
          <div class="flex items-start gap-5">
            <span class="text-8xl leading-none" lang="ja">{{
              lesson.kanji
            }}</span>
            <div class="space-y-1 pt-2">
              <p
                v-if="lesson.entry.heisig_en"
                class="text-xl font-semibold text-white"
              >
                {{ lesson.entry.heisig_en }}
              </p>
              <p class="text-sm text-neutral-400">
                {{ lesson.entry.meanings.join(", ") }}
              </p>
              <p class="text-xs text-neutral-500">
                {{ lesson.entry.stroke_count }} strokes
                <template v-if="lesson.entry.jlpt">
                  · JLPT N{{ lesson.entry.jlpt }}</template
                >
              </p>
            </div>
          </div>

          <div v-if="lesson.entry.fromParents.length" class="space-y-2">
            <p class="eyebrow">How it is formed</p>
            <KanjiFormula
              v-for="transform in lesson.entry.fromParents"
              :key="transform.formula"
              :transform="transform"
              highlight="child"
              @select="(id) => navigateTo({ path: '/', query: { root: id } })"
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div v-for="group in primaryReadings" :key="group.label">
              <p class="eyebrow">{{ group.label }}</p>
              <p class="text-lg text-white">
                <KunReading :reading="group.reading" />
              </p>
              <p
                v-if="group.others.length"
                class="text-xs text-neutral-500"
                lang="ja"
              >
                also {{ group.others.join("、") }}
              </p>
            </div>
          </div>

          <ul v-if="lesson.words.length" class="space-y-1">
            <li
              v-for="word in lesson.words"
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

          <MnemonicEditor
            :kanji="lesson.kanji"
            :keyword="lesson.entry.heisig_en"
          />
        </section>

        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            class="btn-secondary"
            :disabled="position === 0"
            @click="position--"
          >
            Back
          </button>
          <button type="button" class="btn-primary" @click="next">
            {{ position === lessons.length - 1 ? "Quiz me" : "Next" }}
          </button>
          <button
            type="button"
            class="ml-auto text-xs text-neutral-400 underline hover:text-white"
            @click="skipKnown"
          >
            I already know {{ lesson.kanji }}
          </button>
        </div>
      </template>

      <template v-else-if="step === 'quiz' && question">
        <section class="card space-y-4 text-center">
          <p class="eyebrow">Which kanji means</p>
          <p class="text-2xl font-semibold text-white">{{ question.prompt }}</p>
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="option in question.options"
              :key="option"
              type="button"
              class="rounded-2xl py-4 text-5xl ring-1 transition"
              :class="optionClass(option)"
              :disabled="picked != null"
              lang="ja"
              @click="choose(option)"
            >
              {{ option }}
            </button>
          </div>
          <button
            v-if="picked != null"
            type="button"
            class="btn-primary w-full"
            @click="advanceQuiz"
          >
            Continue
          </button>
        </section>
        <p class="text-center text-xs text-neutral-500">
          {{ quizQueue.length }} question{{
            quizQueue.length === 1 ? "" : "s"
          }}
          left. Wrong answers come back at the end.
        </p>
      </template>

      <section v-else-if="step === 'done'" class="card space-y-3">
        <h2 class="text-2xl font-semibold">
          {{
            added.length
              ? `Added ${added.length} kanji to your reviews`
              : "Lesson finished"
          }}
        </h2>
        <p class="text-4xl" lang="ja">{{ added.join(" ") }}</p>
        <p v-if="saveError" role="alert" class="text-sm text-red-400">
          {{ saveError }}
        </p>
        <p class="text-sm text-neutral-400">
          Review them now while they are fresh. Each one comes back as a meaning
          card and a reading card.
        </p>
        <div class="flex gap-2">
          <NuxtLink to="/review" class="btn-primary">Review now</NuxtLink>
          <button type="button" class="btn-secondary" @click="load">
            Next lesson
          </button>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { shuffle } from "#shared/utils/shuffle";
import type { KanjiFormulaProps } from "~/components/KanjiFormula.vue";

definePageMeta({ middleware: "auth" });

interface Lesson {
  kanji: string;
  entry: {
    meanings: string[];
    on_readings: string[];
    kun_readings: string[];
    heisig_en: string | null;
    stroke_count: number;
    jlpt: number | null;
    fromParents: KanjiFormulaProps[];
  };
  words: { written: string; pronounced: string; meaning: string }[];
}

const { mark } = useKanjiStatus();

const lessons = ref<Lesson[]>([]);
const position = ref(0);
const step = ref<"study" | "quiz" | "done">("study");
const loading = ref(true);
const loadError = ref("");
const saveError = ref("");
const added = ref<string[]>([]);

const lesson = computed(() => lessons.value[position.value] ?? null);
const primaryReadings = computed(() => {
  const e = lesson.value?.entry;
  if (!e) return [];
  return [
    { label: "On reading", list: e.on_readings },
    { label: "Kun reading", list: e.kun_readings },
  ]
    .filter((g) => g.list.length)
    .map((g) => ({
      label: g.label,
      reading: g.list[0]!,
      others: g.list.slice(1, 4),
    }));
});

async function load() {
  loading.value = true;
  loadError.value = "";
  try {
    const data = await $fetch<{ lessons: Lesson[] }>("/api/me/lessons/next", {
      query: { count: 5 },
    });
    lessons.value = data.lessons;
    position.value = 0;
    step.value = "study";
    added.value = [];
    saveError.value = "";
  } catch (e) {
    loadError.value = errorMessage(e, "Could not load a lesson");
  } finally {
    loading.value = false;
  }
}

function next() {
  if (position.value < lessons.value.length - 1) position.value++;
  else startQuiz();
}

async function skipKnown() {
  const kanji = lesson.value?.kanji;
  if (!kanji) return;
  await mark(kanji, "known").catch(() => {});
  lessons.value = lessons.value.filter((l) => l.kanji !== kanji);
  position.value = Math.min(
    position.value,
    Math.max(0, lessons.value.length - 1),
  );
  if (!lessons.value.length) load();
}

const quizQueue = ref<Lesson[]>([]);
const picked = ref<string | null>(null);
const question = computed(() => {
  const target = quizQueue.value[0];
  if (!target) return null;
  const others = shuffle(
    lessons.value.filter((l) => l.kanji !== target.kanji),
  ).slice(0, 3);
  return {
    answer: target.kanji,
    prompt:
      target.entry.heisig_en || target.entry.meanings.slice(0, 2).join(", "),
    options: shuffle([target, ...others].map((l) => l.kanji)),
  };
});

function startQuiz() {
  if (lessons.value.length < 2) return finish();
  quizQueue.value = shuffle(lessons.value);
  picked.value = null;
  step.value = "quiz";
}

function choose(option: string) {
  picked.value = option;
}

function optionClass(option: string) {
  if (picked.value == null) return "bg-white/5 ring-white/10 hover:bg-white/10";
  if (option === question.value?.answer)
    return "bg-green-500/25 ring-green-400";
  if (option === picked.value) return "bg-red-500/25 ring-red-400";
  return "bg-white/5 ring-white/10 opacity-50";
}

function advanceQuiz() {
  const [current, ...rest] = quizQueue.value;
  quizQueue.value =
    picked.value === current?.kanji ? rest : [...rest, current!];
  picked.value = null;
  if (!quizQueue.value.length) finish();
}

async function finish() {
  step.value = "done";
  saveError.value = "";
  const results = await Promise.allSettled(
    lessons.value.map((l) => mark(l.kanji, "learn")),
  );
  added.value = lessons.value
    .filter((_, i) => results[i]!.status === "fulfilled")
    .map((l) => l.kanji);
  if (added.value.length < lessons.value.length)
    saveError.value = "Some kanji could not be added. Try again.";
}

onMounted(load);
</script>
