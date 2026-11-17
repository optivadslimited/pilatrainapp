import { Tabs } from 'expo-router/js-tabs';
import { StyleSheet } from 'react-native';

import { Icon, type IconName } from '@/components';
import { t } from '@/strings';
import { useTheme } from '@/theme';

const TABS: readonly { name: string; title: string; icon: IconName }[] = [
  { name: 'today', title: t.tabs.today, icon: 'today' },
  { name: 'plan', title: t.tabs.plan, icon: 'plan' },
  { name: 'progress', title: t.tabs.progress, icon: 'progress' },
  { name: 'you', title: t.tabs.you, icon: 'you' },
];

/** The four tabs: Today · Plan · Progress · You. The class library sits inside Plan. */
export default function TabsLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: styles.label,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.hairline,
          borderTopWidth: StyleSheet.hairlineWidth,
          elevation: 0,
        },
        sceneStyle: { backgroundColor: colors.background },
      }}>
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarButtonTestID: `tab-${tab.name}`,
            tabBarIcon: ({ color, size }) => (
              <Icon name={tab.icon} size={size} tintColor={String(color)} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  // Size is left to the tab bar, which sizes itself around its own default.
  label: { fontWeight: '500' },
});
