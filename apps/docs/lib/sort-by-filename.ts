import type { LoaderPlugin } from 'fumadocs-core/source';

type TreeNode = {
  type?: string;
  $ref?: string | { folder?: string };
  children?: TreeNode[];
};

// A leading number, like "01-getting-started", is the sort order.
// The page URL drops that number.
export function sortByFilenamePlugin(): LoaderPlugin {
  return {
    name: 'sort-by-filename',
    transformPageTree: {
      root(node) {
        sortNodes(node.children ?? []);
        return node;
      },
    },
  };
}

function sortNodes(nodes: TreeNode[]) {
  nodes.sort((a, b) => filenameOf(a).localeCompare(filenameOf(b)));
  for (const node of nodes) {
    if (node.children) sortNodes(node.children);
  }
}

function filenameOf(node: TreeNode) {
  const path =
    node.type === 'folder' && node.$ref && typeof node.$ref === 'object'
      ? (node.$ref.folder ?? '')
      : typeof node.$ref === 'string'
        ? node.$ref
        : '';
  const base = path.split('/').pop() ?? '';
  return base.replace(/\.[^.]+$/, '');
}
