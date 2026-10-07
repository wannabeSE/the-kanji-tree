<template>
  <header
    class="z-20 flex shrink-0 items-center gap-4 border-b border-white/10 bg-[#1c1c1e]/85 px-4 py-4 backdrop-blur-xl md:px-8"
  >
    <NuxtLink to="/" class="text-sm font-semibold tracking-tight text-white">
      Kanji Tree
    </NuxtLink>
    <nav class="flex items-center gap-1 rounded-full bg-white/5 p-1 text-sm">
      <NuxtLink
        to="/"
        class="rounded-full px-3 py-1 font-medium transition"
        :class="
          active === 'explorer'
            ? 'bg-white text-neutral-900'
            : 'text-neutral-400 hover:text-white'
        "
      >
        Explorer
      </NuxtLink>
      <NuxtLink
        to="/frequency"
        class="rounded-full px-3 py-1 font-medium transition"
        :class="
          active === 'frequency'
            ? 'bg-white text-neutral-900'
            : 'text-neutral-400 hover:text-white'
        "
      >
        Common kanji
      </NuxtLink>
    </nav>
    <div class="ml-auto flex min-h-8 min-w-8 items-center justify-end gap-2">
      <span
        v-if="rootLabel"
        class="hidden rounded-full bg-white/10 px-2 py-0.5 text-xs text-neutral-400 md:inline"
      >
        {{ rootLabel }}
      </span>
      <button
        v-if="active === 'explorer'"
        type="button"
        class="rounded-full p-2 text-neutral-400 transition hover:bg-white/10 hover:text-white md:hidden"
        aria-label="Open search menu"
        @click="menuOpen = true"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="size-4"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
const route = useRoute();
const { rootLabel, menuOpen } = useExplorerHeader();

const active = computed(() =>
  route.path.startsWith("/frequency") ? "frequency" : "explorer",
);
</script>
