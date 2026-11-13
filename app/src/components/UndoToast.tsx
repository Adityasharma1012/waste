import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useApp } from '@/state/AppContext';
import { MIN_TOUCH_TARGET } from '@/theme/tokens';

export function UndoToast() {
  const { undoState, undoDelete, dismissUndo, theme } = useApp();
  if (!undoState) return null;

  return (
    <View
      style={[
        styles.wrapper,
        {
          backgroundColor: theme.isDark ? '#25382D' : '#132A1B',
          borderColor: theme.primary,
        },
      ]}
      accessibilityLiveRegion="polite">
      <Text style={styles.msg} numberOfLines={2}>
        Removed "{undoState.item.name}"
      </Text>
      <Pressable
        onPress={() => void undoDelete()}
        style={styles.undoBtn}
        accessibilityRole="button"
        accessibilityLabel={`Undo delete ${undoState.item.name}`}>
        <Text style={styles.undoText}>UNDO</Text>
      </Pressable>
      <Pressable
        onPress={dismissUndo}
        style={styles.dismissBtn}
        accessibilityRole="button"
        accessibilityLabel="Dismiss undo notification">
        <Text style={styles.dismissText}>✕</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 14,
    maxWidth: 600,
    alignSelf: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  msg: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
  },
  undoBtn: {
    minHeight: MIN_TOUCH_TARGET,
    minWidth: 64,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#22C55E',
  },
  undoText: {
    color: '#052E16',
    fontWeight: '800',
    fontSize: 13,
  },
  dismissBtn: {
    minHeight: MIN_TOUCH_TARGET,
    minWidth: MIN_TOUCH_TARGET,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dismissText: {
    color: '#CBD5E1',
    fontSize: 16,
    fontWeight: '700',
  },
});
