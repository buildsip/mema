import path from 'node:path';
import { gitConfig } from './shared';

/**
 * Turn a relative markdown link into a GitHub blob URL.
 *
 * `createRelativeLink` already rewrites links to other docs pages.
 * This handles a link that walks out of `docs/`, such as
 * `../../packages/cli/skills/tiramisu-memory-writing/SKILL.md`.
 *
 * `pagePath` is relative to the `docs/` folder. The link is resolved from
 * that file, then `docs/` is added back so `../` walks up to the repository
 * root. A path that stays inside `docs/`, or that would leave the repository,
 * returns undefined.
 */
export function githubBlobHref({ href, pagePath }: { href: string; pagePath: string }): string | undefined {
  const cut = suffixStart(href);
  const file = href.slice(0, cut);
  const suffix = href.slice(cut);
  if (!file.startsWith('./') && !file.startsWith('../')) return;

  const fromDocs = path.posix.normalize(path.posix.join(path.posix.dirname(pagePath), file));
  // Still inside `docs/`. Leave it for the docs site, including a page the lookup missed.
  if (!fromDocs.startsWith('../')) return;
  // `fromDocs` is relative to `docs/`. Prefix that folder so `../` means the repo root.
  const fromRepo = path.posix.normalize(path.posix.join('docs', fromDocs));
  if (fromRepo === '.' || fromRepo.startsWith('..') || path.posix.isAbsolute(fromRepo)) return;

  const encoded = fromRepo.split('/').map(encodeURIComponent).join('/');
  return `https://github.com/${gitConfig.user}/${gitConfig.repo}/blob/${gitConfig.branch}/${encoded}${suffix}`;
}

/** Index of the hash or query, whichever comes first. The file path stops there. */
function suffixStart(href: string) {
  const hash = href.indexOf('#');
  const query = href.indexOf('?');
  if (hash < 0) return query < 0 ? href.length : query;
  if (query < 0) return hash;
  return Math.min(hash, query);
}
