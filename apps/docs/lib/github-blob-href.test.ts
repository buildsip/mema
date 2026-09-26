import { describe, expect, test } from 'bun:test';
import { githubBlobHref } from './github-blob-href';

const pagePath = '01-introduction/04-customize.md';
const blob = 'https://github.com/buildsip/tiramisu/blob/main';

describe('githubBlobHref', () => {
  test('maps a link that leaves docs onto the repository file', () => {
    expect(
      githubBlobHref({
        href: '../../packages/cli/skills/tiramisu-memory-writing/SKILL.md',
        pagePath,
      }),
    ).toBe(`${blob}/packages/cli/skills/tiramisu-memory-writing/SKILL.md`);
  });

  test('keeps the hash', () => {
    expect(
      githubBlobHref({
        href: '../../README.md#install',
        pagePath,
      }),
    ).toBe(`${blob}/README.md#install`);
  });

  test('leaves a relative path inside docs alone', () => {
    expect(
      githubBlobHref({
        href: './config.md#custom',
        pagePath,
      }),
    ).toBeUndefined();
  });

  test('leaves a resolved docs page url alone', () => {
    expect(
      githubBlobHref({
        href: '/docs/api-reference/mcp',
        pagePath,
      }),
    ).toBeUndefined();
  });

  test('refuses a path that leaves the repository', () => {
    expect(
      githubBlobHref({
        href: '../../../../etc/passwd',
        pagePath,
      }),
    ).toBeUndefined();
  });
});
