import type { DeliveryReason } from './enums';

export type ReasonParams = { name?: string; interest?: string; city?: string };

const MAX_LENGTH = 120;

function need(params: ReasonParams, key: keyof ReasonParams): string {
  const value = params[key]?.trim();
  if (!value) throw new Error(`missing ${key}`);
  return value;
}

/**
 * The closed set of "Why you're seeing this" lines (06 §9.5). A new reason is
 * a product decision, not a copy edit, so unknown codes throw.
 */
export function reasonText(code: DeliveryReason, params: ReasonParams): string {
  const text = (() => {
    switch (code) {
      case 'friend_going':
        return `${need(params, 'name')} is going`;
      case 'friend_vouched':
        return `Vouched by ${need(params, 'name')}`;
      case 'friend_hosting':
        return `${need(params, 'name')} is hosting`;
      case 'friends_of_friends':
        return 'Friends of friends';
      case 'nearby_interest':
        return `Near you · ${need(params, 'interest')}`;
      case 'nearby':
        return 'Near you';
      case 'heading_to':
        return `You're heading to ${need(params, 'city')}`;
      case 'venue_nearby':
        return 'Hosted by a venue near you';
      case 'widened':
        return `Anyone in ${need(params, 'city')}`;
      default:
        throw new Error(`unknown reason: ${String(code)}`);
    }
  })();
  if (Array.from(text).length > MAX_LENGTH) throw new Error('reason too long');
  return text;
}
