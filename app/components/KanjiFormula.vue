<template>
  <p class="flex flex-wrap items-center gap-1 text-2xl leading-none">
    <span
      v-if="props.highlight === 'parent'"
      class="rounded-xl bg-white px-2 py-1 text-neutral-900 ring-1 ring-white"
      aria-current="true"
    >
      {{ props.transform.parent }}
    </span>
    <button
      v-else
      type="button"
      class="cursor-pointer rounded-xl bg-[#3a3a3c] px-2 py-1 text-white ring-1 ring-white/10 transition hover:bg-[#48484a] hover:ring-white/25"
      :aria-label="`Open details for ${props.transform.parent}`"
      @click="emit('select', props.transform.parent)"
    >
      {{ props.transform.parent }}
    </button>
    <template
      v-for="(label, index) in props.transform.addedLabels"
      :key="`${label}-${index}`"
    >
      <span class="text-base text-neutral-500">+</span>
      <span class="text-base text-rose-300">{{ label }}</span>
    </template>
    <span class="px-1 text-base text-neutral-500">→</span>
    <span
      v-if="props.highlight === 'child'"
      class="rounded-xl bg-white px-2 py-1 text-neutral-900 ring-1 ring-white"
      aria-current="true"
    >
      {{ props.transform.child }}
    </span>
    <button
      v-else
      type="button"
      class="cursor-pointer rounded-xl bg-[#3a3a3c] px-2 py-1 text-white ring-1 ring-white/10 transition hover:bg-[#48484a] hover:ring-white/25"
      :aria-label="`Open details for ${props.transform.child}`"
      @click="emit('select', props.transform.child)"
    >
      {{ props.transform.child }}
    </button>
  </p>
</template>

<script setup lang="ts">
export interface KanjiFormulaProps {
  parent: string;
  added: string[];
  addedLabels: string[];
  child: string;
  formula: string;
}

const props = defineProps<{
  transform: KanjiFormulaProps;
  highlight?: "parent" | "child" | null;
}>();

const emit = defineEmits<{
  select: [id: string];
}>();
</script>
