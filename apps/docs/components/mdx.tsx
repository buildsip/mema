import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';
import type { ImgHTMLAttributes } from 'react';
import { GitHubAlert } from '@/components/github-alert';
import { Tab, Tabs } from 'fumadocs-ui/components/tabs';

// remark-image turns a local markdown image into a static import.
// That import is an object: { src, width, height }. A plain <img> turns
// the object into the URL "[object Object]". next/image wants a string
// src plus both dimensions, so pull those fields off the import.
// HTML images copied from the README often set only width, or neither.
// next/image throws in that case, so those stay on a plain <img>.
function staticImage(src: unknown) {
  if (typeof src !== 'object' || src == null) return;
  if (!('src' in src) || typeof src.src !== 'string') return;
  if (!('width' in src) || typeof src.width !== 'number') return;
  if (!('height' in src) || typeof src.height !== 'number') return;
  return { src: src.src, width: src.width, height: src.height };
}

function img(props: ImgHTMLAttributes<HTMLImageElement>) {
  const imported = staticImage(props.src);
  const Image = defaultMdxComponents.img;
  if (imported && Image) {
    return (
      <Image
        {...props}
        src={imported.src}
        width={props.width ?? imported.width}
        height={props.height ?? imported.height}
      />
    );
  }

  const sized = props.width != null && props.height != null && typeof props.src === 'string';
  if (sized && Image) return <Image {...props} src={props.src} />;
  return <img {...props} />;
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
