/** { 木: "mature", 林: "learning", … } for every kanji the user has touched. */
export default defineEventHandler((event) =>
  Object.fromEntries(userStatuses(meId(event))),
);
