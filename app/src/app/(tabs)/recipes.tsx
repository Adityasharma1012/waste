import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { KnowledgeCitation, RecommendationBundle } from '@wasteless/core';
import { ActionButton } from '@/components/ActionButton';
import { Card } from '@/components/Card';
import { ScreenShell } from '@/components/ScreenShell';
import { useApp } from '@/state/AppContext';
import { MIN_TOUCH_TARGET } from '@/theme/tokens';
import type { AdviceResponse } from '@/api/client';

const SAMPLE_QUESTIONS = [
  'How long are cooked leftovers safe in the fridge?',
  'What is the difference between Use-By and Best-Before dates?',
  'Can I freeze chicken breast before its Use-By date?',
  'What is the safe fridge temperature?',
];

export default function RecipesScreen() {
  const {
    items,
    profile,
    settings,
    recommendations,
    apiClient,
    refreshBackend,
    theme,
  } = useApp();

  const [bundle, setBundle] = useState<RecommendationBundle>(recommendations);
  const [sourceTag, setSourceTag] = useState<string>('Offline RecipePlanner Agent');
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [advice, setAdvice] = useState<AdviceResponse | null>(null);
  const [expandedRecipeId, setExpandedRecipeId] = useState<string | null>(null);

  useEffect(() => {
    setBundle(recommendations);
    let mounted = true;
    (async () => {
      const res = await apiClient.getRecommendations(items, profile, settings.utilityWeights);
      if (!mounted) return;
      setBundle(res.bundle);
      setSourceTag(
        res.fromOfflineFallback
          ? 'Offline RecipePlanner Agent (Backend Unreachable)'
          : `Backend [${res.resolutionTier.toUpperCase()}] (${res.responseTimeMs} ms)`
      );
    })();
    return () => {
      mounted = false;
    };
  }, [items, profile, settings.utilityWeights, settings.apiUrl, recommendations, apiClient]);

  const askGuide = async (overrideQ?: string) => {
    const q = (overrideQ ?? question).trim();
    if (!q) return;
    if (overrideQ) setQuestion(overrideQ);
    setAsking(true);
    try {
      const res = await apiClient.askAdvice(q, items, profile);
      setAdvice(res);
      void refreshBackend();
    } finally {
      setAsking(false);
    }
  };

  return (
    <ScreenShell
      title="Recipes, Storage & RAG Guide"
      subtitle={`Ranked by RecipePlanner (${sourceTag})`}>
      <Card>
        <Text style={[styles.heading, { color: theme.text }]}>
          Ask WasteLess Food Safety & Storage Guide (RAG)
        </Text>
        <Text style={[styles.meta, { color: theme.textMuted }]}>
          Order of preference: Rules → Cache → RAG-grounded LLM. Unmatched queries refuse to guess.
        </Text>
        <View style={styles.askRow}>
          <TextInput
            value={question}
            onChangeText={setQuestion}
            placeholder="Ask about storage, freezing, leftovers, or date labels..."
            placeholderTextColor={theme.textMuted}
            accessibilityLabel="Ask food safety or waste reduction question"
            style={[
              styles.input,
              { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg },
            ]}
          />
          <ActionButton
            label={asking ? '...' : 'Ask'}
            disabled={asking || !question.trim()}
            onPress={() => void askGuide()}
          />
        </View>

        <View style={styles.chipRow}>
          {SAMPLE_QUESTIONS.map((sq) => (
            <Pressable
              key={sq}
              onPress={() => void askGuide(sq)}
              style={[
                styles.sampleChip,
                { backgroundColor: theme.surfaceElevated, borderColor: theme.border },
              ]}
              accessibilityRole="button">
              <Text style={[styles.sampleText, { color: theme.text }]}>{sq}</Text>
            </Pressable>
          ))}
        </View>

        {asking ? <ActivityIndicator color={theme.primary} /> : null}

        {advice ? (
          <View
            style={[
              styles.adviceBox,
              { backgroundColor: theme.surfaceElevated, borderColor: theme.border },
            ]}>
            <View style={styles.badgeRow}>
              <View
                style={[
                  styles.tierBadge,
                  { backgroundColor: theme.infoSoft, borderColor: theme.info },
                ]}>
                <Text style={[styles.tierText, { color: theme.infoText }]}>
                  Tier: {advice.resolutionTier.toUpperCase()} • Provider: {advice.provider}
                  {advice.cacheHit ? ' • CACHE HIT' : ''}
                </Text>
              </View>
              <Text style={[styles.meta, { color: theme.textMuted }]}>
                {advice.responseTimeMs} ms • Est. cost ${advice.estimatedCostUsd.toFixed(5)}
              </Text>
            </View>

            <Text style={[styles.body, { color: theme.text }]}>{advice.answer}</Text>

            {advice.noMatchFound ? (
              <Text style={[styles.noMatch, { color: theme.warning }]}>
                Honesty Check: No verified passage in the local knowledge base reached the relevance threshold for this query.
              </Text>
            ) : null}

            {advice.citations.length > 0 ? (
              <View style={{ gap: 6, marginTop: 4 }}>
                <Text style={[styles.subHeading, { color: theme.text }]}>
                  Grounded Sources ({advice.citations.length}):
                </Text>
                {advice.citations.map((cit: KnowledgeCitation) => (
                  <Pressable
                    key={cit.id}
                    onPress={() => void Linking.openURL(cit.url)}
                    style={[styles.citationBtn, { borderColor: theme.border }]}
                    accessibilityRole="link">
                    <Text style={[styles.linkText, { color: theme.info }]}>
                      {cit.sourceName} — {cit.title} ↗
                    </Text>
                    <Text style={[styles.meta, { color: theme.textMuted }]}>
                      Retrieved: {cit.retrievalDate}
                      {cit.score !== undefined ? ` • BM25 score ${cit.score.toFixed(2)}` : ''}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}
      </Card>

      <Text style={[styles.heading, { color: theme.text }]}>
        Top Recipe Matches ({bundle.recipes.length})
      </Text>
      {bundle.recipes.length === 0 ? (
        <Card>
          <Text style={{ color: theme.textMuted }}>
            No recipes matched your current safe inventory and dietary filters. Try adding pantry staples or adjusting dietary tags.
          </Text>
        </Card>
      ) : (
        bundle.recipes.map((sr) => {
          const isExpanded = expandedRecipeId === sr.recipe.id;
          return (
            <Card key={sr.recipe.id}>
              <View style={styles.recipeHeader}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[styles.recipeTitle, { color: theme.text }]}>
                    {sr.recipe.title}
                  </Text>
                  <Text style={[styles.meta, { color: theme.textMuted }]}>
                    {sr.recipe.prepAndCookMinutes} min • Serves {sr.recipe.servings} • Utility Score{' '}
                    {sr.utilityScore}
                  </Text>
                </View>
                <View
                  style={[
                    styles.scorePill,
                    { backgroundColor: theme.primarySoft, borderColor: theme.primary },
                  ]}>
                  <Text style={[styles.scorePillText, { color: theme.successText }]}>
                    {sr.urgentMatchCount} urgent
                  </Text>
                </View>
              </View>

              <Text style={[styles.body, { color: theme.text }]}>{sr.recipe.description}</Text>
              <Text style={[styles.matchLine, { color: theme.primary }]}>
                Uses your: {sr.matchedItemNames.join(', ')} (Est. ~{sr.estimatedKgSaved} kg / ~$
                {sr.estimatedMoneySavedUsd.toFixed(2)} / ~{sr.estimatedCo2eSavedKg} kg CO2e saved)
              </Text>

              <ActionButton
                label={isExpanded ? 'Hide Steps & Storage Tip' : 'View Steps & Storage Tip'}
                variant="secondary"
                onPress={() => setExpandedRecipeId(isExpanded ? null : sr.recipe.id)}
              />

              {isExpanded ? (
                <View style={{ gap: 6, marginTop: 4 }}>
                  <Text style={[styles.subHeading, { color: theme.text }]}>Instructions:</Text>
                  {sr.recipe.instructions.map((step, i) => (
                    <Text key={i} style={[styles.body, { color: theme.text }]}>
                      {i + 1}. {step}
                    </Text>
                  ))}
                  <Text style={[styles.meta, { color: theme.textMuted }]}>
                    Leftover & Storage Tip: {sr.recipe.storageTip}
                  </Text>
                </View>
              ) : null}
            </Card>
          );
        })
      )}

      <Card>
        <Text style={[styles.heading, { color: theme.text }]}>3-Slot Zero-Waste Meal Plan</Text>
        {bundle.mealPlan.length === 0 ? (
          <Text style={{ color: theme.textMuted }}>Add items to generate a meal plan.</Text>
        ) : (
          bundle.mealPlan.map((slot, idx) => (
            <View key={idx} style={[styles.slotRow, { borderTopColor: theme.border }]}>
              <Text style={[styles.subHeading, { color: theme.primary }]}>
                {slot.dayLabel} ({slot.mealType}) • {slot.minutes} min
              </Text>
              <Text style={[styles.body, { color: theme.text }]}>{slot.title}</Text>
              <Text style={[styles.meta, { color: theme.textMuted }]}>
                Uses: {slot.usesItemNames.join(', ')}
              </Text>
            </View>
          ))
        )}
      </Card>

      <Card>
        <Text style={[styles.heading, { color: theme.text }]}>Freezing & Storage Tips</Text>
        {bundle.freezingTips.map((tip) => (
          <View key={tip.id} style={[styles.slotRow, { borderTopColor: theme.border }]}>
            <Text style={[styles.subHeading, { color: theme.info }]}>
              Freeze Option: {tip.itemName}
            </Text>
            <Text style={[styles.body, { color: theme.text }]}>{tip.tip}</Text>
            <Pressable
              onPress={() => void Linking.openURL(tip.sourceRef.url)}
              style={styles.linkBtn}
              accessibilityRole="link">
              <Text style={[styles.linkText, { color: theme.info }]}>
                Source: {tip.sourceRef.sourceName} ↗
              </Text>
            </Pressable>
          </View>
        ))}
        {bundle.storageTips.map((tip) => (
          <View key={tip.id} style={[styles.slotRow, { borderTopColor: theme.border }]}>
            <Text style={[styles.subHeading, { color: theme.text }]}>
              Storage Tip ({tip.itemName})
            </Text>
            <Text style={[styles.body, { color: theme.text }]}>{tip.tip}</Text>
          </View>
        ))}
      </Card>

      <Card>
        <Text style={[styles.heading, { color: theme.text }]}>Leftover Ideas</Text>
        {bundle.leftoverIdeas.map((idea) => (
          <View key={idea.id} style={[styles.slotRow, { borderTopColor: theme.border }]}>
            <Text style={[styles.subHeading, { color: theme.text }]}>{idea.title}</Text>
            <Text style={[styles.body, { color: theme.text }]}>{idea.idea}</Text>
            <Text style={[styles.meta, { color: theme.amberText }]}>{idea.safetyNote}</Text>
          </View>
        ))}
      </Card>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 17, fontWeight: '800' },
  subHeading: { fontSize: 14, fontWeight: '700' },
  body: { fontSize: 14, lineHeight: 20 },
  meta: { fontSize: 12, lineHeight: 17 },
  askRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: {
    flex: 1,
    minHeight: MIN_TOUCH_TARGET,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sampleChip: {
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
  },
  sampleText: { fontSize: 12, fontWeight: '600' },
  adviceBox: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 },
  tierBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  tierText: { fontSize: 11, fontWeight: '800' },
  noMatch: { fontSize: 12, fontWeight: '700' },
  citationBtn: {
    minHeight: MIN_TOUCH_TARGET,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 2,
  },
  linkBtn: { minHeight: MIN_TOUCH_TARGET, justifyContent: 'center' },
  linkText: { fontSize: 12, fontWeight: '700', textDecorationLine: 'underline' },
  recipeHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  recipeTitle: { fontSize: 16, fontWeight: '800' },
  scorePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  scorePillText: { fontSize: 11, fontWeight: '800' },
  matchLine: { fontSize: 13, fontWeight: '700' },
  slotRow: { paddingTop: 10, borderTopWidth: 1, gap: 4 },
});
