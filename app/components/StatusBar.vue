<template>
  <div class="space-y-1">
    <div class="flex items-baseline justify-between gap-2 text-sm">
      <span class="font-medium text-neutral-200">{{ props.label }}</span>
      <span class="tabular-nums text-xs text-neutral-400">
        <span class="font-semibold text-white">{{ props.tally.mature }}</span>
        known · {{ studying }} studying · {{ props.tally.total }} total
      </span>
    </div>
    <div
      class="flex h-2.5 overflow-hidden rounded-full bg-white/10"
      role="img"
      :aria-label="`${props.label}: ${props.tally.mature} known, ${studying} studying, of ${props.tally.total}`"
    >
      <span
        v-for="segment in segments"
        :key="segment.status"
        class="h-full"
        :style="{
          width: `${segment.pct}%`,
          backgroundColor: STATUS_STYLE[segment.status].dark,
        }"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
export interface StatusTally {
  total: number;
  new: number;
  learning: number;
  young: number;
  mature: number;
}

const props = defineProps<{ label: string; tally: StatusTally }>();

const studying = computed(
  () => props.tally.new + props.tally.learning + props.tally.young,
);

const segments = computed(() =>
  (["mature", "young", "learning", "new"] as const).map((status) => ({
    status,
    pct: props.tally.total
      ? (props.tally[status] / props.tally.total) * 100
      : 0,
  })),
);
</script>
