import Ionicons from '@expo/vector-icons/Ionicons';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, useColorScheme, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { db } from '@/db/client';
import migrations from '@/db/migrations/migrations';
import { seedExerciseCatalog } from '@/domain/workouts/catalog-seed';
import { seedDatabase } from '@/db/seed';
import { Spacing } from '@/constants/theme';
import { useReminderSync } from '@/hooks/useReminderSync';

function DatabaseGate({ children, fontsReady }: { children: ReactNode; fontsReady: boolean }) {
  const { success, error } = useMigrations(db, migrations);
  const [seeded, setSeeded] = useState(false);
  const ready = success && seeded && fontsReady;

  useReminderSync(ready);

  useEffect(() => {
    if (!success || seeded) return;
    let cancelled = false;
    seedDatabase()
      .then(() => seedExerciseCatalog())
      .then(() => {
        if (!cancelled) setSeeded(true);
      })
      .catch((err) => {
        if (!cancelled) console.error('Seed failed', err);
      });
    return () => {
      cancelled = true;
    };
  }, [success, seeded]);

  if (error) {
    return (
      <View style={styles.center}>
        <ThemedText>Migration error: {error.message}</ThemedText>
      </View>
    );
  }

  if (!success || !seeded) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <ThemedText type="small">Getting things ready…</ThemedText>
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded, fontsError] = useFonts(Ionicons.font);

  useEffect(() => {
    if (fontsError) console.error('Icon font failed to load', fontsError);
  }, [fontsError]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <DatabaseGate fontsReady={fontsLoaded || !!fontsError}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="routine/[id]" options={{ headerShown: true, title: '' }} />
        </Stack>
      </DatabaseGate>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    backgroundColor: '#000',
  },
});
