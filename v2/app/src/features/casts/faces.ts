import type { ImageSourcePropType } from 'react-native';

/**
 * fixture photo registry. static requires so metro bundles them.
 * production replaces this with camera-verified selfie urls.
 */
export const facePhotos: Record<string, ImageSourcePropType> = {
  aarav: require('../../../assets/images/people/aarav.png'),
  meera: require('../../../assets/images/people/meera.png'),
  dev: require('../../../assets/images/people/dev.png'),
  riya: require('../../../assets/images/people/riya.png'),
  arjun: require('../../../assets/images/people/arjun.png'),
  me: require('../../../assets/images/people/me.png'),
};

/**
 * whose selfie has been captured live in-app. drives the ✓ badge on
 * every Face render. production reads a boolean off the profile row.
 * fixture: everyone we ship with is verified; the newer casters
 * (nikhil, sana, rohan, priya, vikram, neha) are unverified — the
 * face falls back to initials AND has no badge, which is how a
 * pre-verification person should feel.
 */
const VERIFIED = new Set<string>(['me', 'aarav', 'meera', 'dev', 'riya', 'arjun', 'kavya']);

export function isVerified(personId: string): boolean {
  return VERIFIED.has(personId);
}
