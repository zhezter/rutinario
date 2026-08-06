import { create } from 'zustand';

import type { ActiveLevel } from '@/domain/dashboard/types';

export type TodayView = 'list' | 'timeline';

type UIState = {
  activeLevel: ActiveLevel;
  setActiveLevel: (level: ActiveLevel) => void;
  todayView: TodayView;
  setTodayView: (view: TodayView) => void;
};

export const useUIStore = create<UIState>((set) => ({
  activeLevel: 'standard',
  setActiveLevel: (activeLevel) => set({ activeLevel }),
  todayView: 'list',
  setTodayView: (todayView) => set({ todayView }),
}));
