import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { getImpactCalculationGuide } from '@wasteless/core';
import { Card } from '@/components/Card';
import { ScreenShell } from '@/components/ScreenShell';
import { useApp } from '@/state/AppContext';
import { MIN_TOUCH_TARGET } from '@/theme/tokens';

export default function HowCalculatedScreen() {
  const { theme } = useApp();
  const guide = getImpactCalculationGuide();

  return (
    <ScreenShell
      title="How Is This Calculated?"
      subtitle={`Methodology v${guide.methodologyVersion} • Every figure is an estimate.`}>
      <Card>
        <Text style={[styles.heading, { color: theme.text }]}>Estimate Notice</Text>
        <Text style={[styles.body, { color: theme.textMuted }]}>{guide.disclaimer}</Text>
      </Card>

      <Card>
        <Text style={[styles.heading, { color: theme.text }]}>Plain-Language Formula</Text>
        {guide.plainLanguageSteps.map((step) => (
          <Text key={step} style={[styles.body, { color: theme.text }]}>
            {step}
          </Text>
        ))}
        <View style={[styles.formulaBox, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
          <Text style={[styles.formulaLine, { color: theme.text }]}>{guide.formulas.weightKg}</Text>
          <Text style={[styles.formulaLine, { color: theme.text }]}>{guide.formulas.moneyUsd}</Text>
          <Text style={[styles.formulaLine, { color: theme.text }]}>{guide.formulas.co2eKg}</Text>
        </View>
      </Card>

      <Card>
        <Text style={[styles.heading, { color: theme.text }]}>
          Category Multipliers (Single Config Source)
        </Text>
        {guide.categoryConstants.map((c) => (
          <View key={c.category} style={[styles.row, { borderBottomColor: theme.border }]}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[styles.catTitle, { color: theme.text }]}>{c.label}</Text>
              <Text style={[styles.citation, { color: theme.textMuted }]}>{c.sourceCitation}</Text>
            </View>
            <View style={styles.metricsCol}>
              <Text style={[styles.metricBadge, { color: theme.primary }]}>
                {c.co2eKgPerKg} kg CO2e/kg
              </Text>
              <Text style={[styles.metricBadge, { color: theme.text }]}>
                ~${c.avgPriceUsdPerKg.toFixed(2)}/kg
              </Text>
            </View>
          </View>
        ))}
      </Card>

      <Card>
        <Text style={[styles.heading, { color: theme.text }]}>Documented Sources</Text>
        {guide.sources.map((src) => (
          <Pressable
            key={src.url}
            onPress={() => void Linking.openURL(src.url)}
            style={styles.linkBtn}
            accessibilityRole="link">
            <Text style={[styles.linkTitle, { color: theme.info }]}>{src.name}</Text>
            <Text style={[styles.citation, { color: theme.textMuted }]}>{src.usedFor}</Text>
          </Pressable>
        ))}
      </Card>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 17, fontWeight: '800' },
  body: { fontSize: 14, lineHeight: 20 },
  formulaBox: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
    marginTop: 6,
  },
  formulaLine: { fontSize: 13, fontWeight: '700' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  catTitle: { fontSize: 14, fontWeight: '700' },
  citation: { fontSize: 12, lineHeight: 17 },
  metricsCol: { alignItems: 'flex-end', justifyContent: 'center', gap: 2 },
  metricBadge: { fontSize: 12, fontWeight: '800' },
  linkBtn: {
    minHeight: MIN_TOUCH_TARGET,
    paddingVertical: 6,
    gap: 2,
  },
  linkTitle: { fontSize: 14, fontWeight: '700', textDecorationLine: 'underline' },
});
