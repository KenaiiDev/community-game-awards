import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'discord' | 'ghost';

// Game-menu buttons: cut corners, a "▶" cursor that slides in on hover and focus,
// a lift on hover and a press when clicked. The focus outline is drawn inside the
// button because clip-path would cut an outer one.
const base =
  'chamfer relative inline-flex items-center justify-center gap-2 font-display font-semibold tracking-wider uppercase transition-[transform,background-color,color,filter] duration-150 ease-out active:scale-[0.97] focus-visible:outline-2 focus-visible:-outline-offset-4 before:absolute before:left-2.5 before:-translate-x-1 before:text-[0.55rem] before:opacity-0 before:transition before:duration-150 before:content-["▶"_/_""] hover:before:translate-x-0 hover:before:opacity-100 focus-visible:before:translate-x-0 focus-visible:before:opacity-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:active:scale-100 disabled:before:hidden';

const variants: Record<Variant, string> = {
  primary: '[--cut:10px] hover:-translate-y-0.5 active:translate-y-0 px-7 py-3 text-sm bg-lime-400 text-ink-950 hover:bg-lime-300 focus-visible:outline-ink-950',
  discord: '[--cut:10px] hover:-translate-y-0.5 active:translate-y-0 px-7 py-3 text-sm bg-discord text-white hover:bg-discord-hover focus-visible:outline-white',
  ghost:
    '[--cut:6px] px-3 py-2 text-xs text-ink-200 before:hidden hover:bg-ink-800 hover:text-ink-50 focus-visible:outline-ink-400',
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
