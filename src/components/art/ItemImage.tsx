"use client";

import { useCallback, useState, type ImgHTMLAttributes } from "react";
import { FallbackArt, type ArtSpec } from "./FallbackArt";

type ImgProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt" | "onError">;

/** SVGs without intrinsic size can legitimately report naturalWidth 0, so they skip the post-hydration check. */
const isSvg = (src: string) => /^data:image\/svg|\.svg(\?|#|$)/i.test(src);

/**
 * The one way to render an item photo. Missing URL, a load error, or an image that already failed before
 * hydration (complete with no pixels) all swap to the category artwork, so a broken-image icon never shows.
 */
export function ItemImage({ src, alt, art, onFail, className, ...img }: ImgProps & { src: string | null | undefined; alt: string; art: Omit<ArtSpec, "title"> & { title?: string }; onFail?: (src: string) => void }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const failed = Boolean(src) && failedSrc === src;

  const fail = useCallback(() => {
    if (!src) return;
    setFailedSrc(src);
    onFail?.(src);
  }, [src, onFail]);

  const ref = useCallback(
    (el: HTMLImageElement | null) => {
      if (el && src && el.complete && el.naturalWidth === 0 && !isSvg(src)) fail();
    },
    [src, fail],
  );

  if (!src || failed) return <FallbackArt {...art} title={art.title ?? alt} className={className} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img ref={ref} src={src} alt={alt} referrerPolicy="no-referrer" draggable={false} decoding="async" {...img} className={className} onError={fail} />;
}
