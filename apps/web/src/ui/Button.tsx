import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'discord' | 'ghost';

// Every button answers the pointer: it lifts on hover and sinks when pressed.
const base =
  'inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold transition-[transform,background-color,box-shadow,color] duration-150 ease-out hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:active:scale-100 disabled:shadow-none';

const variants: Record<Variant, string> = {
  primary:
    'bg-gold-400 text-ink-950 shadow-[0_6px_20px_-8px] shadow-gold-400/60 hover:bg-gold-300 hover:shadow-[0_10px_28px_-8px] hover:shadow-gold-400/70 focus-visible:outline-gold-300',
  discord:
    'bg-discord text-white shadow-[0_6px_20px_-8px] shadow-discord/60 hover:bg-discord-hover hover:shadow-[0_10px_28px_-8px] hover:shadow-discord/70 focus-visible:outline-discord',
  ghost: 'px-3 py-2 text-ink-200 hover:translate-y-0 hover:text-ink-50 hover:bg-ink-800 focus-visible:outline-ink-400',
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
