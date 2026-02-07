import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/admin/schema/tenant.schema.ts',
  out: './drizzle',
});
