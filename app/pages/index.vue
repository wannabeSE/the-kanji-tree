<template>
  <div class="relative flex h-full min-h-0 flex-col md:flex-row">
    <button
      v-if="menuOpen"
      type="button"
      class="absolute inset-0 z-30 bg-black/50 md:hidden"
      aria-label="Close search menu"
      @click="menuOpen = false"
    />

    <aside
      class="absolute inset-y-0 right-0 z-40 flex h-full w-[min(18rem,85vw)] shrink-0 flex-col gap-5 border-l border-white/10 bg-[#1c1c1e] p-4 transition-transform duration-200 md:static md:z-auto md:h-auto md:w-56 md:translate-x-0 md:border-l-0 md:border-r md:pt-6 md:transition-none"
      :class="menuOpen ? 'translate-x-0' : 'translate-x-full'"
    >
      <div class="flex items-center justify-between gap-2 md:hidden">
        <p
          class="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500"
        >
          Search
        </p>
        <button
          type="button"
          class="rounded-full px-2 py-1 text-xl leading-none text-neutral-400 hover:bg-white/10"
          aria-label="Close search menu"
          @click="menuOpen = false"
        >
          ×
        </button>
      </div>

      <form class="space-y-2" @submit.prevent="onSearch">
        <input
          v-model="q"
          type="search"
          enterkeyhint="search"
          placeholder="Enter Kanji…"
          class="w-full rounded-full bg-white/5 px-4 py-2 text-sm outline-none ring-1 ring-white/10 placeholder:text-neutral-500 focus:ring-white/25"
        />
        <button
          type="submit"
          class="w-full rounded-full bg-white px-4 py-2 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-200 disabled:opacity-50"
          :disabled="searchStatus === 'pending' || !q.trim()"
        >
          Search
        </button>
      </form>

      <p v-if="searchStatus === 'pending'" class="text-sm text-neutral-500">
        Searching…
      </p>
      <p
        v-else-if="searchResults && !searchResults.results.length"
        class="text-sm text-neutral-500"
      >
        No results for “{{ searchResults.query.q }}”.
      </p>
      <ul
        v-else-if="searchResults?.results?.length"
        class="flex flex-wrap gap-2"
      >
        <li v-for="item in searchResults.results" :key="item.kanji">
          <button
            type="button"
            class="flex size-11 items-center justify-center rounded-2xl bg-[#2c2c2e] text-xl ring-1 ring-white/10 transition hover:-translate-y-0.5 hover:bg-[#3a3a3c] hover:ring-white/25"
            @click="setRoot(item.kanji)"
          >
            {{ item.kanji }}
          </button>
        </li>
      </ul>

      <div class="space-y-2">
        <p
          class="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500"
        >
          Graph
        </p>
        <div class="space-y-1 text-sm text-neutral-400">
          <p>Branch: {{ tree?.stats.branch ?? "—" }}</p>
          <p>Total: {{ tree?.stats.total ?? "—" }}</p>
          <p>Radicals: {{ tree?.stats.radicals ?? "—" }}</p>
        </div>
      </div>

      <div class="space-y-2">
        <p
          class="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500"
        >
          JLPT
        </p>
        <div class="flex flex-wrap gap-1">
          <span
            v-for="level in JLPT_SCALE"
            :key="level"
            class="rounded-full px-2 py-0.5 text-[10px] font-semibold"
            :style="{
              backgroundColor: jlptColors(level)?.bg,
              color: jlptColors(level)?.fg,
            }"
          >
            N{{ level }}
          </span>
        </div>
      </div>

      <p class="mt-auto text-xs leading-relaxed text-neutral-500">
        Drag to pan. Pinch or scroll to zoom. Tap a node for details. Red arrow
        expands children.
      </p>
    </aside>

    <main class="relative min-h-0 min-w-0 flex-1">
      <p
        v-if="treeStatus === 'pending'"
        class="absolute inset-0 grid place-items-center text-sm text-neutral-500"
      >
        Loading graph…
      </p>
      <div class="absolute inset-0 touch-none">
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

    <button
      v-if="panelOpen && selected"
      type="button"
      class="absolute inset-0 z-20 bg-black/40 md:hidden"
      aria-label="Close details"
      @click="panelOpen = false"
    />

    <aside
      v-if="panelOpen && selected"
      class="absolute inset-x-0 bottom-0 z-30 flex max-h-[78dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-[#2c2c2e] text-neutral-100 shadow-xl md:inset-y-0 md:right-0 md:left-auto md:max-h-none md:w-80 md:max-w-[45vw] md:rounded-none md:border-l md:border-y-0 md:border-r-0"
    >
      <div
        class="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-white/20 md:hidden"
        aria-hidden="true"
      />
      <div
        class="space-y-4 overflow-y-auto overscroll-contain p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
      >
        <div class="flex justify-end">
          <button
            type="button"
            class="grid h-8 w-8 place-items-center rounded-full text-xl leading-none text-neutral-400 hover:bg-white/10"
            aria-label="Close details"
            @click="panelOpen = false"
          >
            ×
          </button>
        </div>

        <KanjiCard :kanji="selected" />

        <button
          type="button"
          class="flex w-full items-center justify-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-200"
          @click="setRoot(selected.kanji)"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="size-4 shrink-0"
            aria-hidden="true"
          >
            <path d="M12 22V8" />
            <path d="M5 12H2a10 10 0 0 0 20 0h-3" />
            <circle cx="12" cy="5" r="3" />
          </svg>
          Use as root
        </button>

        <section v-if="fromParents.length" class="space-y-2">
          <h2
            class="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500"
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
            class="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500"
          >
            Add a component
          </h2>
          <div class="max-h-48 space-y-2 overflow-y-auto md:max-h-64">
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
import type { KanjiCardData } from "~/components/KanjiCard.vue";
import type { KanjiFormulaProps } from "~/components/KanjiFormula.vue";

type SelectedKanji = KanjiCardData & {
  fromParents?: KanjiFormulaProps[];
  toChildren?: KanjiFormulaProps[];
};

useHead({
  meta: [
    {
      name: "viewport",
      content:
        "width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1",
    },
  ],
});

const route = useRoute();

function rootFromQuery() {
  const value = route.query.root;
  return typeof value === "string" && value ? value : "木";
}

const q = ref("");
const root = ref(rootFromQuery());
const selectedId = ref(root.value);
const panelOpen = ref(false);
const { rootLabel, menuOpen } = useExplorerHeader();

rootLabel.value = root.value;
watch(root, (value) => {
  rootLabel.value = value;
});
onBeforeUnmount(() => {
  rootLabel.value = null;
  menuOpen.value = false;
});

watch(
  () => route.query.root,
  (value) => {
    if (typeof value === "string" && value && value !== root.value) {
      root.value = value;
      selectedId.value = value;
      panelOpen.value = true;
    }
  },
);

const { data: tree, status: treeStatus } = await useFetch("/api/kanji/tree", {
  query: computed(() => ({ root: root.value || undefined })),
  watch: [root],
});

const {
  data: searchResults,
  execute: runSearch,
  status: searchStatus,
} = await useFetch("/api/search", {
  query: computed(() => ({ q: q.value || undefined })),
  immediate: false,
  watch: false,
});

const { data: selected, status: selectedStatus } =
  await useFetch<SelectedKanji>(
    () => `/api/kanji/${encodeURIComponent(selectedId.value)}`,
    { watch: [selectedId] },
  );

function onSearch() {
  if (q.value.trim()) runSearch();
}

function selectKanji(id: string) {
  selectedId.value = id;
  panelOpen.value = true;
  menuOpen.value = false;
}

function setRoot(id: string) {
  root.value = id;
  selectedId.value = id;
  panelOpen.value = true;
  menuOpen.value = false;
}

const fromParents = computed(() => selected.value?.fromParents ?? []);
const toChildren = computed(() => selected.value?.toChildren ?? []);
</script>
