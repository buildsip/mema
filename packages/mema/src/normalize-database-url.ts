/** Pins pg's legacy SSL aliases to their current certificate-verifying behavior. */
export function normalizeDatabaseUrl(value: string) {
  const url = new URL(value);
  // pg uses the last value if an option is repeated in the query string.
  const mode = url.searchParams.getAll("sslmode").at(-1);
  const compat = url.searchParams.getAll("uselibpqcompat").at(-1);
  if (compat !== "true" && mode && ["prefer", "require", "verify-ca"].includes(mode)) {
    // Make the current behavior explicit so pg does not warn or weaken it in a future release.
    url.searchParams.set("sslmode", "verify-full");
    return url.toString();
  }
  // Preserve explicit TLS choices, including URLs opting into libpq compatibility.
  return value;
}
