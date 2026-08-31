/**
 * Guards the database scripts.
 *
 * `SUPABASE_DB_URL` is a secret, so it is not in `.env`: npm does not load
 * `.env` for scripts, and a connection string with a password in it does not
 * belong in a file that lives next to the repository. It is exported in the
 * shell instead.
 *
 * Without this check, an unset variable becomes `--db-url ""` and the Supabase
 * CLI reports a connection failure, which reads as "the database is down"
 * rather than "you did not set the variable". One is a five-second fix and the
 * other is half an hour.
 */

const url = process.env.SUPABASE_DB_URL;

if (url === undefined || url.trim() === '') {
  console.error(
    [
      'SUPABASE_DB_URL is not set.',
      '',
      'It is the hosted project\'s connection string, from the Supabase',
      'dashboard: Project Settings -> Database -> Connection string (URI).',
      'It contains the database password, so export it in your shell rather',
      'than committing it:',
      '',
      '  export SUPABASE_DB_URL="postgresql://postgres:...@db.<ref>.supabase.co:5432/postgres"',
      '',
      'Add that line to ~/.zshrc to keep it across sessions.',
    ].join('\n'),
  );
  process.exit(1);
}

if (url.includes('127.0.0.1') || url.includes('localhost')) {
  console.error(
    [
      'SUPABASE_DB_URL points at a local database.',
      '',
      'Nothing in this project runs locally. Point it at the hosted project,',
      'so a test result describes the database the app actually talks to.',
    ].join('\n'),
  );
  process.exit(1);
}
