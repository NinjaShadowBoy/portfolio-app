/** Widths offered in `srcset`; Cloudinary resizes on its CDN and caches each one. */
export const CLOUDINARY_WIDTHS = [480, 800, 1200, 1600] as const;

const UPLOAD = '/image/upload/';

/**
 * A Cloudinary delivery URL resized to `width`, in the best format and quality
 * the browser accepts (`f_auto,q_auto`). `c_limit` never upscales. URLs from
 * other hosts, or that already carry a transformation, come back unchanged.
 */
export function cloudinaryUrl(url: string, width?: number): string {
  const at = url.indexOf(UPLOAD);
  if (!url.includes('res.cloudinary.com') || at < 0) return url;
  const rest = url.slice(at + UPLOAD.length);
  // A first segment such as `w_800,c_fill` is a transformation, not a version or folder.
  if (/^[a-z]{1,3}_[^/]*\//.test(rest)) return url;
  const transform = width ? `f_auto,q_auto,c_limit,w_${width}` : 'f_auto,q_auto';
  return `${url.slice(0, at + UPLOAD.length)}${transform}/${rest}`;
}

/** `srcset` for a Cloudinary image, or null for other hosts. */
export function cloudinarySrcset(url: string): string | null {
  if (cloudinaryUrl(url, 1) === url) return null;
  return CLOUDINARY_WIDTHS.map((w) => `${cloudinaryUrl(url, w)} ${w}w`).join(', ');
}
