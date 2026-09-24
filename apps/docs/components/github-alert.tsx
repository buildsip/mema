import { CircleX, Info, Lightbulb, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';

const tones: Record<string, string> = {
  // Tip stays neutral. The other alerts use the theme color for the box and the text.
  tip: 'border-border text-foreground',
  info: 'border-info text-info',
  warning: 'border-warning text-warning',
  error: 'border-destructive text-destructive',
};

const icons = {
  tip: Lightbulb,
  info: Info,
  warning: TriangleAlert,
  error: CircleX,
};

export function GitHubAlert({
  type = 'info',
  title,
  children,
}: {
  type?: string;
  title?: ReactNode;
  children?: ReactNode;
}) {
  const neutral = type === 'tip';
  const Icon = icons[type as keyof typeof icons];

  return (
    <div className={`not-prose my-4 flex gap-2 rounded-lg border px-4 py-3 text-sm ${tones[type] ?? tones.info}`}>
      {Icon ? <Icon className="mt-0.5 size-4 shrink-0" /> : null}
      <div className="min-w-0 [&_a]:underline [&_p]:m-0">
        {neutral && title ? <span className="font-semibold">{title} </span> : null}
        {children}
      </div>
    </div>
  );
}
