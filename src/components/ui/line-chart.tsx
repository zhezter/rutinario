import { useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type LineChartPoint = {
  label: string;
  value: number;
};

type LineChartProps = {
  data: LineChartPoint[];
  height?: number;
  color: string;
  formatValue?: (value: number) => string;
  emptyText?: string;
};

const PAD_TOP = 14;
const PAD_BOTTOM = 26;
const PAD_LEFT = 40;
const PAD_RIGHT = 10;
const STROKE = 2;
const DOT_RADIUS = 3.5;

export function LineChart({
  data,
  height = 160,
  color,
  formatValue = (value) => String(value),
  emptyText = 'No data yet',
}: LineChartProps) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);

  const handleLayout = (event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width);
  };

  const plot = useMemo(() => {
    if (width <= 0 || data.length === 0) return null;
    const plotW = Math.max(1, width - PAD_LEFT - PAD_RIGHT);
    const plotH = Math.max(1, height - PAD_TOP - PAD_BOTTOM);
    const values = data.map((point) => point.value);
    let min = Math.min(...values);
    let max = Math.max(...values);
    const range = max - min;
    if (range === 0) {
      const pad = Math.abs(max * 0.1) || 1;
      min = max - pad;
      max = max + pad;
    } else {
      const pad = range * 0.08;
      min -= pad;
      max += pad;
    }
    const total = max - min;
    const xAt = (index: number) =>
      data.length === 1 ? PAD_LEFT + plotW / 2 : PAD_LEFT + (index / (data.length - 1)) * plotW;
    const yAt = (value: number) => PAD_TOP + (1 - (value - min) / total) * plotH;
    return { plotW, plotH, min, max, xAt, yAt };
  }, [width, data, height]);

  if (width <= 0) {
    return (
      <View style={{ height }} onLayout={handleLayout}>
        <View />
      </View>
    );
  }

  if (data.length === 0 || !plot) {
    return (
      <View style={{ height }} onLayout={handleLayout}>
        <View style={styles.empty}>
          <ThemedText type="small" themeColor="textSecondary">
            {emptyText}
          </ThemedText>
        </View>
      </View>
    );
  }

  const { plotW, plotH, min, max, xAt, yAt } = plot;

  const segments = [];
  for (let i = 0; i < data.length - 1; i++) {
    const x0 = xAt(i);
    const y0 = yAt(data[i].value);
    const x1 = xAt(i + 1);
    const y1 = yAt(data[i + 1].value);
    const dx = x1 - x0;
    const dy = y1 - y0;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    segments.push(
      <View
        key={`seg-${i}`}
        style={[
          styles.segment,
          {
            left: x0,
            top: y0,
            width: length,
            backgroundColor: color,
            transform: [{ rotate: `${angle}deg` }],
            transformOrigin: 'left center',
          },
        ]}
      />,
    );
  }

  const mid = (min + max) / 2;
  const gridLines = [max, mid, min];

  return (
    <View style={{ height }} onLayout={handleLayout}>
      <View style={styles.labels}>
        {gridLines.map((value) => (
          <ThemedText
            key={value}
            type="small"
            themeColor="textSecondary"
            style={[
              styles.yLabel,
              { top: yAt(value) - 9 },
            ]}>
            {formatValue(Math.round(value * 10) / 10)}
          </ThemedText>
        ))}
      </View>

      {gridLines.map((value) => (
        <View
          key={`grid-${value}`}
          style={[
            styles.gridLine,
            {
              left: PAD_LEFT,
              top: yAt(value),
              width: plotW,
              backgroundColor: theme.backgroundSelected,
            },
          ]}
        />
      ))}

      {segments}

      {data.map((point, index) => (
        <View
          key={`dot-${index}`}
          style={[
            styles.dot,
            {
              left: xAt(index) - DOT_RADIUS,
              top: yAt(point.value) - DOT_RADIUS,
              width: DOT_RADIUS * 2,
              height: DOT_RADIUS * 2,
              borderRadius: DOT_RADIUS,
              backgroundColor: color,
            },
          ]}
        />
      ))}

      <ThemedText
        type="small"
        themeColor="textSecondary"
        style={[styles.xLabel, { left: PAD_LEFT, top: PAD_TOP + plotH + Spacing.one }]}>
        {data[0].label}
      </ThemedText>
      <ThemedText
        type="small"
        themeColor="textSecondary"
        style={[styles.xLabel, styles.xLabelLast, { top: PAD_TOP + plotH + Spacing.one }]}>
        {data[data.length - 1].label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  segment: {
    position: 'absolute',
    height: STROKE,
    borderRadius: STROKE / 2,
  },
  dot: {
    position: 'absolute',
  },
  gridLine: {
    position: 'absolute',
    height: StyleSheet.hairlineWidth,
  },
  labels: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  yLabel: {
    position: 'absolute',
    left: 0,
    width: PAD_LEFT - Spacing.one,
    textAlign: 'right',
    fontSize: 11,
    lineHeight: 14,
    fontVariant: ['tabular-nums'],
  },
  xLabel: {
    position: 'absolute',
    fontSize: 11,
    lineHeight: 14,
  },
  xLabelLast: {
    right: PAD_RIGHT,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
