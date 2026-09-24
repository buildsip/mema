import { llms, loader } from "fumadocs-core/source";
import { lucideIconsPlugin } from "fumadocs-core/source/lucide-icons";
import { docsRoute } from "./shared";
import { defineDocs } from "fumadocs-mdx/macro";
import { pageSchema } from "fumadocs-core/source/schema";

// Pages live in the repository `docs/` folder, two levels above this app.
// Guides are listed one by one. The API reference is the whole folder.
// Each page sets its title in frontmatter.
const docs = defineDocs({
  dir: "../../docs",
  docs: {
    files: [
      "index.md",
      "principles.md",
      "guides.md",
      "memory.md",
      "mcp.md",
      "config.md",
      "upvotes-and-pruning.md",
      "comparison.md",
      "api-reference/**/*.md",
    ],
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
  plugins: [lucideIconsPlugin()],
});

export const docsLlms = llms(source, {
  renderPage: async (page) => `# ${page.data.title} (${page.url})

${await page.data.getText("processed")}`,
});
