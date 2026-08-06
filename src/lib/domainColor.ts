const PALETTE = ['#5B9BD5', '#3FAE8F', '#E0A458', '#C77BA9', '#7F9F5B', '#8E7CC3'] as const;

export function domainColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}
