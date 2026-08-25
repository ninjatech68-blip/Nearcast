/**
 * Expiry is rendered in coarse units. Never use false urgency: an intent that
 * is not genuinely time-sensitive must not read as though it is.
 */
export function formatExpiry(expiresAt: string): string {
  const remainingMs = new Date(expiresAt).getTime() - Date.now();
  if (Number.isNaN(remainingMs) || remainingMs <= 0) return 'Expired';

  const hours = Math.floor(remainingMs / 3_600_000);
  if (hours < 1) return 'Expires within the hour';
  if (hours < 24) return `Expires in ${hours} ${hours === 1 ? 'hour' : 'hours'}`;

  const days = Math.floor(hours / 24);
  return `Expires in ${days} ${days === 1 ? 'day' : 'days'}`;
}
