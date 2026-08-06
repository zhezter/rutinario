import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { DailyPlan, DailyPlanItem } from '@/domain/dashboard/types';
import type { TimeBlock } from '@/domain/scheduling/anchors';
import { useTheme } from '@/hooks/use-theme';

const NODE_COLUMN = 44;
const LINE_LEFT = NODE_COLUMN / 2 - 1;
const CIRCLE_SIZE = 28;
const SEGMENT_HEIGHT = Spacing.two * 2;

type DailyTimelineProps = {
  plan: DailyPlan;
  block: TimeBlock;
  onToggle: (item: DailyPlanItem) => void;
};

export function DailyTimeline({ plan, block, onToggle }: DailyTimelineProps) {
  const items = plan.items.filter((item) => item.timeBlock === block);

  return (
    <View>
      {items.map((item, index) => (
        <TimelineRow
          key={item.actionId}
          item={item}
          onToggle={onToggle}
          first={index === 0}
        />
      ))}
    </View>
  );
}

function TimelineRow({
  item,
  onToggle,
  first,
}: {
  item: DailyPlanItem;
  onToggle: (item: DailyPlanItem) => void;
  first: boolean;
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
        {!first && (
          <View
            style={[
              styles.segment,
              { backgroundColor: completed ? theme.success : theme.backgroundSelected },
            ]}
          />
        )}
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
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: Spacing.two,
  },
  nodeColumn: {
    width: NODE_COLUMN,
    alignItems: 'center',
    position: 'relative',
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
