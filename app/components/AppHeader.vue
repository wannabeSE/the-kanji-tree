<template>
  <header
    class="z-20 flex shrink-0 items-center gap-3 border-b border-white/10 bg-[#1c1c1e]/85 px-4 py-4 backdrop-blur-xl md:gap-4 md:px-8"
  >
    <NuxtLink
      to="/"
      class="hidden text-sm font-semibold tracking-tight text-white lg:block"
    >
      Kanji Tree
    </NuxtLink>
    <nav
      class="flex min-w-0 items-center gap-1 overflow-x-auto rounded-full bg-white/5 p-1 text-sm [scrollbar-width:none]"
    >
      <NuxtLink
        v-for="item in NAV"
        :key="item.to"
        :to="item.to"
        class="shrink-0 rounded-full px-3 py-1 font-medium transition"
        :class="
          active === item.to
            ? 'bg-white text-neutral-900'
            : 'text-neutral-400 hover:text-white'
        "
      >
        {{ item.label }}
      </NuxtLink>
    </nav>
    <div
      class="ml-auto flex min-h-8 min-w-8 shrink-0 items-center justify-end gap-2"
    >
      <span
        v-if="rootLabel"
        class="hidden rounded-full bg-white/10 px-2 py-0.5 text-xs text-neutral-400 md:inline"
      >
        {{ rootLabel }}
      </span>
      <button
        v-if="active === '/'"
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
      <details v-if="loggedIn" ref="accountMenu" class="relative">
        <summary
          class="grid size-8 cursor-pointer list-none place-items-center rounded-full bg-white/10 text-sm font-semibold uppercase text-white hover:bg-white/20 [&::-webkit-details-marker]:hidden"
          :aria-label="`Account menu for ${user?.email}`"
        >
          {{ user?.email?.[0] ?? "?" }}
        </summary>
        <div
          class="absolute right-0 z-50 mt-2 w-56 space-y-1 rounded-2xl border border-white/10 bg-[#2c2c2e] p-2 text-sm shadow-xl"
        >
          <p class="truncate px-2 py-1 text-xs text-neutral-500">
            {{ user?.email }}
          </p>
          <NuxtLink
            to="/progress"
            class="block rounded-lg px-2 py-1.5 hover:bg-white/10"
            @click="closeMenu"
          >
            Progress and goals
          </NuxtLink>
          <button
            type="button"
            class="block w-full rounded-lg px-2 py-1.5 text-left text-red-300 hover:bg-white/10"
            @click="logout"
          >
            Log out
          </button>
        </div>
      </details>
      <NuxtLink
        v-else
        to="/login"
        class="rounded-full bg-white px-3 py-1 text-sm font-semibold text-neutral-900 hover:bg-neutral-200"
      >
        Log in
      </NuxtLink>
    </div>
  </header>
</template>

<script setup lang="ts">
const NAV = [
  { to: "/", label: "Explorer" },
  { to: "/frequency", label: "Common kanji" },
  { to: "/learn", label: "Learn" },
  { to: "/review", label: "Review" },
  { to: "/quiz", label: "Quiz" },
  { to: "/progress", label: "Progress" },
] as const;

const route = useRoute();
const { rootLabel, menuOpen } = useExplorerHeader();
const { loggedIn, user, fetch: fetchSession } = useUserSession();
const { refresh: refreshStatuses } = useKanjiStatus();
const accountMenu = ref<HTMLDetailsElement | null>(null);

const active = computed(() =>
  route.path === "/"
    ? "/"
    : (NAV.find((item) => item.to !== "/" && route.path.startsWith(item.to))
        ?.to ?? null),
);

function closeMenu() {
  if (accountMenu.value) accountMenu.value.open = false;
}

async function logout() {
  closeMenu();
  await $fetch("/api/auth/logout", { method: "POST" });
  await fetchSession();
  await refreshStatuses();
  await navigateTo("/");
}
</script>
