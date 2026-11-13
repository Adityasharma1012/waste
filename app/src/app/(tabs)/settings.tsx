import React, { useEffect, useState } from 'react';
import {
  Linking,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  DEFAULT_UTILITY_WEIGHTS,
  type KnowledgeCitation,
  type UtilityWeights,
} from '@wasteless/core';
import { ActionButton } from '@/components/ActionButton';
import { Card } from '@/components/Card';
import { ScreenShell } from '@/components/ScreenShell';
import { useApp } from '@/state/AppContext';
import { FONT_MONO, MIN_TOUCH_TARGET } from '@/theme/tokens';

const WEIGHT_LABELS: Array<{ key: keyof UtilityWeights; label: string }> = [
  { key: 'urgency', label: 'Expiry Urgency' },
  { key: 'wastePrevented', label: 'Waste & CO2e Prevented' },
  { key: 'costSavings', label: 'Grocery Cost Savings' },
  { key: 'timeEffort', label: 'Low Cooking Effort / Time' },
  { key: 'preferenceFit', label: 'Dietary & Goal Fit' },
];

export default function SettingsScreen() {
  const {
    profile,
    settings,
    backendHealth,
    metricsSummary,
    apiClient,
    refreshBackend,
    updateSettings,
    updateWeights,
    toggleDemoMode,
    resetDemoData,
    exportAllJson,
    theme,
  } = useApp();
  const router = useRouter();

  const [apiUrlInput, setApiUrlInput] = useState(settings.apiUrl);
  const [exportedPreview, setExportedPreview] = useState<string | null>(null);
  const [sourcesInfo, setSourcesInfo] = useState<{
    verifiedCount: number;
    excludedPlaceholderCount: number;
    sources: KnowledgeCitation[];
  } | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  useEffect(() => {
    void apiClient.getKnowledgeSources().then((res) => {
      if (res) setSourcesInfo(res);
    });
  }, [apiClient, backendHealth.reachable]);

  const adjustWeight = (key: keyof UtilityWeights, delta: number) => {
    const nextVal = Math.max(0.05, Math.min(0.8, Math.round((settings.utilityWeights[key] + delta) * 100) / 100));
    void updateWeights({ ...settings.utilityWeights, [key]: nextVal });
  };

  const handleSaveApiUrl = async () => {
    const clean = apiUrlInput.trim() || 'http://localhost:4000';
    await updateSettings({ apiUrl: clean });
    apiClient.setBaseUrl(clean);
    await refreshBackend();
    setStatusNotice(`Updated backend URL to ${clean}`);
  };

  const handleExport = async () => {
    const json = exportAllJson();
    setExportedPreview(json);
    if (Platform.OS !== 'web') {
      try {
        await Share.share({ message: json, title: 'WasteLess AI Data Export' });
      } catch {
        // Preview still shown below
      }
    }
  };

  return (
    <ScreenShell
      title="Settings, AI Metrics & Sources"
      subtitle="Manage demo mode, utility agent weights, backend connection, and verified knowledge sources.">
      <Card>
        <Text style={[styles.heading, { color: theme.text }]}>
          Sustainable-AI Metrics (Order: Rules → Cache → RAG LLM)
        </Text>
        {metricsSummary ? (
          <View style={{ gap: 6 }}>
            <Text style={[styles.highlight, { color: theme.primary }]}>
              {metricsSummary.withoutLlmPercent}% of requests answered without an LLM
            </Text>
            <Text style={[styles.body, { color: theme.text }]}>
              Total Requests: {metricsSummary.totalRequests} • Rules: {metricsSummary.rulesHandledCount} • Cache Hits: {metricsSummary.cacheHitsCount} ({metricsSummary.cacheHitPercent}%) • RAG+LLM: {metricsSummary.ragLlmCount} • Offline RAG: {metricsSummary.ragOfflineCount}
            </Text>
            <Text style={[styles.meta, { color: theme.textMuted }]}>
              Avg Latency: {metricsSummary.avgResponseTimeMs} ms • Tokens: {metricsSummary.totalInputTokens + metricsSummary.totalOutputTokens} • Est. AI Cost: ${metricsSummary.totalEstimatedCostUsd.toFixed(5)}
            </Text>
          </View>
        ) : (
          <Text style={[styles.body, { color: theme.textMuted }]}>
            Offline mode active: 100% of dashboard, planning, and recipe scores run locally with 0 LLM calls and $0.00 cost. Start the backend server to inspect live RAG/cache metrics.
          </Text>
        )}
      </Card>

      <Card>
        <Text style={[styles.heading, { color: theme.text }]}>Backend & LLM Provider Status</Text>
        <Text style={[styles.body, { color: backendHealth.reachable ? theme.success : theme.warning }]}>
          Status: {backendHealth.reachable ? 'Connected' : 'Unreachable (Offline Rules Fallback Active)'}
        </Text>
        <Text style={[styles.meta, { color: theme.textMuted }]}>
          Active Provider: {backendHealth.providerName} • External Key Configured:{' '}
          {backendHealth.providerConfigured ? 'Yes (server-side)' : 'No (Mock/Offline)'} • KB Passages:{' '}
          {backendHealth.knowledgeCount}
        </Text>

        <Text style={[styles.label, { color: theme.text }]}>Backend API URL</Text>
        <View style={styles.urlRow}>
          <TextInput
            value={apiUrlInput}
            onChangeText={setApiUrlInput}
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Backend API URL"
            style={[
              styles.input,
              { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg },
            ]}
          />
          <ActionButton label="Save & Ping" onPress={() => void handleSaveApiUrl()} />
        </View>
        {statusNotice ? (
          <Text style={[styles.meta, { color: theme.primary }]}>{statusNotice}</Text>
        ) : null}
      </Card>

      <Card>
        <View style={styles.rowBetween}>
          <Text style={[styles.heading, { color: theme.text }]}>Utility Agent Weights</Text>
          <ActionButton
            label="Reset Defaults"
            variant="ghost"
            onPress={() => void updateWeights({ ...DEFAULT_UTILITY_WEIGHTS })}
          />
        </View>
        <Text style={[styles.meta, { color: theme.textMuted }]}>
          Formula: U = Σ(w_i · factor_i) / Σw_i. Adjusting weights updates ExpiryPrioritizer, RecipePlanner, and A* Action Plan immediately.
        </Text>
        {WEIGHT_LABELS.map((w) => (
          <View key={w.key} style={styles.weightRow}>
            <Text style={[styles.weightLabel, { color: theme.text }]}>{w.label}</Text>
            <View style={styles.weightControls}>
              <ActionButton
                label="-"
                variant="secondary"
                accessibilityLabel={`Decrease ${w.label} weight`}
                onPress={() => adjustWeight(w.key, -0.05)}
                style={styles.smallStep}
              />
              <Text style={[styles.weightVal, { color: theme.primary }]}>
                {settings.utilityWeights[w.key].toFixed(2)}
              </Text>
              <ActionButton
                label="+"
                variant="secondary"
                accessibilityLabel={`Increase ${w.label} weight`}
                onPress={() => adjustWeight(w.key, 0.05)}
                style={styles.smallStep}
              />
            </View>
          </View>
        ))}
      </Card>

      <Card>
        <Text style={[styles.heading, { color: theme.text }]}>Household & Appearance</Text>
        <Text style={[styles.body, { color: theme.textMuted }]}>
          Size: {profile.householdSize} • Diet: {profile.dietaryPreferences.join(', ')} • Budget:{' '}
          {profile.budgetLevel} (${profile.weeklyBudgetUsd}/wk) • Cooking: {profile.availableCookingMinutes} min
        </Text>
        <ActionButton
          label="Edit Household Onboarding Setup"
          variant="secondary"
          onPress={() => router.push('/onboarding')}
        />

        <Text style={[styles.label, { color: theme.text }]}>Theme</Text>
        <View style={styles.chipRow}>
          {(['system', 'light', 'dark'] as const).map((t) => {
            const active = settings.themePreference === t;
            return (
              <Pressable
                key={t}
                onPress={() => void updateSettings({ themePreference: t })}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? theme.primarySoft : theme.surfaceElevated,
                    borderColor: active ? theme.primary : theme.border,
                  },
                ]}>
                <Text style={[styles.chipText, { color: active ? theme.successText : theme.text }]}>
                  {t.toUpperCase()}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Card>
        <Text style={[styles.heading, { color: theme.text }]}>Demo Mode & Data Controls</Text>
        <View style={styles.rowBetween}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: theme.text }]}>Demo Mode</Text>
            <Text style={[styles.meta, { color: theme.textMuted }]}>
              Works offline with seeded sample household inventory and impact history.
            </Text>
          </View>
          <Switch
            value={settings.demoMode}
            onValueChange={(v) => void toggleDemoMode(v)}
            accessibilityLabel="Toggle demo mode"
          />
        </View>

        <View style={styles.btnGrid}>
          <ActionButton
            label="Reset Demo Data (12 Items)"
            variant="secondary"
            onPress={() => {
              void resetDemoData(true);
              setStatusNotice('Demo inventory and impact data restored.');
            }}
            style={{ flex: 1 }}
          />
          <ActionButton
            label="Clear All Items"
            variant="danger"
            onPress={() => {
              void resetDemoData(false);
              setStatusNotice('Cleared all pantry and impact records.');
            }}
            style={{ flex: 1 }}
          />
        </View>

        <ActionButton label="Export Data (JSON)" onPress={() => void handleExport()} />
        {exportedPreview ? (
          <View
            style={[
              styles.exportBox,
              { backgroundColor: theme.bg, borderColor: theme.border },
            ]}>
            <Text style={[styles.mono, { color: theme.text }]} selectable>
              {exportedPreview.slice(0, 1400)}
              {exportedPreview.length > 1400 ? '\n... (truncated preview)' : ''}
            </Text>
          </View>
        ) : null}
      </Card>

      <Card>
        <Text style={[styles.heading, { color: theme.text }]}>
          Verified RAG Knowledge & Data Sources
        </Text>
        {sourcesInfo ? (
          <View style={{ gap: 6 }}>
            <Text style={[styles.meta, { color: theme.textMuted }]}>
              Verified passages active: {sourcesInfo.verifiedCount} • Unverified placeholders excluded:{' '}
              {sourcesInfo.excludedPlaceholderCount}
            </Text>
            {sourcesInfo.sources.map((s) => (
              <Pressable
                key={s.id}
                onPress={() => void Linking.openURL(s.url)}
                style={styles.linkBtn}
                accessibilityRole="link">
                <Text style={[styles.linkText, { color: theme.info }]}>
                  {s.sourceName} — {s.title} ↗
                </Text>
                <Text style={[styles.meta, { color: theme.textMuted }]}>
                  Retrieved {s.retrievalDate}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <Text style={[styles.meta, { color: theme.textMuted }]}>
            Core citations: FoodSafety.gov Cold Storage Charts, USDA FSIS Food Product Dating / Leftovers / Freezing, U.S. EPA WARM & Reducing Wasted Food at Home, WRAP, Poore & Nemecek (2018), BLS/USDA ERS.
          </Text>
        )}
      </Card>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 17, fontWeight: '800' },
  highlight: { fontSize: 18, fontWeight: '800' },
  body: { fontSize: 14, lineHeight: 20 },
  meta: { fontSize: 12, lineHeight: 17 },
  label: { fontSize: 14, fontWeight: '700' },
  urlRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: {
    flex: 1,
    minHeight: MIN_TOUCH_TARGET,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  weightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  weightLabel: { flex: 1, fontSize: 13, fontWeight: '600' },
  weightControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  smallStep: { width: 44, paddingHorizontal: 0 },
  weightVal: { minWidth: 44, textAlign: 'center', fontWeight: '800', fontSize: 14 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipText: { fontSize: 13, fontWeight: '700' },
  btnGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  exportBox: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    maxHeight: 220,
  },
  mono: { fontFamily: FONT_MONO, fontSize: 11 },
  linkBtn: { minHeight: MIN_TOUCH_TARGET, justifyContent: 'center', paddingVertical: 4 },
  linkText: { fontSize: 13, fontWeight: '700', textDecorationLine: 'underline' },
});
