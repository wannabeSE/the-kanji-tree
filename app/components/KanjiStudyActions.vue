<template>
  <section class="space-y-2 rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
    <template v-if="loggedIn">
      <p class="flex items-center gap-2 text-xs text-neutral-400">
        <span
          class="size-2.5 rounded-full"
          :style="{
            backgroundColor: status ? STATUS_STYLE[status].dark : '#525252',
          }"
          aria-hidden="true"
        />
        <span>
          {{ status ? STATUS_HINT[status] : "Not in your reviews yet." }}
        </span>
      </p>
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="button in buttons"
          :key="button.action"
          type="button"
          class="rounded-full px-3 py-1 text-xs font-semibold transition disabled:cursor-default disabled:opacity-40"
          :class="
            button.primary
              ? 'bg-white text-neutral-900 hover:bg-neutral-200'
              : 'bg-white/10 text-neutral-200 hover:bg-white/20'
          "
          :disabled="pending || button.disabled"
          @click="run(button.action)"
        >
          {{ button.label }}
        </button>
      </div>
      <p v-if="error" role="alert" class="text-xs text-red-400">{{ error }}</p>
      <details class="group pt-1">
        <summary
          class="cursor-pointer text-xs font-semibold text-neutral-300 hover:text-white"
        >
          Mnemonic
        </summary>
        <MnemonicEditor
          class="pt-2"
          :kanji="props.kanji"
          :keyword="props.keyword"
        />
      </details>
    </template>
    <p v-else class="text-xs text-neutral-400">
      <NuxtLink to="/login" class="font-semibold text-white underline"
        >Log in</NuxtLink
      >
      to track this kanji and review it later.
    </p>
  </section>
</template>

<script setup lang="ts">
import type { KanjiStatus, StudyAction } from "#shared/utils/status";

const props = defineProps<{ kanji: string; keyword?: string | null }>();

const STATUS_HINT: Record<KanjiStatus, string> = {
  new: "Queued: it will appear in your next review.",
  learning: "Learning: you'll see it again within a day.",
  young: "Young: you're reviewing it every few days.",
  mature: "Known: reviewed every 3 weeks or more.",
  suspended: "Ignored: it won't come up in reviews.",
};

const { loggedIn, mark, statusOf } = useKanjiStatus();
const status = computed(() => statusOf(props.kanji));
const pending = ref(false);
const error = ref("");

const buttons = computed(() => {
  const s = status.value;
  const list: {
    action: StudyAction;
    label: string;
    disabled: boolean;
    primary?: boolean;
  }[] = [
    {
      action: "learn",
      label: s === "suspended" ? "Stop ignoring" : "Start learning",
      disabled: s != null && s !== "suspended",
      primary: s == null,
    },
    { action: "known", label: "I know this", disabled: s === "mature" },
    { action: "ignore", label: "Ignore", disabled: s === "suspended" },
  ];
  if (s) list.push({ action: "reset", label: "Remove", disabled: false });
  return list;
});

async function run(action: StudyAction) {
  if (
    action === "reset" &&
    !confirm(`Remove ${props.kanji} and its review progress?`)
  )
    return;
  pending.value = true;
  error.value = "";
  try {
    await mark(props.kanji, action);
  } catch (e) {
    error.value = errorMessage(e, "Could not save");
  } finally {
    pending.value = false;
  }
}
</script>
