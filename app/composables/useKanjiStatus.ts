import type { KanjiStatus, StudyAction } from "#shared/utils/status";

/** One shared map of the logged-in user's kanji statuses, used by every overlay. */
export function useKanjiStatus() {
  const { loggedIn } = useUserSession();
  const statuses = useState<Record<string, KanjiStatus>>(
    "kanji-status",
    () => ({}),
  );

  async function refresh() {
    statuses.value = loggedIn.value
      ? await $fetch<Record<string, KanjiStatus>>("/api/me/status").catch(
          () => ({}),
        )
      : {};
  }

  async function mark(kanji: string, action: StudyAction) {
    const { status } = await $fetch<{ status: KanjiStatus | null }>(
      `/api/me/kanji/${encodeURIComponent(kanji)}`,
      { method: "PUT", body: { action } },
    );
    const next = { ...statuses.value };
    if (status) next[kanji.normalize("NFC")] = status;
    else delete next[kanji.normalize("NFC")];
    statuses.value = next;
    return status;
  }

  function statusOf(kanji: string): KanjiStatus | null {
    return statuses.value[kanji.normalize("NFC")] ?? null;
  }

  return { statuses, refresh, mark, statusOf, loggedIn };
}
