import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { format, parse } from 'date-fns';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type TimeFieldProps = {
  label?: string;
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  allowClear?: boolean;
};

export function TimeField({
  label,
  value,
  onChange,
  placeholder = 'Pick a time',
  allowClear,
}: TimeFieldProps) {
  const theme = useTheme();
  const [showPicker, setShowPicker] = useState(false);

  const selected = value ? parse(value, 'HH:mm', new Date()) : null;

  const handleChange = (event: DateTimePickerEvent, date?: Date) => {
    setShowPicker(false);
    if (event.type === 'set' && date) {
      onChange(format(date, 'HH:mm'));
    }
  };

  return (
    <View style={styles.field}>
      {label ? (
        <ThemedText type="small" themeColor="textSecondary">
          {label}
        </ThemedText>
      ) : null}
      <Pressable
        onPress={() => setShowPicker(true)}
        style={({ pressed }) => [
          styles.row,
          { backgroundColor: theme.backgroundSelected, opacity: pressed ? 0.7 : 1 },
        ]}>
        <Ionicons name="time-outline" size={18} color={theme.textSecondary} />
        <ThemedText type="small" style={{ color: selected ? theme.text : theme.textSecondary }}>
          {selected ? format(selected, 'h:mm a') : placeholder}
        </ThemedText>
        {allowClear && selected ? (
          <Pressable
            onPress={() => onChange(null)}
            hitSlop={8}
            style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1 }]}>
            <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
          </Pressable>
        ) : null}
      </Pressable>

      {showPicker ? (
        <DateTimePicker
          value={selected ?? new Date()}
          mode="time"
          is24Hour
          display="default"
          onChange={handleChange}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
});
