import { useEffect, useState } from 'react';

import { chatEnabled, signedMediaUrl } from './chat';

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

export function useMediaUrl(path: string | undefined): string | null {
  const local = resolveLocal(path);
  const [fetched, setFetched] = useState<{ path: string; url: string } | null>(null);

  useEffect(() => {
    if (local || !path || !chatEnabled()) return;
    let cancelled = false;
    const hit = cache.get(path);
    // a cache hit still resolves through a promise rather than setting
    // state in the effect body: same result, no cascading render.
    const wanted =
      hit && hit.until > Date.now()
        ? Promise.resolve(hit.url)
        : signedMediaUrl(path).then((signed) => {
            if (signed) cache.set(path, { url: signed, until: Date.now() + CACHE_MS });
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
  }, [path, local]);

  // the path check keeps a recycled row from showing the last photo
  return local ?? (fetched && fetched.path === path ? fetched.url : null);
}

/** already loadable: a file the picker just handed us. */
function resolveLocal(path: string | undefined): string | null {
  if (!path) return null;
  return /^(file:|ph:|assets-library:|content:|https?:)/.test(path) ? path : null;
}
