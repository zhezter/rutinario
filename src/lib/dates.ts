import { format, startOfWeek } from 'date-fns';

export const dateKey = (date: Date) => format(date, 'yyyy-MM-dd');

export const daysBetween = (a: Date, b: Date) => {
  const ms = a.getTime() - b.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
};

export const thisWeekStart = (today: Date) => startOfWeek(today, { weekStartsOn: 1 });
