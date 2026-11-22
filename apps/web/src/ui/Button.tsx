import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'discord' | 'ghost';

const base =
  'inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

const variants: Record<Variant, string> = {
  primary: 'bg-gold-400 text-ink-950 hover:bg-gold-300 focus-visible:outline-gold-300',
  discord: 'bg-discord text-white hover:bg-discord-hover focus-visible:outline-discord',
  ghost: 'px-3 py-2 text-ink-200 hover:text-ink-50 hover:bg-ink-800 focus-visible:outline-ink-400',
};

export function buttonClass(variant: Variant = 'primary', className = '') {
  return `${base} ${variants[variant]} ${className}`.trim();
}

export function Button({
  variant = 'primary',
  className,
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button type={type} className={buttonClass(variant, className)} {...props} />;
}

export function ButtonLink({
  variant = 'primary',
  className,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: Variant }) {
  return <a className={buttonClass(variant, className)} {...props} />;
}
