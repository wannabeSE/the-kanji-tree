<template>
  <div
    class="relative flex h-screen overflow-hidden bg-[#4e4e4e] text-neutral-100"
  >
    <aside
      class="flex w-52 shrink-0 flex-col gap-4 border-r border-black/20 bg-[#3f3f3f] p-4"
    >
      <h1 class="text-lg font-semibold tracking-tight">Kanji Tree</h1>

      <form class="space-y-2" @submit.prevent="onSearch">
        <input
          v-model="q"
          type="search"
          placeholder="Enter Kanji…"
          class="w-full rounded border border-white/15 bg-[#2f2f2f] px-3 py-2 text-sm outline-none placeholder:text-neutral-400 focus:border-white/40"
        />
        <button
          type="submit"
          class="w-full rounded bg-white/10 px-3 py-1.5 text-sm hover:bg-white/15 disabled:opacity-50"
          :disabled="searchStatus === 'pending'"
        >
          Search
        </button>
      </form>

      <p v-if="searchStatus === 'pending'" class="text-xs text-neutral-400">
        Searching…
      </p>
      <p
        v-else-if="searchResults && !searchResults.results.length"
        class="text-xs text-neutral-400"
      >
        No results for “{{ searchResults.query.q }}”.
      </p>
      <ul
        v-else-if="searchResults?.results?.length"
        class="flex flex-wrap gap-1"
      >
        <li v-for="item in searchResults.results" :key="item.kanji">
          <button
            type="button"
            class="rounded bg-white px-2 py-0.5 text-xl text-neutral-900"
            @click="setRoot(item.kanji)"
          >
            {{ item.kanji }}
          </button>
        </li>
      </ul>

      <div class="space-y-1 text-sm text-neutral-300">
        <p>Branch: {{ tree?.stats.branch ?? "—" }}</p>
        <p>Total: {{ tree?.stats.total ?? "—" }}</p>
        <p>Radicals: {{ tree?.stats.radicals ?? "—" }}</p>
      </div>

      <p class="mt-auto text-xs leading-relaxed text-neutral-400">
        Drag to pan. Scroll to zoom. Click a node for details. Red arrow expands
        children.
      </p>
    </aside>

    <main class="relative min-h-0 min-w-0 flex-1">
      <p
        v-if="treeStatus === 'pending'"
        class="absolute inset-0 grid place-items-center text-sm text-neutral-300"
      >
        Loading graph…
      </p>
      <div class="absolute inset-0">
        <ClientOnly>
          <KanjiGraph
            v-if="tree?.tree"
            :tree="tree.tree"
            :selected-id="selectedId"
            @select="selectKanji"
          />
        </ClientOnly>
      </div>
    </main>

    <aside
      v-if="panelOpen && selected"
      class="absolute right-0 top-0 z-10 flex h-full w-80 max-w-[45vw] shrink-0 flex-col overflow-y-auto border-l border-black/10 bg-[#ececec] text-neutral-900 shadow-xl"
    >
      <div class="space-y-4 p-5">
        <div class="flex items-start justify-between gap-3">
          <p
            v-if="selected.jlpt != null"
            class="rounded bg-neutral-800 px-2 py-0.5 text-xs text-white"
          >
            N{{ selected.jlpt }}
          </p>
          <button
            type="button"
            class="ml-auto text-neutral-500"
            aria-label="Close details"
            @click="panelOpen = false"
          >
            ×
          </button>
        </div>

        <KanjiCard :kanji="selected" />

        <button
          type="button"
          class="text-xs text-neutral-500 underline"
          @click="setRoot(selected.kanji)"
        >
          Use as root
        </button>

        <section v-if="fromParents.length" class="space-y-2">
          <h2
            class="text-xs font-semibold uppercase tracking-wide text-neutral-500"
          >
            How it is formed
          </h2>
          <KanjiFormula
            v-for="transform in fromParents"
            :key="transform.formula"
            :transform="transform"
            highlight="child"
            @select="selectKanji"
          />
        </section>

        <section v-if="toChildren.length" class="space-y-2">
          <h2
            class="text-xs font-semibold uppercase tracking-wide text-neutral-500"
          >
            Add a component
          </h2>
          <div class="max-h-64 space-y-2 overflow-y-auto">
            <KanjiFormula
              v-for="transform in toChildren.slice(0, 12)"
              :key="transform.formula"
              :transform="transform"
              highlight="parent"
              @select="selectKanji"
            />
          </div>
        </section>

        <p v-if="selectedStatus === 'pending'" class="text-sm text-neutral-500">
          Loading…
        </p>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
const q = ref("");
const root = ref("木");
const selectedId = ref("木");
const panelOpen = ref(false);

const { data: tree, status: treeStatus } = await useFetch("/api/kanji/tree", {
  query: computed(() => ({ root: root.value || undefined })),
  watch: [root],
});

const {
  data: searchResults,
  execute: runSearch,
  status: searchStatus,
} = await useFetch("/api/search", {
  query: computed(() => ({ q: q.value })),
  immediate: false,
  watch: false,
});

const { data: selected, status: selectedStatus } = await useFetch(
  () => `/api/kanji/${encodeURIComponent(selectedId.value)}`,
  { watch: [selectedId] },
);

function onSearch() {
  if (q.value.trim()) runSearch();
}

function selectKanji(id: string) {
  selectedId.value = id;
  panelOpen.value = true;
}

function setRoot(id: string) {
  root.value = id;
  selectedId.value = id;
  panelOpen.value = true;
}

const fromParents = computed(() => selected.value?.fromParents ?? []);
const toChildren = computed(() => selected.value?.toChildren ?? []);
</script>
