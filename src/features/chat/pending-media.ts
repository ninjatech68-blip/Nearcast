import type { LocalMedia } from './chat';

/**
 * A short-lived handoff for media the person just picked, on its way to
 * the preview screen.
 *
 * Router params only carry strings, and a picked asset is an object (uri,
 * kind, dimensions). Rather than serialise it through the URL, the picker
 * parks it here and the preview screen reads it — the same shape as the
 * compose draft. Cleared once the preview screen takes it, so a stale set
 * never leaks into the next send.
 */
export type PendingMedia = { conversationId: string; items: readonly LocalMedia[] };

let pending: PendingMedia | null = null;

export function setPendingMedia(next: PendingMedia): void {
  pending = next;
}

export function takePendingMedia(): PendingMedia | null {
  const held = pending;
  pending = null;
  return held;
}
