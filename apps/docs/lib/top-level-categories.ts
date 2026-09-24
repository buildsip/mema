import type { LoaderPlugin } from 'fumadocs-core/source';

type TreeNode = {
  type?: string;
  name?: unknown;
  icon?: unknown;
  url?: string;
  index?: TreeNode;
  children?: TreeNode[];
  $ref?: string | { folder?: string };
};

// Fumadocs renders a folder as an accordion.
// The folders directly under `docs/` are categories: a label, then their pages.
export function topLevelCategoriesPlugin(): LoaderPlugin {
  return {
    name: 'top-level-categories',
    enforce: 'post',
    transformPageTree: {
      root(node) {
        const children = node.children as TreeNode[];
        node.children = children.flatMap((child) => {
          if (child.type !== 'folder') return [child];
          return [category(child), ...pages(child)];
        });
        return node;
      },
    },
  };
}

function category(folder: TreeNode): TreeNode {
  return {
    type: 'separator',
    name: label(folder),
  };
}

// The index page is the folder link. Once the folder is a label, that page is a normal item.
function pages(folder: TreeNode) {
  const items = [...(folder.children ?? [])];
  if (folder.index) items.push(folder.index);
  items.sort((a, b) => filenameOf(a).localeCompare(filenameOf(b)));
  return items;
}

// "01-getting-started" -> "Getting Started". The number is only for file order.
function label(folder: TreeNode) {
  const path = folder.$ref && typeof folder.$ref === 'object' ? (folder.$ref.folder ?? '') : '';
  const base = path.split('/').pop() ?? '';
  return base
    .replace(/^\d+-/, '')
    .split('-')
    .filter((word) => word.length > 0)
    .map((word) => word.charAt(0).toLocaleUpperCase() + word.slice(1))
    .join(' ');
}

function filenameOf(node: TreeNode) {
  if (node.type === 'folder' && node.$ref && typeof node.$ref === 'object') {
    return (node.$ref.folder ?? '').split('/').pop() ?? '';
  }
  if (typeof node.$ref === 'string') {
    const base = node.$ref.split('/').pop() ?? '';
    return base.replace(/\.[^.]+$/, '');
  }
  return '';
}
