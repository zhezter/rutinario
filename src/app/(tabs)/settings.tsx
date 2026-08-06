import Ionicons from '@expo/vector-icons/Ionicons';
import { format, parse } from 'date-fns';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/card';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import {
  getRemindersEnabled,
  listReminderTargets,
  requestReminderPermission,
  setRemindersEnabled,
  syncReminders,
  type ReminderTarget,
} from '@/domain/notifications/reminders';
import { useLiveTables } from '@/hooks/useLiveTables';
import { useTheme } from '@/hooks/use-theme';

export default function SettingsScreen() {
  const theme = useTheme();
  const [enabled, setEnabled] = useState(false);
  const [targets, setTargets] = useState<ReminderTarget[]>([]);

  useLiveTables(
    ['app_settings', 'actions', 'procedures', 'routines'],
    () => {
      void getRemindersEnabled().then(setEnabled);
      void listReminderTargets().then(setTargets);
    },
    [],
  );

  const handleToggle = async (value: boolean) => {
    if (value) {
      const granted = await requestReminderPermission();
      if (!granted) {
        Alert.alert(
          'Permission needed',
          'Enable notifications in your system settings to get daily reminders.',
        );
        return;
      }
    }
    await setRemindersEnabled(value);
    await syncReminders();
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}>
          <ThemedText type="title" style={styles.title}>
            Settings
          </ThemedText>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="notifications" size={16} color={theme.accent} />
              <ThemedText type="smallBold">Reminders</ThemedText>
            </View>

            <Card>
              <View style={styles.row}>
                <View style={styles.rowText}>
                  <ThemedText type="smallBold">Daily reminders</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Notify at the set time of fixed-time tasks with a daily frequency.
                  </ThemedText>
                </View>
                <Switch
                  value={enabled}
                  onValueChange={(value) => void handleToggle(value)}
                  trackColor={{ true: theme.accent, false: theme.backgroundSelected }}
                  thumbColor={theme.background}
                />
              </View>

              {enabled && (
                <View style={styles.targets}>
                  {targets.length === 0 ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      No fixed-time daily tasks yet. Add one in a routine to get reminders.
                    </ThemedText>
                  ) : (
                    targets.map((target) => (
                      <View key={target.actionId} style={styles.targetRow}>
                        <ThemedText type="small" style={styles.targetName}>
                          {target.name}
                        </ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          {format(parse(target.time, 'HH:mm', new Date()), 'h:mm a')}
                        </ThemedText>
                      </View>
                    ))
                  )}
                </View>
              )}
            </Card>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingBottom: BottomTabInset,
  },
  scroll: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.four,
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
  },
  section: {
    gap: Spacing.two,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  rowText: {
    flex: 1,
    gap: 1,
  },
  targets: {
    gap: Spacing.one,
    paddingTop: Spacing.two,
  },
  targetRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  targetName: {
    flex: 1,
  },
});
