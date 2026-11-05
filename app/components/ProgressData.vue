<template>
  <section class="card space-y-3">
    <h2 class="eyebrow">Your data</h2>
    <p class="text-xs leading-relaxed text-neutral-500">
      The JSON file holds every card, review, and mnemonic and can be imported
      again here. The CSV has one row per card for spreadsheets.
    </p>
    <div class="flex flex-wrap items-center gap-2">
      <a href="/api/me/export?format=json" class="btn-secondary" download
        >Export JSON</a
      >
      <a href="/api/me/export?format=csv" class="btn-secondary" download
        >Export CSV</a
      >
      <label class="btn-secondary cursor-pointer">
        {{ importing ? "Importing…" : "Import JSON" }}
        <input
          type="file"
          accept="application/json,.json"
          class="sr-only"
          :disabled="importing"
          @change="importFile"
        />
      </label>
    </div>
    <p v-if="message" class="text-sm text-neutral-300">{{ message }}</p>
    <p v-if="error" role="alert" class="text-sm text-red-400">{{ error }}</p>
  </section>
</template>

<script setup lang="ts">
const emit = defineEmits<{ imported: [] }>();
const { refresh: refreshStatuses } = useKanjiStatus();

const importing = ref(false);
const message = ref("");
const error = ref("");

async function importFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (!file) return;
  importing.value = true;
  message.value = "";
  error.value = "";
  try {
    const body = JSON.parse(await file.text());
    const res = await $fetch<{
      items: number;
      reviews: number;
      notes: number;
      skipped: number;
    }>("/api/me/import", { method: "POST", body });
    message.value = `Imported ${res.items} cards, ${res.reviews} reviews, and ${res.notes} mnemonics${
      res.skipped ? ` (skipped ${res.skipped} invalid rows)` : ""
    }.`;
    await refreshStatuses();
    emit("imported");
  } catch (e) {
    error.value =
      e instanceof SyntaxError
        ? "That file isn't valid JSON."
        : errorMessage(e, "Import failed");
  } finally {
    importing.value = false;
  }
}
</script>
