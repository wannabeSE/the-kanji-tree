<template>
  <div class="h-full overflow-y-auto">
    <main class="mx-auto w-full max-w-sm space-y-6 px-4 py-14">
      <div class="space-y-2">
        <h1 class="text-3xl font-semibold tracking-tight">
          {{ mode === "login" ? "Log in" : "Create an account" }}
        </h1>
        <p class="text-sm leading-relaxed text-neutral-400">
          Your account keeps the kanji you study, your review schedule, and your
          progress, on any device.
        </p>
      </div>

      <div class="flex w-fit gap-1 rounded-full bg-white/5 p-1 text-sm">
        <button
          v-for="option in MODES"
          :key="option.id"
          type="button"
          class="rounded-full px-3.5 py-1.5 font-medium transition"
          :class="
            mode === option.id
              ? 'bg-white text-neutral-900'
              : 'text-neutral-400 hover:text-white'
          "
          @click="mode = option.id"
        >
          {{ option.label }}
        </button>
      </div>

      <form class="space-y-3" @submit.prevent="submit">
        <label class="block space-y-1 text-sm">
          <span class="text-neutral-400">Email</span>
          <input
            v-model="email"
            type="email"
            autocomplete="email"
            required
            class="w-full rounded-xl bg-white/5 px-4 py-2.5 outline-none ring-1 ring-white/10 focus:ring-white/30"
          />
        </label>
        <label class="block space-y-1 text-sm">
          <span class="text-neutral-400">Password</span>
          <input
            v-model="password"
            type="password"
            :autocomplete="
              mode === 'login' ? 'current-password' : 'new-password'
            "
            minlength="8"
            required
            class="w-full rounded-xl bg-white/5 px-4 py-2.5 outline-none ring-1 ring-white/10 focus:ring-white/30"
          />
          <span v-if="mode === 'register'" class="text-xs text-neutral-500">
            At least 8 characters.
          </span>
        </label>

        <p v-if="error" role="alert" class="text-sm text-red-400">
          {{ error }}
        </p>

        <button
          type="submit"
          class="w-full rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-200 disabled:opacity-50"
          :disabled="pending"
        >
          {{
            pending
              ? "Please wait…"
              : mode === "login"
                ? "Log in"
                : "Create account"
          }}
        </button>
      </form>
    </main>
  </div>
</template>

<script setup lang="ts">
const MODES = [
  { id: "login", label: "Log in" },
  { id: "register", label: "Create account" },
] as const;

const route = useRoute();
const { fetch: fetchSession } = useUserSession();
const { refresh: refreshStatuses } = useKanjiStatus();

const mode = ref<"login" | "register">("login");
const email = ref("");
const password = ref("");
const error = ref("");
const pending = ref(false);

async function submit() {
  pending.value = true;
  error.value = "";
  try {
    await $fetch(`/api/auth/${mode.value}`, {
      method: "POST",
      body: {
        email: email.value,
        password: password.value,
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    });
    await fetchSession();
    await refreshStatuses();
    const redirect = route.query.redirect;
    await navigateTo(
      typeof redirect === "string" && /^\/(?!\/)/.test(redirect)
        ? redirect
        : "/progress",
    );
  } catch (e) {
    error.value = errorMessage(e);
  } finally {
    pending.value = false;
  }
}
</script>
