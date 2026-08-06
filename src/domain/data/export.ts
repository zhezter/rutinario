import { eq } from 'drizzle-orm';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { db } from '@/db/client';
import { actions, completions, domains, procedures, routines, systems } from '@/db/schema';

export type ExportRow = {
  date: string;
  completedAt: number;
  action: string;
  routine: string;
  system: string;
  domain: string;
};

export async function buildCompletionsExport(): Promise<ExportRow[]> {
  return db
    .select({
      date: completions.date,
      completedAt: completions.completedAt,
      action: actions.name,
      routine: routines.name,
      system: systems.name,
      domain: domains.name,
    })
    .from(completions)
    .innerJoin(actions, eq(completions.actionId, actions.id))
    .innerJoin(procedures, eq(actions.procedureId, procedures.id))
    .innerJoin(routines, eq(procedures.routineId, routines.id))
    .innerJoin(systems, eq(routines.systemId, systems.id))
    .innerJoin(domains, eq(systems.domainId, domains.id))
    .orderBy(completions.date);
}

function quote(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export function toCsv(rows: ExportRow[]): string {
  const header = ['date', 'completed_at', 'action', 'routine', 'system', 'domain'];
  const lines = rows.map((row) =>
    [
      row.date,
      row.completedAt,
      quote(row.action),
      quote(row.routine),
      quote(row.system),
      quote(row.domain),
    ].join(','),
  );
  return [header.join(','), ...lines].join('\n');
}

export function toJson(rows: ExportRow[]): string {
  return JSON.stringify(rows, null, 2);
}

export async function shareExport(
  filename: string,
  content: string,
  mimeType: string,
): Promise<void> {
  const file = new File(Paths.cache, filename);
  file.write(content);
  await Sharing.shareAsync(file.uri, { mimeType });
}

export async function canShare(): Promise<boolean> {
  return Sharing.isAvailableAsync();
}
