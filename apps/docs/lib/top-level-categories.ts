import type { LoaderPlugin } from 'fumadocs-core/source';
import type { Folder, Node, Separator } from 'fumadocs-core/page-tree';

// Fumadocs renders a folder as an accordion.
// The folders directly under `docs/` are categories: a label, then their pages.
export function topLevelCategoriesPlugin(): LoaderPlugin {
  return {
    name: 'top-level-categories',
    enforce: 'post',
    transformPageTree: {
      root(node) {
        node.children = node.children.flatMap((child): Node[] => {
          if (child.type !== 'folder') return [child];
          return [category(child), ...pages(child)];
        });
        return node;
      },
    },
  };
}

function category(folder: Folder): Separator {
  return {
    type: 'separator',
    name: label(folder),
  };
}

// The index page is the folder link. Once the folder is a label, that page is a normal item.
function pages(folder: Folder) {
  const items = [...(folder.children ?? [])];
  if (folder.index) items.push(folder.index);
  items.sort((a, b) => filenameOf(a).localeCompare(filenameOf(b)));
  return items;
}

// "01-getting-started" -> "Getting Started". The number is only for file order.
function label(folder: Folder) {
  const path = folder.$ref && typeof folder.$ref === 'object' ? (folder.$ref.folder ?? '') : '';
  const base = path.split('/').pop() ?? '';
  return base
    .replace(/^\d+-/, '')
    .split('-')
    .filter((word) => word.length > 0)
    .map((word) => word.charAt(0).toLocaleUpperCase() + word.slice(1))
    .join(' ');
}

function filenameOf(node: Node) {
  if (node.type === 'folder' && node.$ref && typeof node.$ref === 'object') {
    return (node.$ref.folder ?? '').split('/').pop() ?? '';
  }
  if (node.type === 'page' && typeof node.$ref === 'string') {
    const base = node.$ref.split('/').pop() ?? '';
    return base.replace(/\.[^.]+$/, '');
  }
  return '';
}
