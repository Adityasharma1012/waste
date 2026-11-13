import React from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { ActionButton } from '@/components/ActionButton';
import { Card } from '@/components/Card';
import { ScreenShell } from '@/components/ScreenShell';
import { useApp } from '@/state/AppContext';

export default function InsightsScreen() {
  const { impactSummary, impactEvents, metricsSummary, theme } = useApp();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const maxCategoryCo2 = Math.max(
    0.1,
    ...impactSummary.byCategory.map((c) => c.co2eKg)
  );

  return (
    <ScreenShell
      title="Waste & Savings Insights"
      subtitle="Every impact figure below is an estimate based on documented category multipliers."
      rightAction={
        <ActionButton
          label="How is this calculated?"
          variant="secondary"
          onPress={() => router.push('/how-calculated')}
        />
      }>
      <Card>
        <Text style={[styles.estimateLabel, { color: theme.amberText }]}>
          ESTIMATE NOTICE • {impactSummary.disclaimer}
        </Text>
      </Card>

      <View style={[styles.grid, isWide && styles.gridWide]}>
        <Card style={styles.statCard}>
          <Text style={[styles.statTag, { color: theme.textMuted }]}>FOOD SAVED (ESTIMATE)</Text>
          <Text style={[styles.statVal, { color: theme.success }]}>
            ~{impactSummary.totalSavedKg.toFixed(2)} kg
          </Text>
          <Text style={[styles.statSub, { color: theme.textMuted }]}>
            Prevention rate: {impactSummary.wastePreventionRatePct}% (est.)
          </Text>
        </Card>

        <Card style={styles.statCard}>
          <Text style={[styles.statTag, { color: theme.textMuted }]}>MONEY SAVED (ESTIMATE)</Text>
          <Text style={[styles.statVal, { color: theme.primary }]}>
            ~${impactSummary.totalSavedMoneyUsd.toFixed(2)}
          </Text>
          <Text style={[styles.statSub, { color: theme.textMuted }]}>
            Based on retail category USD/kg
          </Text>
        </Card>

        <Card style={styles.statCard}>
          <Text style={[styles.statTag, { color: theme.textMuted }]}>CO2e AVOIDED (ESTIMATE)</Text>
          <Text style={[styles.statVal, { color: theme.info }]}>
            ~{impactSummary.totalSavedCo2eKg.toFixed(2)} kg CO2e
          </Text>
          <Text style={[styles.statSub, { color: theme.textMuted }]}>
            Discarded tracked: ~{impactSummary.totalDiscardedKg.toFixed(2)} kg
          </Text>
        </Card>
      </View>

      <Card>
        <Text style={[styles.heading, { color: theme.text }]}>
          Savings by Category (Estimate)
        </Text>
        {impactSummary.byCategory.length === 0 ? (
          <Text style={{ color: theme.textMuted }}>
            Mark items as Used/Saved or Frozen to record your household impact estimates.
          </Text>
        ) : (
          impactSummary.byCategory.map((cat) => {
            const pct = Math.max(8, Math.round((cat.co2eKg / maxCategoryCo2) * 100));
            return (
              <View key={cat.category} style={styles.barBlock}>
                <View style={styles.barHeader}>
                  <Text style={[styles.barTitle, { color: theme.text }]}>{cat.label}</Text>
                  <Text style={[styles.barVal, { color: theme.textMuted }]}>
                    ~{cat.savedKg} kg • ~${cat.moneyUsd.toFixed(2)} • ~{cat.co2eKg} kg CO2e (est.)
                  </Text>
                </View>
                <View style={[styles.track, { backgroundColor: theme.surfaceElevated }]}>
                  <View
                    style={[styles.fill, { width: `${pct}%`, backgroundColor: theme.primary }]}
                  />
                </View>
              </View>
            );
          })
        )}
      </Card>

      <Card>
        <Text style={[styles.heading, { color: theme.text }]}>
          Sustainable-AI Efficiency Snapshot
        </Text>
        {metricsSummary ? (
          <Text style={[styles.body, { color: theme.text }]}>
            {metricsSummary.withoutLlmPercent}% of API requests answered without an LLM (
            {metricsSummary.rulesHandledCount} rules, {metricsSummary.cacheHitsCount} cache hits,{' '}
            {metricsSummary.ragLlmCount} LLM calls). Est. AI cost: $
            {metricsSummary.totalEstimatedCostUsd.toFixed(5)}.
          </Text>
        ) : (
          <Text style={[styles.body, { color: theme.textMuted }]}>
            Currently running 100% locally via deterministic rules & A* search (0 LLM tokens, $0.00 AI cost). Connect backend to track API telemetry.
          </Text>
        )}
      </Card>

      <Card>
        <Text style={[styles.heading, { color: theme.text }]}>
          Recent Impact Log ({impactEvents.length})
        </Text>
        {impactEvents.slice(0, 10).map((ev) => (
          <View key={ev.id} style={[styles.logRow, { borderTopColor: theme.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.barTitle, { color: theme.text }]}>
                {ev.itemName} ({ev.outcome.toUpperCase()})
              </Text>
              <Text style={[styles.statSub, { color: theme.textMuted }]}>
                {ev.timestamp.slice(0, 10)}
              </Text>
            </View>
            <Text style={[styles.barVal, { color: ev.outcome === 'discarded' ? theme.danger : theme.success }]}>
              {ev.outcome === 'discarded' ? '-' : '+'}~{ev.weightKg} kg • ~${ev.estimatedValueUsd.toFixed(2)}
            </Text>
          </View>
        ))}
      </Card>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  estimateLabel: { fontSize: 13, fontWeight: '700', lineHeight: 19 },
  grid: { gap: 10 },
  gridWide: { flexDirection: 'row' },
  statCard: { flex: 1, gap: 4 },
  statTag: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  statVal: { fontSize: 23, fontWeight: '800' },
  statSub: { fontSize: 12 },
  heading: { fontSize: 17, fontWeight: '800' },
  body: { fontSize: 14, lineHeight: 20 },
  barBlock: { gap: 5 },
  barHeader: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 },
  barTitle: { fontSize: 14, fontWeight: '700' },
  barVal: { fontSize: 12, fontWeight: '600' },
  track: { height: 10, borderRadius: 999, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999 },
  logRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    gap: 10,
  },
});
