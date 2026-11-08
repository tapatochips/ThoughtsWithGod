import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeProvider';
import { REPORT_REASONS } from '../../services/firebase/moderationService';

interface ModerationSheetProps {
  /** Noun shown in the title, e.g. 'prayer request' or 'comment' */
  itemNoun: string;
  authorName: string;
  /** False for anonymous posts, whose author can't be identified */
  canBlock: boolean;
  onReport: (reason: string) => void;
  onBlock: () => void;
  onClose: () => void;
}

/**
 * Overlay with report reasons and a block option. Rendered as an absolutely
 * positioned View (not a Modal) so it can sit inside the comments Modal too.
 */
const ModerationSheet: React.FC<ModerationSheetProps> = ({
  itemNoun,
  authorName,
  canBlock,
  onReport,
  onBlock,
  onClose,
}) => {
  const { theme } = useTheme();

  return (
    <View style={styles.overlay}>
      <TouchableOpacity
        style={styles.backdrop}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close"
      />
      <View style={[styles.sheet, { backgroundColor: theme.colors.card }]}>
        <ScrollView>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            Report this {itemNoun}
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Why are you reporting it?
          </Text>

          {REPORT_REASONS.map((reason) => (
            <TouchableOpacity
              key={reason}
              style={[styles.option, { borderBottomColor: theme.colors.divider }]}
              onPress={() => onReport(reason)}
              accessibilityRole="button"
            >
              <Ionicons name="flag-outline" size={18} color={theme.colors.textSecondary} />
              <Text style={[styles.optionText, { color: theme.colors.text }]}>{reason}</Text>
            </TouchableOpacity>
          ))}

          {canBlock && (
            <TouchableOpacity
              style={[styles.option, styles.blockOption, { borderBottomColor: theme.colors.divider }]}
              onPress={onBlock}
              accessibilityRole="button"
            >
              <Ionicons name="ban-outline" size={18} color={theme.colors.danger} />
              <Text style={[styles.optionText, { color: theme.colors.danger }]}>
                Block {authorName}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.cancelButton, { backgroundColor: theme.colors.surface }]}
            onPress={onClose}
            accessibilityRole="button"
          >
            <Text style={[styles.cancelText, { color: theme.colors.text }]}>Cancel</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 10,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    paddingBottom: 32,
    maxHeight: '80%',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
    marginBottom: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  blockOption: {
    marginTop: 8,
  },
  optionText: {
    fontSize: 16,
    marginLeft: 12,
  },
  cancelButton: {
    marginTop: 16,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ModerationSheet;
