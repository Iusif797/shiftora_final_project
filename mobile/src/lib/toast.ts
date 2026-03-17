import { Alert } from 'react-native';

export function showSuccess(title: string, message?: string) {
  Alert.alert(title, message ?? '', [{ text: 'OK' }]);
}

export function showError(title: string, message?: string) {
  Alert.alert(title, message ?? '', [{ text: 'OK' }]);
}

export function showAlert(title: string, message: string) {
  Alert.alert(title, message, [{ text: 'OK' }]);
}
