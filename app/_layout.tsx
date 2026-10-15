import { Stack } from 'expo-router';
import React from 'react';
import { COLORS } from '@/src/constants/theme';

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.ink },
        headerTintColor: COLORS.white,
        headerTitleStyle: { fontWeight: '800', fontSize: 20 },
        headerShadowVisible: false,
        headerBackTitle: 'Voltar',
        contentStyle: { backgroundColor: COLORS.light },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="budget/[id]" options={{ title: 'Orçamento' }} />
    </Stack>
  );
}
