import * as Haptics from 'expo-haptics';

type Cue = 'selection' | 'light' | 'medium' | 'success' | 'warning';

/**
 * Haptics fire only on state changes the user caused or must notice.
 * Nothing vibrates on scroll, arrivals, or passive events.
 */
export function haptic(cue: Cue): void {
  const fire = async () => {
    switch (cue) {
      case 'selection':
        await Haptics.selectionAsync();
        break;
      case 'light':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'medium':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'success':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'warning':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
    }
  };
  fire().catch(() => undefined);
}
