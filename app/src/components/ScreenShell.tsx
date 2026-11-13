import React from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '@/state/AppContext';
import { SafetyBanner } from './SafetyBanner';
import { UndoToast } from './UndoToast';

interface ScreenShellProps {
  title: string;
  subtitle?: string;
  rightAction?: React.ReactNode;
  children: React.ReactNode;
  showSafetyBanner?: boolean;
  scrollable?: boolean;
  contentStyle?: ViewStyle;
}

export function ScreenShell({
  title,
  subtitle,
  rightAction,
  children,
  showSafetyBanner = true,
  scrollable = true,
  contentStyle,
}: ScreenShellProps) {
  const { theme } = useApp();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const inner = (
    <View style={[styles.container, isWide && styles.containerWide, contentStyle]}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text
            style={[styles.title, { color: theme.text }]}
            accessibilityRole="header"
            maxFontSizeMultiplier={1.6}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: theme.textMuted }]} maxFontSizeMultiplier={1.5}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {rightAction ? <View style={styles.rightAction}>{rightAction}</View> : null}
      </View>

      {showSafetyBanner ? <SafetyBanner /> : null}

      <View style={styles.body}>{children}</View>
    </View>
  );

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.safe, { backgroundColor: theme.bg }]}>
      {scrollable ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          {inner}
        </ScrollView>
      ) : (
        <View style={styles.scroll}>{inner}</View>
      )}
      <UndoToast />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Platform.OS === 'web' ? 40 : 28,
  },
  container: {
    width: '100%',
    maxWidth: 1080,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 14,
  },
  containerWide: {
    paddingHorizontal: 28,
    paddingTop: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    flexWrap: 'wrap',
  },
  headerText: {
    flex: 1,
    minWidth: 200,
    gap: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  rightAction: {
    alignSelf: 'center',
  },
  body: {
    gap: 14,
  },
});
