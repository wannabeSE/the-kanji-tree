<template>
  <div>
    <div class="flex h-28 items-end gap-1" role="list">
      <div
        v-for="bar in props.bars"
        :key="bar.key"
        role="listitem"
        class="group relative flex h-full flex-1 flex-col justify-end"
        :aria-label="`${bar.label}: ${bar.value}`"
        :title="`${bar.label}: ${bar.value}`"
      >
        <span
          v-if="bar.value"
          class="mb-0.5 text-center text-[9px] tabular-nums text-neutral-500"
          >{{ bar.value }}</span
        >
        <span
          class="block w-full rounded-t bg-sky-400/80"
          :style="{
            height: `${max ? (bar.value / max) * 80 : 0}%`,
            minHeight: bar.value ? '2px' : '0',
          }"
        />
      </div>
    </div>
    <div class="mt-1 flex gap-1 text-[9px] text-neutral-500">
      <span
        v-for="(bar, index) in props.bars"
        :key="bar.key"
        class="flex flex-1 justify-center overflow-visible whitespace-nowrap"
      >
        {{ index % props.labelEvery === 0 ? bar.label : "" }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    bars: { key: string; label: string; value: number }[];
    labelEvery?: number;
  }>(),
  { labelEvery: 1 },
);

const max = computed(() => Math.max(0, ...props.bars.map((bar) => bar.value)));
</script>
