import { SymbolView } from 'expo-symbols';
import { Tabs } from 'expo-router';
import { Text, View, StyleSheet } from 'react-native';

import { tokens } from '@/design-system/tokens';

type TabIconName = Parameters<typeof SymbolView>[0]['name'];

const tabIconByRoute: Record<string, TabIconName> = {
  activity: 'message',
  broadcast: 'plus',
  index: 'house.fill',
  'my-intents': 'square.stack',
  you: 'person.crop.circle',
};

const fallbackByRoute: Record<string, string> = {
  activity: 'A',
  broadcast: '+',
  index: 'F',
  'my-intents': 'M',
  you: 'Y',
};

function BroadcastIcon({ color }: { color: string }) {
  return (
    <View style={[styles.addButton, { backgroundColor: color }]}>
      <SymbolView
        fallback={<Text style={styles.addFallback}>+</Text>}
        name="plus"
        size={24}
        tintColor="#FFFFFF"
      />
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: tokens.semantic.color.tabActive,
        tabBarInactiveTintColor: tokens.semantic.color.tabInactive,
        tabBarLabelStyle: { fontFamily: 'Manrope_700Bold', fontSize: 9, marginTop: 3 },
        tabBarStyle: {
          height: tokens.component.tabBar.height,
          paddingTop: 8,
          paddingBottom: 22,
          backgroundColor: tokens.component.tabBar.background,
          borderTopColor: tokens.component.tabBar.borderColor,
        },
        tabBarIcon: ({ color, size }) => {
          if (route.name === 'broadcast') {
            return <BroadcastIcon color={tokens.semantic.color.actionPrimary} />;
          }
          return (
            <SymbolView
              fallback={<Text style={{ color, fontFamily: 'Manrope_700Bold', fontSize: 12 }}>{fallbackByRoute[route.name]}</Text>}
              name={tabIconByRoute[route.name]}
              size={size ?? 23}
              tintColor={color}
            />
          );
        },
      })}>
      <Tabs.Screen name="index" options={{ title: 'For you' }} />
      <Tabs.Screen name="my-intents" options={{ title: 'My intents' }} />
      <Tabs.Screen name="broadcast" options={{ title: 'Broadcast', tabBarLabel: 'Broadcast' }} />
      <Tabs.Screen name="activity" options={{ title: 'Activity' }} />
      <Tabs.Screen name="you" options={{ title: 'You' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 15,
    marginTop: -16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F5E46',
    shadowOffset: { width: 0, height: 9 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 6,
  },
  addFallback: { color: '#FFFFFF', fontFamily: 'Manrope_700Bold', fontSize: 22 },
});
