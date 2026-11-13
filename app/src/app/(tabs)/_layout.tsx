import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/state/AppContext';

export default function TabsLayout() {
  const { theme, inventoryAnalysis } = useApp();
  const urgentBadge =
    inventoryAnalysis.result.bucketCounts.expired +
    inventoryAnalysis.result.bucketCounts.use_today;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
          minHeight: 62,
          paddingBottom: 6,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarAccessibilityLabel: 'Dashboard tab',
          tabBarBadge: urgentBadge > 0 ? urgentBadge : undefined,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={String(color)} />
          ),
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: 'Inventory',
          tabBarAccessibilityLabel: 'Inventory tab',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="basket-outline" size={size} color={String(color)} />
          ),
        }}
      />
      <Tabs.Screen
        name="plan"
        options={{
          title: 'Action Plan',
          tabBarAccessibilityLabel: 'Use soon action plan tab',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="flash-outline" size={size} color={String(color)} />
          ),
        }}
      />
      <Tabs.Screen
        name="recipes"
        options={{
          title: 'Recipes',
          tabBarAccessibilityLabel: 'Recipes and advice tab',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="restaurant-outline" size={size} color={String(color)} />
          ),
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: 'Insights',
          tabBarAccessibilityLabel: 'Waste and savings insights tab',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="leaf-outline" size={size} color={String(color)} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarAccessibilityLabel: 'Settings tab',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={String(color)} />
          ),
        }}
      />
    </Tabs>
  );
}
