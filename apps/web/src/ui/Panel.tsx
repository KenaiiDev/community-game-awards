import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';

type Tone = 'default' | 'active' | 'muted';

const frames: Record<Tone, string> = {
  default: 'bg-gradient-to-br from-ink-400/50 via-ink-700 to-ink-700',
  active: 'bg-gradient-to-br from-gold-300 via-gold-500/70 to-gold-400/40',
  muted: 'bg-ink-800',
};

export interface PanelProps extends HTMLAttributes<HTMLElement> {
  as?: 'div' | 'section' | 'li';
  tone?: Tone;
  /** Size of the cut corners in pixels. */
  cut?: number;
  innerClassName?: string;
  children: ReactNode;
}

/**
 * A game-UI panel: a 1px gradient frame with cut corners. clip-path would also
 * clip a CSS border, so the frame is the outer element's background showing
 * around the inner one.
 */
export function Panel({
  as: Tag = 'div',
  tone = 'default',
  cut = 16,
  className = '',
  innerClassName = '',
  style,
  children,
  ...props
}: PanelProps) {
  return (
    <Tag
      className={`chamfer p-px ${frames[tone]} ${className}`}
      style={{ '--cut': `${cut}px`, ...style } as CSSProperties}
      {...props}
    >
      <div className={`chamfer h-full bg-ink-900 ${innerClassName}`} style={{ '--cut': `${cut - 0.5}px` } as CSSProperties}>
        {children}
      </div>
    </Tag>
  );
}
