# `prune.databaseUrlCommand`

A complete shell command that prints the PostgreSQL URL. Configure it inside `prune` in
`.memories/config.json`. Packages inherit it unless they supply another command or disable
pruning with `prune: false`.

```json
{
  "prune": {
    "databaseUrlCommand": "doppler secrets get MEMA_DATABASE_URL --plain --project my-project --config dev"
  }
}
```

The value must be a nonempty string without NUL characters. The old `database` object and
separate `args` field are not supported.

## Execution

The command runs from the owning Git repository root, including when init targets a package.
Its working directory does not guarantee which secrets project it selects: configure explicit
provider project/environment arguments when needed. The provider CLI must be installed and
authenticated in the environment running Mema.

Mema uses the platform's default shell: `/bin/sh` on Unix and `ComSpec` (normally `cmd.exe`) on
Windows. Quoted arguments, pipes, redirection, and `&&` use that shell's normal syntax. For
example, `prepare-credentials && read-database-url` runs the second command only if the first
succeeds. A provider that returns JSON can be piped into a tool that extracts the URL.

The shell is noninteractive; terminal aliases and functions are not automatically available.
To use another shell's syntax, invoke that shell explicitly, such as `bash -c '...'` or
`pwsh -Command '...'`. Commands are executable repository configuration; review them as you
would other project scripts. Mema runs the configured string as supplied, without appending
memory content or other tool arguments.

## Output

The complete command must exit successfully and print exactly one `postgres://` or
`postgresql://` URL to stdout, optionally followed by one LF or CRLF. JSON, logs, multiple
values, empty output, and unencoded whitespace are rejected. Send diagnostics to stderr;
when chaining commands, only the command returning the URL should write to stdout.

Each output stream is limited to 16 KiB and execution to 15 seconds. A timeout or output-limit
failure terminates the shell and its pipeline children. Command text and captured output are
not included in errors. The URL is not written to config, logged, or assigned to `process.env`.

Mema does not load `.env` files, read `MEMA_DATABASE_URL` as a fallback, or maintain a
home-directory credentials map. That name in the example is simply the secret's name in Doppler.

## Database setup

Every accepted `mema init` setup with pruning enabled requires a fresh command in one prompt,
even when a command is already saved or inherited. Blank input is rejected; saved commands are
not offered as defaults or executed automatically. A command failure or invalid PostgreSQL URL
prompts for another command in the same run.

After validation, Mema applies pending bundled migrations and saves the new command under
`prune.databaseUrlCommand` in the target's config. Package setup leaves the root config unchanged.
Canceling or a migration failure leaves existing config unchanged. Disabled pruning and declined
reconfiguration do not execute a command or touch the database.

Use a direct or session-pooled PostgreSQL connection. Transaction-pooling endpoints are not
supported for setup because its advisory lock must remain on one server session. The database
role needs permission to create the `mema` schema and create/alter its objects. The connection
timeout is 10 seconds; each SQL statement, including waiting for the migration lock, has a
30-second timeout.

See [database migrations](../database.md) for schema ownership, upgrade behavior, and tests.
