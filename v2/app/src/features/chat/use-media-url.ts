import { useEffect, useState } from 'react';

import { chatEnabled, signedMediaUrl, type SignedMediaVariant } from './chat';

/**
 * Resolve a message's media to something an <Image> can load.
 *
 * The chat-media bucket is private, so there is no permanent URL: the
 * app asks for a signed one, good for an hour. They are cached for a
 * little less than that, so scrolling a thread does not re-sign the
 * same photo every time it comes back on screen and a URL is never
 * handed out at the moment it expires.
 *
 * A local file uri — the fixture build, and the optimistic bubble right
 * after you pick a photo — is already loadable and passes straight
 * through without touching the network.
 */
const cache = new Map<string, { url: string; until: number }>();
const CACHE_MS = 50 * 60 * 1000;
const DEFAULT_VARIANT: SignedMediaVariant = { kind: 'original' };

export function useMediaUrl(
  path: string | undefined,
  variant: SignedMediaVariant = DEFAULT_VARIANT,
): string | null {
  const local = resolveLocal(path);
  const [fetched, setFetched] = useState<{ path: string; url: string } | null>(null);
  const key = cacheKey(path, variant);
  const variantKind = variant.kind;
  const variantWidth = variant.kind === 'image' ? variant.width : undefined;
  const variantHeight = variant.kind === 'image' ? variant.height : undefined;

  useEffect(() => {
    if (local || !path || !chatEnabled()) return;
    let cancelled = false;
    const hit = cache.get(key);
    // a cache hit still resolves through a promise rather than setting
    // state in the effect body: same result, no cascading render.
    const wanted =
      hit && hit.until > Date.now()
        ? Promise.resolve(hit.url)
        : signedMediaUrl(
            path,
            variantKind === 'image'
              ? { kind: 'image', width: variantWidth ?? 480, ...(variantHeight ? { height: variantHeight } : {}) }
              : variantKind === 'gif'
                ? { kind: 'gif' }
                : { kind: 'original' },
          ).then((signed) => {
            if (signed) cache.set(key, { url: signed, until: Date.now() + CACHE_MS });
            return signed;
          });
    void wanted
      .then((url) => {
        if (!cancelled && url) setFetched({ path, url });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [key, local, path, variantHeight, variantKind, variantWidth]);

  // the path check keeps a recycled row from showing the last photo
  return local ?? (fetched && fetched.path === path ? fetched.url : null);
}

export function preferredMediaPath(
  originalPath: string | undefined,
  thumbnailPath: string | undefined,
  variant: SignedMediaVariant,
): string | undefined {
  if (variant.kind === 'image' && thumbnailPath) return thumbnailPath;
  return originalPath;
}

/** already loadable: a file the picker just handed us. */
function resolveLocal(path: string | undefined): string | null {
  if (!path) return null;
  return /^(file:|ph:|assets-library:|content:|https?:)/.test(path) ? path : null;
}

function cacheKey(path: string | undefined, variant: SignedMediaVariant): string {
  if (!path) return '';
  switch (variant.kind) {
    case 'image':
      return `${path}|image|${variant.width}x${variant.height ?? 'auto'}`;
    case 'gif':
      return `${path}|gif`;
    default:
      return `${path}|original`;
  }
}
