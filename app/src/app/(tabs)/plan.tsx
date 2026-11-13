import React, { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ActionSelection, PlannerAction } from '@wasteless/core';
import { ActionButton } from '@/components/ActionButton';
import { Card } from '@/components/Card';
import { ScreenShell } from '@/components/ScreenShell';
import { useApp } from '@/state/AppContext';
import { MIN_TOUCH_TARGET } from '@/theme/tokens';

export default function ActionPlanScreen() {
  const {
    items,
    profile,
    settings,
    actionSelection,
    inventoryAnalysis,
    apiClient,
    markItemOutcome,
    refreshBackend,
    theme,
  } = useApp();

  const [remoteSelection, setRemoteSelection] = useState<ActionSelection | null>(null);
  const [planSourceLabel, setPlanSourceLabel] = useState<string>('Local Core Engine');
  const [syncing, setSyncing] = useState(false);

  const syncPlan = async () => {
    setSyncing(true);
    try {
      const res = await apiClient.getActionPlan(items, profile, settings.utilityWeights);
      setRemoteSelection(res.selection);
      setPlanSourceLabel(
        res.fromOfflineFallback
          ? `Offline Rules & A* Fallback (${res.responseTimeMs} ms)`
          : `Backend [${res.resolutionTier.toUpperCase()}] (${res.responseTimeMs} ms)`
      );
      void refreshBackend();
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    void syncPlan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, profile, settings.utilityWeights, settings.apiUrl]);

  const activeSelection = remoteSelection ?? actionSelection;
  const plan = activeSelection.selectedPlan;

  const completeStep = async (step: PlannerAction) => {
    const outcome =
      step.type === 'DISCARD_UNSAFE'
        ? 'discarded'
        : step.type === 'FREEZE_ITEM'
          ? 'frozen'
          : 'saved';
    for (const id of step.targetItemIds) {
      await markItemOutcome(id, outcome);
    }
  };

  return (
    <ScreenShell
      title="Use-Soon Action Plan"
      subtitle="A* Search Planner + Utility Agents + Safety Rules Engine"
      rightAction={
        <ActionButton
          label={syncing ? 'Planning...' : 'Recompute Plan'}
          variant="secondary"
          disabled={syncing}
          onPress={() => void syncPlan()}
        />
      }>
      <Card>
        <View style={styles.badgeRow}>
          <View
            style={[
              styles.tierPill,
              { backgroundColor: theme.infoSoft, borderColor: theme.info },
            ]}>
            <Text style={[styles.tierText, { color: theme.infoText }]}>{planSourceLabel}</Text>
          </View>
          <View
            style={[
              styles.tierPill,
              { backgroundColor: theme.primarySoft, borderColor: theme.primary },
            ]}>
            <Text style={[styles.tierText, { color: theme.successText }]}>
              {plan.algorithm} • {plan.statesExpanded} states expanded • {plan.searchTimeMs} ms
            </Text>
          </View>
        </View>

        <Text style={[styles.heading, { color: theme.text }]}>Why This Plan Was Chosen</Text>
        <Text style={[styles.body, { color: theme.text }]}>{plan.plainLanguageExplanation}</Text>

        <View style={styles.totalsRow}>
          <Text style={[styles.totalChip, { color: theme.primary }]}>
            {plan.totals.itemsAddressed} items handled
          </Text>
          <Text style={[styles.totalChip, { color: theme.text }]}>
            ~{plan.totals.minutesRequired} min
          </Text>
          <Text style={[styles.totalChip, { color: theme.success }]}>
            Est. ~{plan.totals.estimatedKgSaved} kg / ~${plan.totals.estimatedMoneySavedUsd.toFixed(2)} / ~{plan.totals.estimatedCo2eSavedKg} kg CO2e
          </Text>
        </View>
      </Card>

      <View style={styles.sectionHeader}>
        <Text style={[styles.heading, { color: theme.text }]}>
          Step-by-Step Plan ({plan.steps.length})
        </Text>
      </View>

      {plan.steps.length === 0 ? (
        <Card>
          <Text style={[styles.body, { color: theme.textMuted }]}>
            No urgent actions needed right now — all tracked items are in the Safe window.
          </Text>
        </Card>
      ) : (
        plan.steps.map((step, idx) => (
          <Card key={step.id}>
            <View style={styles.stepTop}>
              <Text style={[styles.stepNum, { color: theme.primary }]}>
                STEP {idx + 1} • {step.type}
              </Text>
              <Text style={[styles.utilityText, { color: theme.textMuted }]}>
                Utility +{step.utilityGain}
              </Text>
            </View>
            <Text style={[styles.stepTitle, { color: theme.text }]}>{step.title}</Text>
            <Text style={[styles.meta, { color: theme.textMuted }]}>
              Targets: {step.targetItemNames.join(', ')} • ~{step.estimatedMinutes} min
            </Text>
            <Text style={[styles.body, { color: theme.text }]}>{step.rationale}</Text>
            {step.safetyWarning ? (
              <View
                style={[
                  styles.warnBox,
                  { backgroundColor: theme.dangerSoft, borderColor: theme.danger },
                ]}>
                <Ionicons name="warning" size={16} color={theme.dangerText} />
                <Text style={[styles.warnText, { color: theme.dangerText }]}>
                  {step.safetyWarning}
                </Text>
              </View>
            ) : null}
            <ActionButton
              label={
                step.type === 'DISCARD_UNSAFE'
                  ? 'Mark Discarded Safely'
                  : step.type === 'FREEZE_ITEM'
                    ? 'Mark Frozen (+Est. Saved)'
                    : 'Mark Step Completed (+Est. Saved)'
              }
              variant={step.type === 'DISCARD_UNSAFE' ? 'danger' : 'primary'}
              onPress={() => void completeStep(step)}
            />
          </Card>
        ))
      )}

      {plan.rejectedAlternatives.length > 0 ? (
        <Card>
          <Text style={[styles.heading, { color: theme.text }]}>
            Alternatives Considered & Rejected
          </Text>
          {plan.rejectedAlternatives.map((alt, i) => (
            <View key={`${alt.stepNumber}-${i}`} style={[styles.altRow, { borderTopColor: theme.border }]}>
              <Text style={[styles.altTitle, { color: theme.text }]}>
                Step {alt.stepNumber} Rejected: {alt.actionTitle} (Utility {alt.utilityScore})
              </Text>
              <Text style={[styles.body, { color: theme.textMuted }]}>{alt.reasonRejected}</Text>
            </View>
          ))}
        </Card>
      ) : null}

      <Card>
        <Text style={[styles.heading, { color: theme.text }]}>
          Utility Agents Breakdown
        </Text>
        <Text style={[styles.meta, { color: theme.textMuted }]}>
          Weights: Urgency {settings.utilityWeights.urgency.toFixed(2)} • Waste{' '}
          {settings.utilityWeights.wastePrevented.toFixed(2)} • Cost{' '}
          {settings.utilityWeights.costSavings.toFixed(2)} • Time{' '}
          {settings.utilityWeights.timeEffort.toFixed(2)} • Fit{' '}
          {settings.utilityWeights.preferenceFit.toFixed(2)} (editable in Settings)
        </Text>
        <View style={[styles.agentBox, { borderColor: theme.border }]}>
          <Text style={[styles.agentName, { color: theme.primary }]}>
            1. InventoryAnalyst — Health {inventoryAnalysis.utilityScore}/100
          </Text>
          <Text style={[styles.body, { color: theme.textMuted }]}>
            {inventoryAnalysis.result.summary}
          </Text>
        </View>
        <View style={[styles.agentBox, { borderColor: theme.border }]}>
          <Text style={[styles.agentName, { color: theme.primary }]}>
            2. ExpiryPrioritizer — Top Risk Items
          </Text>
          {activeSelection.topPriorities.slice(0, 4).map((p) => (
            <Text key={p.item.id} style={[styles.body, { color: theme.text }]}>
              • {p.item.name}: Score {p.urgencyScore} ({p.daysUntilExpiry}d,{' '}
              {p.safetyBlocked ? 'SAFETY BLOCKED' : p.recommendedAction})
            </Text>
          ))}
        </View>
        <View style={[styles.agentBox, { borderColor: theme.border }]}>
          <Text style={[styles.agentName, { color: theme.primary }]}>
            3. ActionSelector Arbitration
          </Text>
          <Text style={[styles.body, { color: theme.textMuted }]}>
            {activeSelection.arbitrationSummary}
          </Text>
        </View>
      </Card>

      <Card>
        <Text style={[styles.heading, { color: theme.text }]}>
          Triggered Rules Engine ({activeSelection.triggeredRules.length})
        </Text>
        {activeSelection.triggeredRules.length === 0 ? (
          <Text style={[styles.body, { color: theme.textMuted }]}>
            No urgent or safety rules triggered right now.
          </Text>
        ) : (
          activeSelection.triggeredRules.map((rule, idx) => (
            <View
              key={`${rule.ruleId}-${rule.itemId}-${idx}`}
              style={[styles.ruleCard, { borderTopColor: theme.border }]}>
              <Text
                style={[
                  styles.ruleId,
                  {
                    color:
                      rule.severity === 'safety'
                        ? theme.danger
                        : rule.severity === 'urgent'
                          ? theme.warning
                          : theme.primary,
                  },
                ]}>
                [{rule.ruleId}] {rule.title} — {rule.itemName}
              </Text>
              <Text style={[styles.meta, { color: theme.textMuted }]}>
                Condition: {rule.conditionMatched}
              </Text>
              <Text style={[styles.body, { color: theme.text }]}>
                Action: {rule.actionRecommended}
              </Text>
              <Text style={[styles.meta, { color: theme.textMuted }]}>
                Rationale: {rule.rationale}
              </Text>
              <Text style={[styles.safetySmall, { color: theme.amberText }]}>
                {rule.safetyNote}
              </Text>
              <Pressable
                onPress={() => void Linking.openURL(rule.sourceRef.url)}
                style={styles.linkBtn}
                accessibilityRole="link">
                <Text style={[styles.linkText, { color: theme.info }]}>
                  Source: {rule.sourceRef.sourceName} ↗
                </Text>
              </Pressable>
            </View>
          ))
        )}
      </Card>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tierPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  tierText: { fontSize: 11, fontWeight: '800' },
  heading: { fontSize: 17, fontWeight: '800' },
  body: { fontSize: 14, lineHeight: 20 },
  meta: { fontSize: 12, lineHeight: 18 },
  totalsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 },
  totalChip: { fontSize: 13, fontWeight: '800' },
  sectionHeader: { marginTop: 4 },
  stepTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stepNum: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  utilityText: { fontSize: 12, fontWeight: '700' },
  stepTitle: { fontSize: 17, fontWeight: '800' },
  warnBox: {
    flexDirection: 'row',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  warnText: { flex: 1, fontSize: 12, fontWeight: '700' },
  altRow: { paddingTop: 10, borderTopWidth: 1, gap: 4 },
  altTitle: { fontSize: 13, fontWeight: '700' },
  agentBox: { padding: 10, borderWidth: 1, borderRadius: 10, gap: 4 },
  agentName: { fontSize: 14, fontWeight: '800' },
  ruleCard: { paddingTop: 10, borderTopWidth: 1, gap: 4 },
  ruleId: { fontSize: 13, fontWeight: '800' },
  safetySmall: { fontSize: 12, fontWeight: '700' },
  linkBtn: { minHeight: MIN_TOUCH_TARGET, justifyContent: 'center' },
  linkText: { fontSize: 12, fontWeight: '700', textDecorationLine: 'underline' },
});
