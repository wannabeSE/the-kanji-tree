<template>
  <div class="mx-auto max-w-3xl space-y-8 px-4 py-10">
    <NuxtLink to="/" class="text-sm text-neutral-600 underline">
      ← Explorer
    </NuxtLink>

    <p v-if="status === 'pending'" class="text-neutral-500">Loading…</p>
    <p v-else-if="error" class="text-red-600">Could not load {{ char }}.</p>

    <template v-else-if="kanji">
      <KanjiCard :kanji="kanji" />

      <section
        v-if="fromParents.length"
        class="space-y-3 border-t border-neutral-200 pt-6"
      >
        <h2
          class="text-sm font-semibold uppercase tracking-wide text-neutral-500"
        >
          How it is formed
        </h2>
        <ul class="space-y-2">
          <li v-for="transform in fromParents" :key="transform.formula">
            <KanjiFormula
              :transform="transform"
              highlight="child"
              @select="navigateTo(`/kanji/${encodeURIComponent($event)}`)"
            />
          </li>
        </ul>
        <StrokeCompare
          v-if="compare"
          :parent="compare.parent"
          :child="kanji.kanji"
        />
      </section>

      <section v-if="toChildren.length" class="space-y-2">
        <h2
          class="text-sm font-semibold uppercase tracking-wide text-neutral-500"
        >
          Add a component
        </h2>
        <ul class="space-y-2">
          <li v-for="transform in toChildren" :key="transform.formula">
            <KanjiFormula
              :transform="transform"
              highlight="parent"
              @select="navigateTo(`/kanji/${encodeURIComponent($event)}`)"
            />
          </li>
        </ul>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const char = computed(() =>
  decodeURIComponent(String(route.params.char ?? "")),
);

const {
  data: kanji,
  error,
  status,
} = await useFetch(() => `/api/kanji/${encodeURIComponent(char.value)}`, {
  watch: [char],
});

const fromParents = computed(() => kanji.value?.fromParents ?? []);
const toChildren = computed(() => kanji.value?.toChildren ?? []);
const compare = computed(() => fromParents.value[0] ?? null);
</script>
