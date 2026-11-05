/** { 木: "mature", 林: "learning", … } for every kanji the user has touched. */
export default defineEventHandler(async (event) =>
  Object.fromEntries(await userStatuses(meId(event))),
);
