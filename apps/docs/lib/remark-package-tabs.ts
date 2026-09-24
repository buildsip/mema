import { parseCodeBlockAttributes } from 'fumadocs-core/mdx-plugins/codeblock-utils';
import type { Code, Parent, Root } from 'mdast';
import { visit } from 'unist-util-visit';

// Group consecutive fences written as ```bash package="pnpm" into Fumadocs Tabs.
export function remarkPackageTabs() {
  return (tree: Root) => {
    visit(tree, (node) => {
      if (!isParent(node)) return;
      const ranges: Array<[number, number]> = [];
      let index = 0;
      while (index < node.children.length) {
        if (!packageName(node.children[index])) {
          index += 1;
          continue;
        }
        const start = index;
        while (index < node.children.length && packageName(node.children[index])) index += 1;
        ranges.push([start, index]);
      }

      for (const [start, end] of ranges.reverse()) {
        const tabs = node.children.slice(start, end).flatMap((child) => {
          if (child.type !== 'code') return [];
          const name = packageName(child);
          if (!name) return [];
          const parsed = parseCodeBlockAttributes(child.meta ?? '', ['package']);
          child.meta = parsed.rest.trim() || undefined;
          return [{ name, code: child }];
        });
        const names = tabs.map((tab) => tab.name);

        const children = node.children as unknown[];
        children.splice(start, end - start, {
          type: 'mdxJsxFlowElement',
          name: 'Tabs',
          attributes: [itemsAttribute(names)],
          children: tabs.map((tab) => ({
            type: 'mdxJsxFlowElement',
            name: 'Tab',
            attributes: [{ type: 'mdxJsxAttribute', name: 'value', value: tab.name }],
            children: [tab.code],
          })),
        });
      }
    });
  };
}

// `items` is a string array, so the attribute has to be a JS expression, not a string.
function itemsAttribute(names: string[]) {
  return {
    type: 'mdxJsxAttribute',
    name: 'items',
    value: {
      type: 'mdxJsxAttributeValueExpression',
      value: names.join(', '),
      data: {
        estree: {
          type: 'Program',
          sourceType: 'module',
          comments: [],
          body: [
            {
              type: 'ExpressionStatement',
              expression: {
                type: 'ArrayExpression',
                elements: names.map((name) => ({ type: 'Literal', value: name })),
              },
            },
          ],
        },
      },
    },
  };
}

function isParent(node: { type: string }): node is Parent {
  return 'children' in node && Array.isArray((node as Parent).children);
}

function packageName(node: Parent['children'][number]): string | null {
  if (node.type !== 'code') return null;
  const code = node as Code;
  if (!code.meta) return null;
  const parsed = parseCodeBlockAttributes(code.meta, ['package']);
  const name = parsed.attributes.package;
  return typeof name === 'string' && name.length > 0 ? name : null;
}
