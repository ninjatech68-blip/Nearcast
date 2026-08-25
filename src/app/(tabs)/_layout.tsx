import { SymbolView } from 'expo-symbols';
import { Tabs } from 'expo-router';
import { Text } from 'react-native';

import { tokens } from '@/design-system/tokens';

type TabIconName = Parameters<typeof SymbolView>[0]['name'];

const tabIconByRoute: Record<string, TabIconName> = {
  activity: 'bell',
  broadcast: 'plus.circle.fill',
  index: 'house.fill',
  messages: 'message',
  you: 'person.crop.circle',
};

const fallbackByRoute: Record<string, string> = {
  activity: 'A',
  broadcast: '+',
  index: 'FY',
  messages: 'M',
  you: 'Y',
};

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: tokens.color.light.action.primary,
        tabBarInactiveTintColor: tokens.color.light.text.secondary,
        tabBarLabelStyle: { fontFamily: 'Manrope_600SemiBold', fontSize: 11 },
        tabBarStyle: {
          backgroundColor: tokens.color.light.background.surface,
          borderTopColor: tokens.color.light.border.subtle,
        },
        tabBarIcon: ({ color, size }) => (
          <SymbolView
            fallback={<Text style={{ color, fontFamily: 'Manrope_700Bold', fontSize: 12 }}>{fallbackByRoute[route.name]}</Text>}
            name={tabIconByRoute[route.name]}
            size={size}
            tintColor={color}
          />
        ),
      })}>
      <Tabs.Screen name="index" options={{ title: 'For You' }} />
      <Tabs.Screen name="activity" options={{ title: 'Activity' }} />
      <Tabs.Screen name="broadcast" options={{ title: 'Broadcast' }} />
      <Tabs.Screen name="messages" options={{ title: 'Messages' }} />
      <Tabs.Screen name="you" options={{ title: 'You' }} />
    </Tabs>
  );
}
