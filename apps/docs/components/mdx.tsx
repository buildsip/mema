import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';
import type { ImgHTMLAttributes } from 'react';
import { GitHubAlert } from '@/components/github-alert';
import { Tab, Tabs } from 'fumadocs-ui/components/tabs';

// The default img component is next/image, which requires width and height.
// README images are plain HTML and often only set width, or neither.
function img(props: ImgHTMLAttributes<HTMLImageElement>) {
  const sized = props.width != null && props.height != null;
  const Image = defaultMdxComponents.img;
  if (!sized || !Image) return <img {...props} />;
  return <Image {...props} />;
}

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    img,
    GitHubAlert,
    Tab,
    Tabs,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
