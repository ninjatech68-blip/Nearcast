import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';

import {
  parseStoredDraft,
  serializeDraft,
  type LocalDraft,
} from '@/features/intents/domain/draft';

/**
 * Composer drafts, held on this device only (MUST-015). Nothing in this table
 * is sent anywhere: the publish transaction reads the composer's own state, and
 * `clearDraft` runs on publish and on account deletion.
 *
 * One row, because the composer edits one intent at a time.
 */
const DATABASE_NAME = 'nearcast-drafts.db';
const ROW_ID = 1;

let database: SQLiteDatabase | null = null;

function db(): SQLiteDatabase {
  if (database) return database;
  database = openDatabaseSync(DATABASE_NAME);
  database.execSync(
    `create table if not exists local_drafts (
       id integer primary key check (id = ${ROW_ID}),
       payload text not null
     );`,
  );
  return database;
}

/** Test seam: lets a test supply a database without a native module. */
export function _setDatabaseForTests(fake: SQLiteDatabase | null): void {
  database = fake;
}

export function loadDraft(): LocalDraft | null {
  try {
    const row = db().getFirstSync<{ payload: string }>(
      'select payload from local_drafts where id = ?',
      ROW_ID,
    );
    return parseStoredDraft(row?.payload);
  } catch {
    // A draft that cannot be read must never block composing a new one.
    return null;
  }
}

export function saveDraft(draft: LocalDraft): void {
  try {
    db().runSync(
      `insert into local_drafts (id, payload) values (?, ?)
       on conflict (id) do update set payload = excluded.payload`,
      ROW_ID,
      serializeDraft(draft),
    );
  } catch {
    // Losing a keystroke to a storage error is not worth interrupting writing.
  }
}

export function clearDraft(): void {
  try {
    db().runSync('delete from local_drafts where id = ?', ROW_ID);
  } catch {
    // Nothing to recover: the row is either gone or unreadable.
  }
}
