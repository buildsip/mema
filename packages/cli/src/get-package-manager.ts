/**
 * The user can install the CLI using different package managers:
 *
 * npx mema init
 * pnpm dlx mema init
 * yarn dlx mema init
 * bunx --bun mema init
 */
export function getPackageManager() {
  // Launchers identify themselves; bunx --bun also identifies itself through the runtime.
  const agent = /^(npm|pnpm|yarn|bun)\/(\S+)/.exec(process.env.npm_config_user_agent ?? "");
  return {
    name: process.versions.bun ? "bun" : (agent?.[1] ?? "npm"),
    version: process.versions.bun ?? agent?.[2],
  };
}
