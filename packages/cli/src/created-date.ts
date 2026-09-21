/**
 * UTC calendar date `YYYY-MM-DD` stored on each memory.
 * Prune measures unvotedTtl from midnight UTC on this day, not from Git history.
 */
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Turns a timestamp into the UTC calendar date insert writes. */
export function formatCreated(at: number) {
  if (!Number.isFinite(at)) {
    throw new Error("Expected a finite timestamp for created.");
  }
  return new Date(at).toISOString().slice(0, 10);
}

/**
 * YAML 1.1 can parse an unquoted `2026-09-19` as a Date.
 * Keep the UTC calendar day so a non-UTC host does not shift the stored date.
 */
export function coerceCreated(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime()))
    return formatCreated(value.getTime());
  return value;
}

/** True for real Gregorian UTC dates, not `2026-02-31`. */
export function isCreatedDate(value: string) {
  const match = DATE.exec(value);
  if (!match) return false;
  const at = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return formatCreated(at) === value;
}

/** Midnight UTC on the stored calendar date. */
export function createdMillis(created: string) {
  const match = DATE.exec(created);
  if (!match) {
    throw new Error("Expected a UTC calendar date, YYYY-MM-DD.");
  }
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}
