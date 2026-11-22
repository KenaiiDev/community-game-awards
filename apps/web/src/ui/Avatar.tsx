/* eslint-disable @next/next/no-img-element -- Discord CDN avatars are tiny; next/image adds nothing here. */

export function Avatar({ name, src, size = 40 }: { name: string; src: string | null; size?: number }) {
  const style = { width: size, height: size };
  if (src) {
    return <img src={src} alt="" style={style} className="rounded-full bg-ink-700 object-cover" />;
  }
  return (
    <span
      aria-hidden="true"
      style={style}
      className="inline-flex items-center justify-center rounded-full bg-ink-700 text-sm font-semibold text-ink-200"
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}
