import { SymbolView } from 'expo-symbols';
import type { ComponentProps } from 'react';

import { useTheme } from '../theme';
import type { ThemeColors } from '../tokens';

type SymbolName = Exclude<ComponentProps<typeof SymbolView>['name'], string>;

/** The canonical icon map (06 §7.1): SF Symbols on iOS, Material Symbols on Android and web. */
export const ICONS = {
  back: { ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' },
  close: { ios: 'xmark', android: 'close', web: 'close' },
  confirm: { ios: 'checkmark', android: 'check', web: 'check' },
  search: { ios: 'magnifyingglass', android: 'search', web: 'search' },
  filters: { ios: 'line.3.horizontal.decrease', android: 'tune', web: 'tune' },
  notifications: { ios: 'bell', android: 'notifications', web: 'notifications' },
  share: { ios: 'square.and.arrow.up', android: 'share', web: 'share' },
  report: { ios: 'flag', android: 'flag', web: 'flag' },
  block: { ios: 'hand.raised', android: 'block', web: 'block' },
  safety: { ios: 'shield', android: 'shield', web: 'shield' },
  area: { ios: 'mappin.and.ellipse', android: 'location_on', web: 'location_on' },
  spotLocked: { ios: 'lock', android: 'lock', web: 'lock' },
  spotUnlocked: { ios: 'lock.open', android: 'lock_open', web: 'lock_open' },
  recenter: { ios: 'location', android: 'my_location', web: 'my_location' },
  time: { ios: 'clock', android: 'schedule', web: 'schedule' },
  repeats: { ios: 'repeat', android: 'repeat', web: 'repeat' },
  capacity: { ios: 'person.2', android: 'group', web: 'group' },
  reach: { ios: 'dot.radiowaves.left.and.right', android: 'radar', web: 'radar' },
  reason: { ios: 'info.circle', android: 'info', web: 'info' },
  notForMe: { ios: 'eye.slash', android: 'visibility_off', web: 'visibility_off' },
  verified: { ios: 'checkmark.seal.fill', android: 'verified', web: 'verified' },
  showedUp: { ios: 'figure.walk', android: 'directions_walk', web: 'directions_walk' },
  hosted: { ios: 'star.circle', android: 'stars', web: 'stars' },
  vouch: { ios: 'hand.thumbsup', android: 'thumb_up', web: 'thumb_up' },
  connection: { ios: 'person.2.wave.2', android: 'handshake', web: 'handshake' },
  person: { ios: 'person.fill', android: 'person', web: 'person' },
  camera: { ios: 'camera', android: 'photo_camera', web: 'photo_camera' },
  photo: { ios: 'photo', android: 'image', web: 'image' },
  poll: { ios: 'chart.bar', android: 'poll', web: 'poll' },
  trustedContact: { ios: 'person.badge.shield.checkmark', android: 'contact_emergency', web: 'contact_emergency' },
  settings: { ios: 'gearshape', android: 'settings', web: 'settings' },
  tabNearby: { ios: 'map', android: 'map', web: 'map' },
  tabChats: { ios: 'bubble.left.and.bubble.right', android: 'forum', web: 'forum' },
  tabPost: { ios: 'plus', android: 'add', web: 'add' },
  tabYou: { ios: 'person.crop.circle', android: 'account_circle', web: 'account_circle' },
  chevron: { ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' },
  error: { ios: 'exclamationmark.triangle', android: 'error', web: 'error' },
  offline: { ios: 'wifi.slash', android: 'wifi_off', web: 'wifi_off' },
  pending: { ios: 'hourglass', android: 'hourglass_empty', web: 'hourglass_empty' },
  send: { ios: 'arrow.up', android: 'send', web: 'send' },
  more: { ios: 'ellipsis', android: 'more_horiz', web: 'more_horiz' },
} as const satisfies Record<string, SymbolName>;

export type IconName = keyof typeof ICONS;

type IconProps = {
  name: IconName;
  /** What the icon means, read by screen readers. `null` marks it decorative (text next to it says the same). */
  label: string | null;
  size?: number;
  color?: keyof ThemeColors;
};

export function Icon({ name, label, size = 20, color = 'textPrimary' }: IconProps) {
  const { colors } = useTheme();
  const decorative = label === null;
  return (
    <SymbolView
      accessibilityElementsHidden={decorative}
      accessibilityLabel={label ?? undefined}
      accessibilityRole={decorative ? undefined : 'image'}
      accessible={!decorative}
      importantForAccessibility={decorative ? 'no-hide-descendants' : 'yes'}
      name={ICONS[name]}
      size={size}
      tintColor={colors[color]}
      testID={`icon-${name}`}
    />
  );
}
