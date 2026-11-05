<template>
  <span lang="ja"
    >{{ stem
    }}<span v-if="okurigana" class="opacity-50">{{ okurigana }}</span></span
  >
</template>

<script setup lang="ts">
/** Kun readings mark okurigana with a dot (た.べる): show the kana ending dimmed. */
const props = defineProps<{ reading: string }>();

const stem = computed(() => props.reading.split(".")[0]);
const okurigana = computed(() => props.reading.split(".")[1] ?? "");
</script>
