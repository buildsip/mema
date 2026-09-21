# Database migrations

Mema uses Drizzle ORM with `pg`. PostgreSQL is optional and stores upvote events, not memory
content. Database setup is implemented; upvote and pruning CLI/MCP operations are not yet exposed.

Before opening a connection, Mema converts the legacy `sslmode` values `prefer`, `require`, and
`verify-ca` to `verify-full`. This preserves pg's current certificate and hostname verification
and removes its warning about future SSL defaults. Explicit `uselibpqcompat=true` and other SSL
modes are preserved. Only the URL passed to pg changes; the credential command and its saved
configuration stay unchanged.

## Shared event table

One `mema.upvotes` table is shared by all repositories using the database:

| Column       | PostgreSQL type            | Meaning                                                             |
| ------------ | -------------------------- | ------------------------------------------------------------------- |
| `id`         | `uuid`, primary key        | Event ID; future callers must reuse it when retrying the same event |
| `memory_id`  | `text`, required, nonblank | Stable ID from memory frontmatter                                   |
| `actor`      | `text`, required           | Checked against `human` and `agent`                                 |
| `created_at` | `timestamptz`, required    | Defaults to the database's current timestamp                        |

An index on `memory_id` supports looking up votes. There is no repository column or
per-repository table. New memories generate UUIDs; existing string IDs remain accepted.
Equal memory IDs refer to the same logical memory and share votes in a shared database.
Independent copies must use new memory IDs. Git owns the memory files, so there is no foreign key
to a second database copy of those memories. `actor` records a category, not an authenticated user.

## Initialization and upgrades

`mema init` with pruning enabled checks migration history every time setup is accepted,
including when another repository has already initialized the same database. It never decides
whether to migrate based on existing votes or `config.json.version`.

1. Collect and validate a fresh [`prune.databaseUrlCommand` credential command](./config/databaseUrlCommand.md) and execute it from the owning repository root.
2. Open a dedicated PostgreSQL connection and acquire Mema's database-local advisory lock.
3. Verify that stored migration timestamps and SQL hashes are an exact prefix of this release's
   bundled migrations. Refuse unknown, edited, or newer history before applying migrations.
4. Apply only the pending migrations using Drizzle. Pending SQL and its history records are
   committed together; failures roll back that transaction.
5. Close the connection, releasing the lock even if setup fails.

History lives in `mema.__drizzle_migrations`, separate from other applications' Drizzle history.
Applied migrations are immutable. The first setup creates `mema.upvotes`; later identical runs
do nothing. Upgrading applies new reviewed SQL to the existing schema, preserving its votes.
Do not use `drizzle-kit push`, drop/recreate the schema, or edit history to force compatibility.

An existing `mema` schema without a migration journal is refused even if its tables are empty.
An empty journal from a failed first migration can be retried when it contains no application
tables. Missing history must be restored from backup, or setup must target a different database.
Unrelated schemas and tables are outside Mema's migrations.

Migrations run only during accepted init with pruning enabled, not ordinary memory operations.
After upgrading the installed package, rerun init from the repository root, accept reconfiguration,
and keep pruning enabled. Editing the config-file version does not upgrade the database.
If database setup fails, init does not save its proposed config changes. Database migrations
cannot be rolled back automatically if a later CLI installation or filesystem write fails;
rerunning init safely skips the migrations already committed.

## Developing a migration

Edit `packages/mema/src/upvotes.ts`, then run from `packages/mema`:

```sh
pnpm db:generate
```

Review and commit the generated SQL, journal, and snapshot under `migrations/`. Never edit an
already released migration. Prefer changes that remain compatible with running older clients;
destructive changes need a separate explicit upgrade plan and backups. Transactional execution
protects against failures, not against intentionally destructive SQL.

`pnpm build` copies migrations into `dist/migrations`; the npm package already includes `dist`.
Runtime paths resolve from the installed package, never the consumer repository. Drizzle Kit
and embedded PostgreSQL are development dependencies only.

`pnpm test` starts a disposable PostgreSQL instance on localhost under a temporary directory.
It does not use developer credentials or an existing database. Tests cover repeated and concurrent
init, existing votes, additive upgrades, failed SQL rollback, history mismatches, and packaged assets.
The test runtime requires local process/port permissions and a non-root user; its platform package
has an approved install script that restores packaged library symlinks.
