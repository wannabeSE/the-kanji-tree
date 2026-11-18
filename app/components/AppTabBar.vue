<template>
  <nav
    class="grid shrink-0 grid-cols-5 border-t border-white/10 bg-[#1c1c1e] pb-[env(safe-area-inset-bottom)] md:hidden"
    aria-label="Primary"
  >
    <NuxtLink
      v-for="item in tabs"
      :key="item.to"
      :to="item.to"
      class="flex min-w-0 flex-col items-center gap-1 px-0.5 pt-2 pb-1.5 text-[10px] font-medium leading-tight"
      :class="
        active === item.to ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'
      "
      :aria-current="active === item.to ? 'page' : undefined"
    >
      <span
        class="grid size-7 place-items-center rounded-full"
        :class="active === item.to ? 'bg-white/10' : ''"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="size-5"
          aria-hidden="true"
        >
          <template v-if="item.icon === 'tree'">
            <path d="M12 22V8" />
            <path d="M5 12H2a10 10 0 0 0 20 0h-3" />
            <circle cx="12" cy="5" r="3" />
          </template>
          <template v-else-if="item.icon === 'list'">
            <path d="M8 6h13M8 12h13M8 18h13" />
            <path d="M3 6h.01M3 12h.01M3 18h.01" />
          </template>
          <template v-else-if="item.icon === 'book'">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </template>
          <template v-else-if="item.icon === 'refresh'">
            <path d="M3 12a9 9 0 1 0 3-6.7" />
            <path d="M3 4v5h5" />
          </template>
          <template v-else-if="item.icon === 'quiz'">
            <circle cx="12" cy="12" r="9" />
            <path d="M9.1 9a2.9 2.9 0 0 1 5.6 1c0 2-2.7 2.2-2.7 4" />
            <path d="M12 17h.01" />
          </template>
        </svg>
      </span>
      <span class="max-w-full text-center">{{ item.label }}</span>
    </NuxtLink>
  </nav>
</template>

<script setup lang="ts">
const { NAV, active } = useNav();
const tabs = NAV.filter((item) => item.to !== "/progress");
</script>
