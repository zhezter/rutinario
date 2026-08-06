import Ionicons from '@expo/vector-icons/Ionicons';
import { format, parse } from 'date-fns';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { GhostButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import {
  buildCompletionsExport,
  shareExport,
  toCsv,
  toJson,
} from '@/domain/data/export';
import { importCompletionsJson } from '@/domain/data/import';
import {
  getCloseReminder,
  getRemindersEnabled,
  listReminderTargets,
  requestReminderPermission,
  setCloseReminder,
  setRemindersEnabled,
  syncReminders,
  type ReminderTarget,
} from '@/domain/notifications/reminders';
import { useLiveTables } from '@/hooks/useLiveTables';
import { useTheme } from '@/hooks/use-theme';
import { dateKey } from '@/lib/dates';
import { hapticSuccess } from '@/lib/haptics';

const CLOSE_TIME_OPTIONS = ['20:00', '21:00', '22:00', '23:00'];

type CloseReminderState = { enabled: boolean; time: string };

export default function SettingsScreen() {
  const theme = useTheme();
  const [enabled, setEnabled] = useState(false);
  const [targets, setTargets] = useState<ReminderTarget[]>([]);
  const [closeReminder, setCloseReminderState] = useState<CloseReminderState>({
    enabled: false,
    time: '21:00',
  });

  useLiveTables(
    ['app_settings', 'actions', 'procedures', 'routines'],
    () => {
      void getRemindersEnabled().then(setEnabled);
      void listReminderTargets().then(setTargets);
      void getCloseReminder().then(setCloseReminderState);
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

  const handleCloseReminderToggle = async (value: boolean) => {
    if (value) {
      const granted = await requestReminderPermission();
      if (!granted) {
        Alert.alert(
          'Permission needed',
          'Enable notifications in your system settings to get the evening reminder.',
        );
        return;
      }
    }
    await setCloseReminder(value, closeReminder.time);
    await syncReminders();
  };

  const handleCloseReminderTime = async (time: string) => {
    if (time === closeReminder.time) return;
    setCloseReminderState((prev) => ({ ...prev, time }));
    await setCloseReminder(closeReminder.enabled, time);
    if (closeReminder.enabled) await syncReminders();
  };

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const rows = await buildCompletionsExport();
      const stamp = dateKey(new Date());
      if (format === 'csv') {
        await shareExport(`completions-${stamp}.csv`, toCsv(rows), 'text/csv');
      } else {
        await shareExport(`completions-${stamp}.json`, toJson(rows), 'application/json');
      }
    } catch (err) {
      Alert.alert('Export failed', err instanceof Error ? err.message : 'Something went wrong.');
    }
  };

  const handleImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });
      if (result.canceled || result.assets.length === 0) return;
      const file = new File(result.assets[0].uri);
      const content = await file.text();
      Alert.alert(
        'Import completions?',
        'This merges completion entries into your history. Existing entries are kept.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Import',
            onPress: () => {
              void runImport(content);
            },
          },
        ],
      );
    } catch (err) {
      Alert.alert(
        'Import failed',
        err instanceof Error ? err.message : 'The file could not be read.',
      );
    }
  };

  const runImport = async (content: string) => {
    try {
      const result = await importCompletionsJson(content);
      hapticSuccess();
      const extra =
        result.unknown > 0
          ? `\n${result.unknown} entries were skipped because their action doesn't exist here.`
          : '';
      Alert.alert(
        'Import complete',
        `Imported ${result.imported} completions.${extra}`,
      );
    } catch (err) {
      Alert.alert(
        'Import failed',
        err instanceof Error ? err.message : 'Something went wrong.',
      );
    }
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

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="moon-outline" size={16} color={theme.accent} />
              <ThemedText type="smallBold">Evening close reminder</ThemedText>
            </View>

            <Card>
              <View style={styles.row}>
                <View style={styles.rowText}>
                  <ThemedText type="smallBold">Close your day</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    A nightly nudge to wrap up the day in Rutinario.
                  </ThemedText>
                </View>
                <Switch
                  value={closeReminder.enabled}
                  onValueChange={(value) => void handleCloseReminderToggle(value)}
                  trackColor={{ true: theme.accent, false: theme.backgroundSelected }}
                  thumbColor={theme.background}
                />
              </View>

              {closeReminder.enabled && (
                <View style={styles.timeRow}>
                  {CLOSE_TIME_OPTIONS.map((time) => {
                    const selected = time === closeReminder.time;
                    return (
                      <Pressable
                        key={time}
                        onPress={() => void handleCloseReminderTime(time)}
                        style={[
                          styles.timePill,
                          {
                            backgroundColor: selected
                              ? theme.accent
                              : theme.backgroundSelected,
                          },
                        ]}>
                        <ThemedText
                          type="smallBold"
                          style={{ color: selected ? theme.background : theme.text }}>
                          {format(parse(time, 'HH:mm', new Date()), 'h:mm a')}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </Card>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="download-outline" size={16} color={theme.accent} />
              <ThemedText type="smallBold">Export data</ThemedText>
            </View>
            <Card style={styles.exportCard}>
              <ThemedText type="small" themeColor="textSecondary">
                Download your completion history as a file you can keep or import elsewhere.
              </ThemedText>
              <View style={styles.exportRow}>
                <View style={styles.exportButton}>
                  <GhostButton label="Export CSV" onPress={() => void handleExport('csv')} />
                </View>
                <View style={styles.exportButton}>
                  <GhostButton label="Export JSON" onPress={() => void handleExport('json')} />
                </View>
              </View>
            </Card>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="cloud-upload-outline" size={16} color={theme.accent} />
              <ThemedText type="smallBold">Import data</ThemedText>
            </View>
            <Card style={styles.exportCard}>
              <ThemedText type="small" themeColor="textSecondary">
                Restore a JSON backup exported from Rutinario. Only entries whose actions already
                exist here are imported.
              </ThemedText>
              <GhostButton label="Import JSON" onPress={() => void handleImport()} />
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
  timeRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingTop: Spacing.two,
  },
  timePill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
  },
  exportCard: {
    gap: Spacing.two,
  },
  exportRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  exportButton: {
    flex: 1,
  },
});
