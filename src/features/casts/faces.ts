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
