import { llms, loader } from "fumadocs-core/source";
import { lucideIconsPlugin } from "fumadocs-core/source/lucide-icons";
import { sidebarIconsPlugin } from "./sidebar-icons";
import { sortByFilenamePlugin } from "./sort-by-filename";
import { topLevelCategoriesPlugin } from "./top-level-categories";
import { docsRoute } from "./shared";
import { defineDocs } from "fumadocs-mdx/macro";
import { pageSchema } from "fumadocs-core/source/schema";

// Pages live in the repository `docs/` folder, two levels above this app.
// Every markdown file is a page. Folders are the sidebar sections.
// Each page sets its title in frontmatter.
const docs = defineDocs({
  dir: "../../docs",
  docs: {
    files: ["*.md", "**/*.md"],
    schema: pageSchema,
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
});

// See https://fumadocs.dev/docs/headless/source-api for more info
export const source = loader({
  baseUrl: docsRoute,
  source: docs.toFumadocsSource(),
  plugins: [sidebarIconsPlugin(), sortByFilenamePlugin(), lucideIconsPlugin(), topLevelCategoriesPlugin()],
});

export const docsLlms = llms(source, {
  renderPage: async (page) => `# ${page.data.title} (${page.url})

${await page.data.getText("processed")}`,
});
