import schema from "../database/schema.sql";

export default defineNitroPlugin(async () => {
  await migrate(schema);
});
