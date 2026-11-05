<template>
  <form class="space-y-2" @submit.prevent="save">
    <label class="block space-y-1">
      <span class="eyebrow block">Your mnemonic</span>
      <textarea
        v-model="text"
        rows="3"
        maxlength="2000"
        class="field w-full resize-y leading-relaxed"
        :placeholder="`A short story that ties ${props.kanji} to its meaning and reading`"
        :disabled="loading"
      />
    </label>
    <div class="flex items-center gap-2">
      <button
        type="submit"
        class="btn-secondary px-3 py-1 text-xs"
        :disabled="saving || !dirty"
      >
        {{ saving ? "Saving…" : "Save mnemonic" }}
      </button>
      <span
        v-if="savedText !== null && !dirty"
        class="text-xs text-neutral-500"
      >
        {{ savedText ? "Saved. It shows on the answer side in reviews." : "" }}
      </span>
      <span v-if="error" role="alert" class="text-xs text-red-400">{{
        error
      }}</span>
    </div>
  </form>
</template>

<script setup lang="ts">
/** Loads and saves the user's note for one kanji. An empty note starts from the Heisig keyword. */
const props = defineProps<{ kanji: string; keyword?: string | null }>();

const text = ref("");
const savedText = ref<string | null>(null);
const loading = ref(false);
const saving = ref(false);
const error = ref("");
const dirty = computed(
  () => savedText.value !== null && text.value.trim() !== savedText.value,
);

async function load() {
  loading.value = true;
  error.value = "";
  try {
    const { mnemonic } = await $fetch<{ mnemonic: string }>(
      `/api/me/notes/${encodeURIComponent(props.kanji)}`,
    );
    savedText.value = mnemonic;
    text.value = mnemonic || (props.keyword ? `${props.keyword}: ` : "");
  } catch (e) {
    error.value = errorMessage(e, "Could not load your mnemonic");
  } finally {
    loading.value = false;
  }
}

async function save() {
  saving.value = true;
  error.value = "";
  try {
    const { mnemonic } = await $fetch<{ mnemonic: string }>(
      `/api/me/notes/${encodeURIComponent(props.kanji)}`,
      { method: "PUT", body: { mnemonic: text.value } },
    );
    savedText.value = mnemonic;
  } catch (e) {
    error.value = errorMessage(e, "Could not save");
  } finally {
    saving.value = false;
  }
}

watch(() => props.kanji, load, { immediate: true });
</script>
