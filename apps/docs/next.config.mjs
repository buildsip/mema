import { createMDX } from 'fumadocs-mdx/next';
import { fileURLToPath } from 'node:url';
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants.js';

const withMDX = createMDX();

// Turbopack needs the repo root to read ../../docs during development.
// Production uses Webpack so OpenNext can keep standalone output beside this app's lockfile.
export default function config(phase) {
  return withMDX({
    reactStrictMode: true,
    outputFileTracingRoot: fileURLToPath(
      new URL(phase === PHASE_DEVELOPMENT_SERVER ? '../..' : '.', import.meta.url),
    ),
  });
}
