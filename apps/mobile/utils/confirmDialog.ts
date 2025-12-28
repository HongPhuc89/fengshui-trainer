/**
 * Simple test to check if Alert works on web
 *
 * ISSUE: Alert.alert on web doesn't trigger callbacks properly
 * SOLUTION: Use window.confirm for web, Alert.alert for native
 */

import { Platform, Alert } from 'react-native';

export const showConfirmDialog = (
  title: string,
  message: string,
  onConfirm: () => void,
  onCancel?: () => void,
): void => {
  if (Platform.OS === 'web') {
    // Use native browser confirm for web
    const confirmed = window.confirm(`${title}\n\n${message}`);
    if (confirmed) {
      onConfirm();
    } else if (onCancel) {
      onCancel();
    }
  } else {
    // Use React Native Alert for mobile
    Alert.alert(title, message, [
      {
        text: 'Hủy',
        style: 'cancel',
        onPress: onCancel,
      },
      {
        text: 'OK',
        onPress: onConfirm,
      },
    ]);
  }
};
