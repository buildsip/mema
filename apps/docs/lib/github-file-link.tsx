import type { ComponentProps, FC } from 'react';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import { githubBlobHref } from './github-blob-href';

/**
 * Anchor override for `createRelativeLink`.
 * Docs page links are already rewritten. A remaining relative path that
 * leaves `docs/` opens that file on GitHub.
 */
export function createGithubFileLink(pagePath: string): FC<ComponentProps<'a'>> {
  return function GithubFileLink({ href, ...props }) {
    const next = typeof href === 'string' ? (githubBlobHref({ href, pagePath }) ?? href) : href;
    const Link = defaultMdxComponents.a;
    return <Link href={next} {...props} />;
  };
}
