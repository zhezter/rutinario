import type { AnchorType, ScheduleType } from '@/db/schema';

export type TimeBlock = 'morning' | 'afternoon' | 'night' | 'flexible';

export type TimeInput = {
  scheduleType: ScheduleType;
  fixedTime: string | null;
  anchorType: AnchorType | null;
  anchorTarget: string | null;
  routineName: string;
};

export function inferTimeBlock(input: TimeInput): TimeBlock {
  if (input.scheduleType === 'fixed' && input.fixedTime) {
    return blockFromHour(input.fixedTime);
  }

  if (input.scheduleType === 'anchored' && input.anchorTarget) {
    const block = blockFromAnchor(input.anchorTarget);
    if (block) return block;
  }

  return inferFromContext(input.routineName);
}

export function anchorLabel(
  anchorType: AnchorType | null,
  anchorTarget: string | null,
): string | null {
  if (!anchorType || !anchorTarget) return null;
  const direction = anchorType === 'after' ? 'after' : 'before';
  return `${direction} ${anchorTarget}`;
}

function blockFromHour(fixedTime: string): TimeBlock {
  const hour = Number(fixedTime.split(':')[0]);
  if (hour < 12) return 'morning';
  if (hour < 19) return 'afternoon';
  return 'night';
}

const ANCHOR_BLOCKS: Record<string, TimeBlock> = {
  waking: 'morning',
  breakfast: 'morning',
  'leaving home': 'morning',
  training: 'afternoon',
  shower: 'afternoon',
  lunch: 'afternoon',
  eating: 'afternoon',
  sleep: 'night',
  dinner: 'night',
};

function blockFromAnchor(anchorTarget: string): TimeBlock | null {
  const key = anchorTarget.trim().toLowerCase();
  for (const [candidate, block] of Object.entries(ANCHOR_BLOCKS)) {
    if (key.includes(candidate)) return block;
  }
  return null;
}

const ROUTINE_HINTS: [RegExp, TimeBlock][] = [
  [/wake|morning|make bed|breakfast/i, 'morning'],
  [/training|pull day|push day|shower|study block ii|study block iii|lunch/i, 'afternoon'],
  [/night|sleep|dinner|stretch|read|prep/i, 'night'],
];

function inferFromContext(routineName: string): TimeBlock {
  for (const [pattern, block] of ROUTINE_HINTS) {
    if (pattern.test(routineName)) return block;
  }
  return 'flexible';
}

export const TIME_BLOCK_ORDER: TimeBlock[] = ['morning', 'afternoon', 'night', 'flexible'];

export const TIME_BLOCK_LABELS: Record<TimeBlock, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  night: 'Night',
  flexible: 'Flexible',
};
