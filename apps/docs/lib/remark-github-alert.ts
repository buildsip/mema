import type { Blockquote, Paragraph, Root, Text } from 'mdast';
import { visit } from 'unist-util-visit';

// GitHub alert kinds, mapped onto the callout colors the theme actually has.
// Shadcn ships destructive, not info or warning, so those two are defined in global.css.
const alerts: Record<string, { type: string; title: string }> = {
  NOTE: { type: 'info', title: 'Note' },
  TIP: { type: 'tip', title: 'Tip' },
  IMPORTANT: { type: 'info', title: 'Important' },
  WARNING: { type: 'warning', title: 'Warning' },
  CAUTION: { type: 'error', title: 'Caution' },
};

// Turn `> [!TIP]` blockquotes into a Callout, so the marker is not printed as text.
export function remarkGithubAlert() {
  return (tree: Root) => {
    visit(tree, 'blockquote', (node: Blockquote, index, parent) => {
      if (index == null || !parent) return;
      const first = node.children[0];
      if (!first || first.type !== 'paragraph') return;
      const paragraph = first as Paragraph;
      const text = paragraph.children[0] as Text | undefined;
      if (!text || text.type !== 'text') return;

      const match = text.value.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][ \t]*\n?/);
      if (!match) return;

      const alert = alerts[match[1]];
      text.value = text.value.slice(match[0].length).replace(/^\n/, '');
      if (text.value.length === 0) paragraph.children.shift();
      if (paragraph.children.length === 0) node.children.shift();

      // The MDX node is not part of the mdast content union, so the slot is widened here.
      const children = parent.children as unknown[];
      children[index] = {
        type: 'mdxJsxFlowElement',
        name: 'GitHubAlert',
        attributes: [
          { type: 'mdxJsxAttribute', name: 'type', value: alert.type },
          { type: 'mdxJsxAttribute', name: 'title', value: alert.title },
        ],
        children: node.children,
      };
    });
  };
}
