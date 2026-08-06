export function greetingFor(date: Date): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 19) return 'Good afternoon';
  return 'Good evening';
}

export function progressMessage(completed: number, total: number): string {
  if (total === 0) return 'Nothing planned for today.';
  if (completed >= total) return 'All done today. Well earned.';
  const left = total - completed;
  if (left === 1) return `${completed} done — just 1 left.`;
  return `${completed} done, ${left} to go.`;
}
