import { Stack } from 'expo-router';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '@/src/constants/theme';
import { AuthProvider, useAuth } from '@/src/hooks/useAuth';
import { isSupabaseConfigured } from '@/src/services/supabase';

export default function RootLayout() {
  if (!isSupabaseConfigured) return <MissingConfig />;

  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}

function RootNavigator() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.orange} size="large" />
      </View>
    );
  }

  const loggedIn = !!session;

  // Rotas protegidas: sem login só a tela de login existe; com login, só o app.
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
      <Stack.Protected guard={loggedIn}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="budget/[id]" options={{ title: 'Orçamento' }} />
      </Stack.Protected>
      <Stack.Protected guard={!loggedIn}>
        <Stack.Screen name="login" options={{ headerShown: false, title: 'Entrar' }} />
      </Stack.Protected>
    </Stack>
  );
}

/** Aparece se o site foi publicado sem as variáveis do Supabase (EXPO_PUBLIC_SUPABASE_URL / _KEY). */
function MissingConfig() {
  return (
    <View style={styles.center}>
      <Text style={styles.title}>Configuração incompleta</Text>
      <Text style={styles.text}>
        Faltam as variáveis EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_KEY. Veja docs/supabase.md.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8, backgroundColor: COLORS.ink },
  title: { color: COLORS.white, fontSize: 20, fontWeight: '800' },
  text: { color: '#BDBDBD', fontSize: 15, textAlign: 'center', maxWidth: 420 },
});
