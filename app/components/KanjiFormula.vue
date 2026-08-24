<template>
  <p class="flex flex-wrap items-center gap-1 text-2xl leading-none">
    <button
      type="button"
      class="cursor-pointer border px-2 py-1 transition hover:border-neutral-800"
      :class="
        props.highlight === 'parent'
          ? 'border-neutral-900 bg-neutral-100'
          : 'border-neutral-300'
      "
      @click="emit('select', props.transform.parent)"
    >
      {{ props.transform.parent }}
    </button>
    <template
      v-for="(label, index) in props.transform.addedLabels"
      :key="`${label}-${index}`"
    >
      <span class="text-neutral-400">+</span>
      <span class="border border-rose-200 bg-rose-50 px-2 py-1 text-rose-600">
        {{ label }}
      </span>
    </template>
    <span class="px-1 text-neutral-400">→</span>
    <button
      type="button"
      class="cursor-pointer border px-2 py-1 transition hover:border-neutral-800"
      :class="
        props.highlight === 'child'
          ? 'border-neutral-900 bg-neutral-100'
          : 'border-neutral-300'
      "
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
