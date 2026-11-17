import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * The app has exactly two haptics, and no interface sounds:
 *  - a light tap when an option is selected
 *  - a success haptic when a class is completed
 * Do not add others.
 */
const supported = Platform.OS === 'ios' || Platform.OS === 'android';

/** A light tap. Call when an option is selected. */
export function selectionTap(): void {
  if (!supported) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

/** Call once, when a class is completed. */
export function classCompleted(): void {
  if (!supported) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}
