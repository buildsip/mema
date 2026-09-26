/**
 * Checks whether a literal {path} equals a {scope} or sits beneath it.
 * "." is the repo root, so it includes every path.
 */
export function matchesScope({ scope, path }: { scope: string; path: string }) {
  // Require the slash boundary: apps/web must not match apps/web-old.
  // "." does not prefix-match, because repo-relative paths are stored without "./".
  // No filesystem lookup is needed, so this also works for paths not created yet.
  return scope === "." || path === scope || path.startsWith(`${scope}/`);
}
