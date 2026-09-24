import type { LoaderPlugin } from 'fumadocs-core/source';
import type { icons } from 'lucide-react';

type IconName = keyof typeof icons;

// Page urls under /docs. lucideIconsPlugin turns the name into the icon.
const pageIcons: Record<string, IconName> = {
  '/docs/getting-started/getting-started': 'Rocket',
  '/docs/getting-started/principles': 'Compass',
  '/docs/getting-started/memory': 'Brain',
  '/docs/getting-started/mcp': 'Plug',
  '/docs/getting-started/config': 'FileBraces',
  '/docs/getting-started/upvotes-and-pruning': 'ThumbsUp',
  '/docs/guides/general': 'BookOpen',
  '/docs/guides/writing-memories': 'Pencil',
  '/docs/comparison': 'Scale',

  '/docs/api-reference/database': 'Database',
  '/docs/api-reference/development': 'Wrench',

  '/docs/api-reference/cli/delete': 'Trash',
  '/docs/api-reference/cli/init': 'Sparkles',
  '/docs/api-reference/cli/insert': 'Plus',
  '/docs/api-reference/cli/mcp': 'Plug',
  '/docs/api-reference/cli/prune': 'Scissors',
  '/docs/api-reference/cli/search': 'Search',
  '/docs/api-reference/cli/update': 'Pencil',
  '/docs/api-reference/cli/upvote': 'ThumbsUp',

  '/docs/api-reference/mcp/delete-memories': 'Trash',
  '/docs/api-reference/mcp/insert-memory': 'Plus',
  '/docs/api-reference/mcp/installation': 'Download',
  '/docs/api-reference/mcp/prune-memories': 'Scissors',
  '/docs/api-reference/mcp/search-memories': 'Search',
  '/docs/api-reference/mcp/update-memory': 'Pencil',
  '/docs/api-reference/mcp/upvote-memories': 'ThumbsUp',

  '/docs/api-reference/config/availableToWorkspace': 'Users',
  '/docs/api-reference/config/databaseUrlCommand': 'Database',
  '/docs/api-reference/config/frontmatter': 'FileText',
  '/docs/api-reference/config/prune': 'Scissors',
  '/docs/api-reference/config/version': 'Tag',

  '/docs/api-reference/memory/body': 'TextAlignStart',
  '/docs/api-reference/memory/created': 'Calendar',
  '/docs/api-reference/memory/doNotDelete': 'Shield',
  '/docs/api-reference/memory/doNotEdit': 'Lock',
  '/docs/api-reference/memory/id': 'Hash',
  '/docs/api-reference/memory/scope': 'Globe',
  '/docs/api-reference/memory/title': 'Type',

  '/docs/api-reference/file-conventions/memories': 'Folder',
  '/docs/api-reference/file-conventions/memory-md': 'FileText',
  '/docs/api-reference/file-conventions/tiramisu-json': 'FileBraces',
};

// Folder paths inside the docs directory. The index page is the folder link.
const folderIcons: Record<string, IconName> = {
  'getting-started': 'Rocket',
  'guides': 'BookOpen',
  'api-reference': 'Library',
  'api-reference/cli': 'Terminal',
  'api-reference/mcp': 'Plug',
  'api-reference/config': 'Settings',
  'api-reference/memory': 'Brain',
  'api-reference/file-conventions': 'FolderTree',
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

// The builder passes the folder on disk, such as "01-getting-started" or "03-api-reference/cli".
function folderKey(folderPath: string) {
  const normalized = folderPath
    .replaceAll('\\', '/')
    .split('/')
    .map((part) => part.replace(/^\d+-/, ''))
    .join('/');
  const hit = Object.keys(folderIcons).find(
    (key) => normalized === key || normalized.endsWith(`/${key}`),
  );
  return hit ?? normalized;
}
