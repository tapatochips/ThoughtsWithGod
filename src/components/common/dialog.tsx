import { Alert } from 'react-native';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  destructive?: boolean;
}

// Shows a message with a single OK button. Resolves when it is dismissed.
export function notify(title: string, message?: string): Promise<void> {
  return new Promise((resolve) => {
    Alert.alert(title, message, [{ text: 'OK', onPress: () => resolve() }]);
  });
}

// Asks the user to confirm an action. Resolves true if they confirm.
export function confirm(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(options.title, options.message, [
      { text: options.cancelText, style: 'cancel', onPress: () => resolve(false) },
      {
        text: options.confirmText,
        style: options.destructive ? 'destructive' : 'default',
        onPress: () => resolve(true),
      },
    ]);
  });
}

// Native uses the system alert, so there is nothing to render.
export function DialogHost(): null {
  return null;
}
