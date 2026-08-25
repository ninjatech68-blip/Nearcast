import { SymbolView } from 'expo-symbols';
import { Tabs } from 'expo-router';
import { Text } from 'react-native';

import { useColors } from '@/design-system/appearance';

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
  const color = useColors();

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: color.action.primary,
        tabBarInactiveTintColor: color.text.secondary,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarStyle: {
          backgroundColor: color.background.surface,
          borderTopColor: color.border.subtle,
        },
        tabBarIcon: ({ color, size }) => (
          <SymbolView
            fallback={<Text style={{ color, fontSize: 12, fontWeight: '700' }}>{fallbackByRoute[route.name]}</Text>}
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
