import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { DailyPlan, DailyPlanItem } from '@/domain/dashboard/types';
import { TIME_BLOCK_LABELS, TIME_BLOCK_ORDER } from '@/domain/scheduling/anchors';
import { useTheme } from '@/hooks/use-theme';

const NODE_COLUMN = 44;
const LINE_LEFT = NODE_COLUMN / 2 - 1;
const CIRCLE_SIZE = 28;
const SEGMENT_HEIGHT = Spacing.two * 2;

type DailyTimelineProps = {
  plan: DailyPlan;
  onToggle: (item: DailyPlanItem) => void;
};

export function DailyTimeline({ plan, onToggle }: DailyTimelineProps) {
  return (
    <View>
      {TIME_BLOCK_ORDER.map((block) => {
        const items = plan.items.filter((item) => item.timeBlock === block);
        if (items.length === 0) return null;
        return (
          <View key={block}>
            <TimelineHeader label={TIME_BLOCK_LABELS[block]} />
            {items.map((item) => (
              <TimelineRow key={item.actionId} item={item} onToggle={onToggle} />
            ))}
          </View>
        );
      })}
    </View>
  );
}

function TimelineHeader({ label }: { label: string }) {
  const theme = useTheme();
  return (
    <View style={styles.headerRow}>
      <View style={styles.nodeColumn}>
        <View style={[styles.headerDot, { backgroundColor: theme.accent }]} />
      </View>
      <ThemedText type="smallBold" style={styles.headerLabel}>
        {label}
      </ThemedText>
    </View>
  );
}

function TimelineRow({
  item,
  onToggle,
}: {
  item: DailyPlanItem;
  onToggle: (item: DailyPlanItem) => void;
}) {
  const theme = useTheme();
  const completed = item.completed;

  const timeLabel =
    item.fixedTime ?? item.anchor ?? (item.frequency !== 'Daily' ? item.frequency : null);
  const secondary = [item.frequency !== 'Daily' ? item.frequency : null, item.product]
    .filter(Boolean)
    .join(' · ');

  return (
    <Pressable
      onPress={() => onToggle(item)}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}>
      <View style={styles.nodeColumn}>
        <View
          style={[
            styles.segment,
            { backgroundColor: completed ? theme.success : theme.backgroundSelected },
          ]}
        />
        <View
          style={[
            styles.circle,
            {
              borderColor: completed ? theme.success : theme.textSecondary,
              backgroundColor: completed ? theme.success : 'transparent',
            },
          ]}>
          {completed && <Ionicons name="checkmark" size={16} color={theme.background} />}
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <ThemedText
            type="smallBold"
            style={[
              styles.name,
              completed && { textDecorationLine: 'line-through', color: theme.textSecondary },
            ]}>
            {item.name}
          </ThemedText>
          {timeLabel ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.timeLabel}>
              {timeLabel}
            </ThemedText>
          ) : null}
        </View>
        {secondary ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.secondary}>
            {secondary}
          </ThemedText>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  nodeColumn: {
    width: NODE_COLUMN,
    alignItems: 'center',
    position: 'relative',
  },
  headerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  headerLabel: {
    fontSize: 13,
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: Spacing.two,
  },
  segment: {
    position: 'absolute',
    top: -SEGMENT_HEIGHT,
    left: LINE_LEFT,
    width: 2,
    height: SEGMENT_HEIGHT,
  },
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 1,
    paddingRight: Spacing.two,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  name: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 12,
  },
  secondary: {
    fontSize: 12,
  },
});
