import schema from "../database/schema.sql";

export default defineNitroPlugin(() => {
  db().exec(schema);
});
