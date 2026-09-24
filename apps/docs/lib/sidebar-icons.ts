import type { LoaderPlugin } from 'fumadocs-core/source';
import type { icons } from 'lucide-react';

type IconName = keyof typeof icons;

// Page urls under /docs. lucideIconsPlugin turns the name into the icon.
const pageIcons: Record<string, IconName> = {
  '/docs/01-getting-started/01-getting-started': 'Rocket',
  '/docs/01-getting-started/principles': 'Compass',
  '/docs/01-getting-started/memory': 'Brain',
  '/docs/01-getting-started/mcp': 'Plug',
  '/docs/01-getting-started/config': 'FileBraces',
  '/docs/01-getting-started/upvotes-and-pruning': 'ThumbsUp',
  '/docs/02-guides/01-general': 'BookOpen',
  '/docs/02-guides/02-writing-memories': 'Pencil',
  '/docs/comparison': 'Scale',

  '/docs/03-api-reference/database': 'Database',
  '/docs/03-api-reference/development': 'Wrench',

  '/docs/03-api-reference/cli/delete': 'Trash',
  '/docs/03-api-reference/cli/init': 'Sparkles',
  '/docs/03-api-reference/cli/insert': 'Plus',
  '/docs/03-api-reference/cli/mcp': 'Plug',
  '/docs/03-api-reference/cli/prune': 'Scissors',
  '/docs/03-api-reference/cli/search': 'Search',
  '/docs/03-api-reference/cli/update': 'Pencil',
  '/docs/03-api-reference/cli/upvote': 'ThumbsUp',

  '/docs/03-api-reference/mcp/delete-memories': 'Trash',
  '/docs/03-api-reference/mcp/insert-memory': 'Plus',
  '/docs/03-api-reference/mcp/installation': 'Download',
  '/docs/03-api-reference/mcp/prune-memories': 'Scissors',
  '/docs/03-api-reference/mcp/search-memories': 'Search',
  '/docs/03-api-reference/mcp/update-memory': 'Pencil',
  '/docs/03-api-reference/mcp/upvote-memories': 'ThumbsUp',

  '/docs/03-api-reference/config/availableToWorkspace': 'Users',
  '/docs/03-api-reference/config/databaseUrlCommand': 'Database',
  '/docs/03-api-reference/config/frontmatter': 'FileText',
  '/docs/03-api-reference/config/prune': 'Scissors',
  '/docs/03-api-reference/config/version': 'Tag',

  '/docs/03-api-reference/memory/body': 'TextAlignStart',
  '/docs/03-api-reference/memory/created': 'Calendar',
  '/docs/03-api-reference/memory/doNotDelete': 'Shield',
  '/docs/03-api-reference/memory/doNotEdit': 'Lock',
  '/docs/03-api-reference/memory/id': 'Hash',
  '/docs/03-api-reference/memory/scope': 'Globe',
  '/docs/03-api-reference/memory/title': 'Type',

  '/docs/03-api-reference/file-conventions/memories': 'Folder',
  '/docs/03-api-reference/file-conventions/memory-md': 'FileText',
  '/docs/03-api-reference/file-conventions/tiramisu-json': 'FileBraces',
};

// Folder paths inside the docs directory. The index page is the folder link.
const folderIcons: Record<string, IconName> = {
  '01-getting-started': 'Rocket',
  '02-guides': 'BookOpen',
  '03-api-reference': 'Library',
  '03-api-reference/cli': 'Terminal',
  '03-api-reference/mcp': 'Plug',
  '03-api-reference/config': 'Settings',
  '03-api-reference/memory': 'Brain',
  '03-api-reference/file-conventions': 'FolderTree',
};

// Runs before lucideIconsPlugin, which replaces these names with components.
export function sidebarIconsPlugin(): LoaderPlugin {
  return {
    name: 'sidebar-icons',
    enforce: 'pre',
    transformPageTree: {
      file(node) {
        if (node.icon) return node;
        node.icon = pageIcons[node.url] ?? 'File';
        return node;
      },
      folder(node, folderPath) {
        if (node.icon) return node;
        node.icon = folderIcons[folderKey(folderPath)] ?? 'Folder';
        return node;
      },
    },
  };
}

// The builder may pass `api-reference/cli` or a longer path that ends with it.
function folderKey(folderPath: string) {
  const normalized = folderPath.replaceAll('\\', '/');
  const hit = Object.keys(folderIcons).find(
    (key) => normalized === key || normalized.endsWith(`/${key}`),
  );
  return hit ?? normalized;
}
