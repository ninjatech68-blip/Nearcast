import { SymbolView } from 'expo-symbols';
import { Tabs } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

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
          borderTopColor: tokens.semantic.color.borderSubtle,
        },
        tabBarIcon: ({ color, size }) => {
          const icon = (
            <SymbolView
              fallback={
                <Text
                  style={{
                    color: route.name === 'broadcast' ? tokens.semantic.color.onPrimary : color,
                    fontFamily: 'Manrope_700Bold',
                    fontSize: 11,
                  }}>
                  {fallbackByRoute[route.name]}
                </Text>
              }
              name={tabIconByRoute[route.name]}
              size={size}
              tintColor={route.name === 'broadcast' ? tokens.semantic.color.onPrimary : color}
            />
          );
          // Broadcast is the raised primary action of the tab bar (DESIGN.md
          // navigation rules); the only elevated element in the app.
          if (route.name === 'broadcast') {
            return <View style={styles.broadcastAction}>{icon}</View>;
          }
          return icon;
        },
      })}>
      <Tabs.Screen name="index" options={{ title: 'For You' }} />
      <Tabs.Screen name="broadcast" options={{ title: 'Broadcast' }} />
      <Tabs.Screen name="activity" options={{ title: 'Activity' }} />
      <Tabs.Screen name="you" options={{ title: 'You' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  broadcastAction: {
    marginTop: -14,
    width: 48,
    height: 48,
    borderRadius: tokens.primitive.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.semantic.color.actionPrimary,
    shadowColor: tokens.semantic.color.actionPrimaryPressed,
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
});
