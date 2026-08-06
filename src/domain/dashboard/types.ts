import type {
  AnchorType,
  CompletionLevel,
  FrequencyType,
  ScheduleType,
  ViabilityLevel,
} from '@/db/schema';

import type { TimeBlock } from '../scheduling/anchors';

export type ActionRow = {
  id: number;
  name: string;
  description: string | null;
  durationMin: number | null;
  createdAt: number;
  scheduleType: ScheduleType;
  fixedTime: string | null;
  anchorType: AnchorType | null;
  anchorTarget: string | null;
  frequencyType: FrequencyType;
  frequencyValue: number | null;
  minViableLevel: ViabilityLevel;
  product: string | null;
  procedure: {
    routine: {
      id: number;
      name: string;
      system: {
        name: string;
        domain: { name: string };
      };
    };
  };
  completions: {
    id: number;
    date: string;
    completedAt: number;
    levelUsed: CompletionLevel | null;
  }[];
};

export type ActiveLevel = 'minimum' | 'standard' | 'full';

export type DailyPlanItem = {
  actionId: number;
  name: string;
  description: string | null;
  durationMin: number | null;
  scheduleType: ScheduleType;
  fixedTime: string | null;
  anchor: string | null;
  frequency: string;
  product: string | null;
  minViableLevel: ViabilityLevel;
  timeBlock: TimeBlock;
  domainName: string;
  systemName: string;
  routineId: number;
  routineName: string;
  completed: boolean;
  completedAt: number | null;
  completionId: number | null;
};

export type CategoryProgress = {
  domainName: string;
  completed: number;
  total: number;
  plannedMinutes: number;
  completedMinutes: number;
};

export type DailyPlan = {
  date: string;
  items: DailyPlanItem[];
  categories: CategoryProgress[];
  plannedMinutes: number;
  completedMinutes: number;
};
