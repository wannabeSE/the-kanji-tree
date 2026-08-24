<template>
  <div class="grid grid-cols-2 gap-4">
    <figure class="text-center">
      <figcaption class="mb-2 text-xs uppercase tracking-wide text-neutral-500">
        Parent
      </figcaption>
      <div
        v-if="props.parentSvg"
        class="mx-auto aspect-square max-w-40 text-neutral-400"
        v-html="props.parentSvg"
      />
      <div
        v-else
        class="mx-auto flex aspect-square max-w-40 items-center justify-center text-6xl text-neutral-400"
      >
        {{ props.parent }}
      </div>
    </figure>

    <figure class="text-center">
      <figcaption class="mb-2 text-xs uppercase tracking-wide text-neutral-500">
        Child
        <span v-if="props.addedStrokes != null" class="text-neutral-800">
          (+{{ props.addedStrokes }} strokes)
        </span>
      </figcaption>
      <div
        v-if="props.childSvg"
        class="mx-auto aspect-square max-w-40 text-neutral-900"
        v-html="props.childSvg"
      />
      <div
        v-else
        class="mx-auto flex aspect-square max-w-40 items-center justify-center text-6xl"
      >
        {{ props.child }}
      </div>
    </figure>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  parent: string;
  child: string;
  parentSvg?: string | null;
  childSvg?: string | null;
  addedStrokes?: number;
}>();
</script>
