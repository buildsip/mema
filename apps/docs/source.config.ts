import { defineConfig } from 'fumadocs-mdx/config';
import { remarkGithubAlert } from './lib/remark-github-alert';
import { remarkPackageTabs } from './lib/remark-package-tabs';

export default defineConfig({
  mdxOptions: {
    remarkPlugins: [remarkGithubAlert, remarkPackageTabs],
  },
});
