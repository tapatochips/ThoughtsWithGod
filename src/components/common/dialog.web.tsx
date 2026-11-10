import React, { useSyncExternalStore } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../context/ThemeProvider';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  destructive?: boolean;
}

interface Dialog {
  title: string;
  message?: string;
  confirmText: string;
  cancelText?: string;
  destructive?: boolean;
  resolve: (confirmed: boolean) => void;
}

// Dialogs wait in a queue and are shown one at a time by <DialogHost />.
let queue: Dialog[] = [];
const listeners = new Set<() => void>();

function setQueue(next: Dialog[]) {
  queue = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function show(dialog: Omit<Dialog, 'resolve'>): Promise<boolean> {
  if (listeners.size === 0) {
    throw new Error('DialogHost is not mounted');
  }
  return new Promise((resolve) => {
    setQueue([...queue, { ...dialog, resolve }]);
  });
}

// Shows a message with a single OK button. Resolves when it is dismissed.
export async function notify(title: string, message?: string): Promise<void> {
  await show({ title, message, confirmText: 'OK' });
}

// Asks the user to confirm an action. Resolves true if they confirm.
export function confirm(options: ConfirmOptions): Promise<boolean> {
  return show(options);
}

// Renders the current dialog. Mounted once, at the root of the app.
export function DialogHost() {
  const { theme } = useTheme();
  const dialog = useSyncExternalStore(subscribe, () => queue[0]);

  if (!dialog) return null;

  const close = (confirmed: boolean) => {
    setQueue(queue.slice(1));
    dialog.resolve(confirmed);
  };

  // Escape cancels a confirmation and dismisses a message.
  const dismiss = () => close(!dialog.cancelText);

  return (
    <Modal transparent visible animationType="fade" onRequestClose={dismiss}>
      <View style={styles.overlay}>
        <View
          accessibilityRole="alert"
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.lg,
            },
          ]}
        >
          <Text style={[styles.title, { color: theme.colors.text, fontSize: theme.fontSize.lg }]}>
            {dialog.title}
          </Text>
          {!!dialog.message && (
            <Text
              style={{
                color: theme.colors.textSecondary,
                fontSize: theme.fontSize.sm,
                marginTop: theme.spacing.sm,
              }}
            >
              {dialog.message}
            </Text>
          )}
          <View style={[styles.buttons, { marginTop: theme.spacing.lg, gap: theme.spacing.sm }]}>
            {!!dialog.cancelText && (
              <Pressable
                accessibilityRole="button"
                onPress={() => close(false)}
                style={[
                  styles.button,
                  { borderColor: theme.colors.border, borderRadius: theme.borderRadius.md },
                ]}
              >
                <Text style={[styles.buttonText, { color: theme.colors.text, fontSize: theme.fontSize.sm }]}>
                  {dialog.cancelText}
                </Text>
              </Pressable>
            )}
            <Pressable
              accessibilityRole="button"
              onPress={() => close(true)}
              style={[
                styles.button,
                {
                  backgroundColor: dialog.destructive ? theme.colors.danger : theme.colors.primary,
                  borderColor: 'transparent',
                  borderRadius: theme.borderRadius.md,
                },
              ]}
            >
              <Text style={[styles.buttonText, { color: '#FFFFFF', fontSize: theme.fontSize.sm }]}>
                {dialog.confirmText}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
  },
  title: {
    fontWeight: '600',
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
  },
  buttonText: {
    fontWeight: '600',
  },
});
