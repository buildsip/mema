/**
 * The user can install the CLI using different package managers:
 *
 * npx tiramisu init
 * pnpm dlx tiramisu init
 * yarn dlx tiramisu init
 * bunx --bun tiramisu init
 */
export function getPackageManager() {
  // Launchers identify themselves; bunx --bun also identifies itself through the runtime.
  const agent = /^(npm|pnpm|yarn|bun)\/(\S+)/.exec(process.env.npm_config_user_agent ?? "");
  return {
    name: process.versions.bun ? "bun" : (agent?.[1] ?? "npm"),
    version: process.versions.bun ?? agent?.[2],
  };
}
