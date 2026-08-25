import { SymbolView } from 'expo-symbols';
import { Tabs } from 'expo-router';
import { Text } from 'react-native';

import { tokens } from '@/design-system/tokens';

type TabIconName = Parameters<typeof SymbolView>[0]['name'];

// Four destinations, per the information architecture in docs/17 and docs/03.
// Coordination conversations live inside Activity; there is no chat destination.
const tabIconByRoute: Record<string, TabIconName> = {
  index: 'house.fill',
  broadcast: 'plus.circle.fill',
  activity: 'bell',
  you: 'person.crop.circle',
};

const fallbackByRoute: Record<string, string> = {
  index: 'FY',
  broadcast: '+',
  activity: 'A',
  you: 'Y',
};

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: tokens.semantic.color.actionPrimary,
        tabBarInactiveTintColor: tokens.semantic.color.textMuted,
        tabBarLabelStyle: { fontFamily: 'Manrope_600SemiBold', fontSize: 11 },
        tabBarStyle: {
          backgroundColor: tokens.semantic.color.backgroundSurface,
          borderTopColor: tokens.semantic.color.borderDefault,
        },
        tabBarIcon: ({ color, size }) => (
          <SymbolView
            fallback={
              <Text style={{ color, fontFamily: 'Manrope_700Bold', fontSize: 12 }}>
                {fallbackByRoute[route.name]}
              </Text>
            }
            name={tabIconByRoute[route.name]}
            size={size}
            tintColor={color}
          />
        ),
      })}>
      <Tabs.Screen name="index" options={{ title: 'For You' }} />
      <Tabs.Screen name="broadcast" options={{ title: 'Broadcast' }} />
      <Tabs.Screen name="activity" options={{ title: 'Activity' }} />
      <Tabs.Screen name="you" options={{ title: 'You' }} />
    </Tabs>
  );
}
