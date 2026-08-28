/**
 * Generate database.types.ts from a running PostgreSQL, without Docker.
 *
 * `supabase gen types --local` runs postgres-meta inside the Supabase
 * container, and even `--db-url` shells out to the Docker API. This
 * calls the same package's generator directly against a connection
 * string, so the output is produced by the same code path.
 *
 * Only the `public` schema is emitted. `supabase gen types --local`
 * also emits a `graphql_public` block from the pg_graphql extension,
 * which is a Supabase build and not installable into a plain
 * PostgreSQL. Nothing in the app references that block.
 */
import { PostgresMeta } from '@supabase/postgres-meta/dist/lib/index.js';
import { getGeneratorMetadata } from '@supabase/postgres-meta/dist/lib/generators.js';
import { apply } from '@supabase/postgres-meta/dist/server/templates/typescript.js';

const connectionString = process.argv[2];
if (!connectionString) {
  console.error('usage: node scripts/gen-types.mjs <postgres-connection-string>');
  process.exit(1);
}

const pgMeta = new PostgresMeta({ connectionString, max: 1 });
const { data, error } = await getGeneratorMetadata(pgMeta, {
  includedSchemas: ['public'],
  excludedSchemas: [],
});
if (error) {
  console.error(error.message);
  process.exit(1);
}

process.stdout.write(await apply({ ...data, detectOneToOneRelationships: true }));
await pgMeta.end();
