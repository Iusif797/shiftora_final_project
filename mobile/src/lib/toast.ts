import * as Burnt from 'burnt';

export function showSuccess(title: string, message?: string) {
  Burnt.toast({ title, message, preset: 'done' });
}

export function showError(title: string, message?: string) {
  Burnt.toast({ title, message, preset: 'error' });
}

export function showAlert(title: string, message: string) {
  Burnt.alert({ title, message, preset: 'error' });
}
