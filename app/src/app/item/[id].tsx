import React from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActionButton } from '@/components/ActionButton';
import { ItemFormScreen } from '@/components/ItemFormScreen';
import { ScreenShell } from '@/components/ScreenShell';
import { useApp } from '@/state/AppContext';

export default function EditItemRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { items, theme } = useApp();
  const router = useRouter();
  const existing = items.find((it) => it.id === id);

  if (!existing) {
    return (
      <ScreenShell title="Item Not Found">
        <View style={{ gap: 12 }}>
          <Text style={{ color: theme.text }}>
            This item may have been deleted or consumed.
          </Text>
          <ActionButton label="Go Back" onPress={() => router.back()} />
        </View>
      </ScreenShell>
    );
  }

  return <ItemFormScreen existingItem={existing} />;
}
