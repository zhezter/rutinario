import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';

export const unstable_settings = {
  initialRouteName: 'today',
};

export default function TabsLayout() {
  const scheme = useColorScheme();
  const colors = Colors[scheme ?? 'light'];

  return (
    <NativeTabs
      backgroundColor={colors.background}
      tintColor={colors.accent}
      labelStyle={{ selected: { color: colors.accent } }}>
      <NativeTabs.Trigger name="today">
        <Label>Today</Label>
        <Icon src={require('@/assets/images/tabIcons/today.png')} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="routines">
        <Label>Routines</Label>
        <Icon src={require('@/assets/images/tabIcons/routines.png')} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="workout">
        <Label>Workout</Label>
        <Icon src={require('@/assets/images/tabIcons/workout.png')} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="stats">
        <Label>Stats</Label>
        <Icon src={require('@/assets/images/tabIcons/stats.png')} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="inventory">
        <Label>Inventory</Label>
        <Icon src={require('@/assets/images/tabIcons/inventory.png')} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="settings">
        <Label>Settings</Label>
        <Icon src={require('@/assets/images/tabIcons/settings.png')} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
