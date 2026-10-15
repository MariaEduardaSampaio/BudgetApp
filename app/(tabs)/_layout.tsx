import { Tabs } from 'expo-router';
import React from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import AccountButton from '@/src/components/AccountButton';
import { COLORS } from '@/src/constants/theme';

export default function TabLayout() {
  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: true,
          headerStyle: { backgroundColor: COLORS.ink },
          headerTintColor: COLORS.white,
          headerTitleStyle: { fontWeight: '800', fontSize: 20 },
          headerTitleAlign: 'left',
          headerShadowVisible: false,
          headerRight: () => <AccountButton />,
          tabBarActiveTintColor: COLORS.orange,
          tabBarInactiveTintColor: '#A3A3A3',
          tabBarStyle: { backgroundColor: COLORS.ink, borderTopWidth: 0 },
          tabBarLabelStyle: { fontWeight: '700' },
          sceneStyle: { backgroundColor: COLORS.light },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Novo orçamento',
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? 'document-text' : 'document-text-outline'} size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: 'Histórico',
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? 'time' : 'time-outline'} size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </>
  );
}
