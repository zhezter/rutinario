import * as Haptics from 'expo-haptics';

export function hapticSelection() {
  void Haptics.selectionAsync();
}

export function hapticSuccess() {
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

export function hapticWarning() {
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
}
