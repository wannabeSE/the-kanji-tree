<template>
  <p class="flex flex-wrap items-center gap-1 text-2xl leading-none">
    <button
      type="button"
      class="cursor-pointer rounded-xl px-2 py-1 ring-1 transition"
      :class="
        props.highlight === 'parent'
          ? 'bg-white text-neutral-900 ring-white'
          : 'bg-[#3a3a3c] text-white ring-white/10 hover:bg-[#48484a] hover:ring-white/25'
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
      <span
        class="rounded-xl bg-rose-500/20 px-2 py-1 text-rose-300 ring-1 ring-rose-400/25"
      >
        {{ label }}
      </span>
    </template>
    <span class="px-1 text-neutral-400">→</span>
    <button
      type="button"
      class="cursor-pointer rounded-xl px-2 py-1 ring-1 transition"
      :class="
        props.highlight === 'child'
          ? 'bg-white text-neutral-900 ring-white'
          : 'bg-[#3a3a3c] text-white ring-white/10 hover:bg-[#48484a] hover:ring-white/25'
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
