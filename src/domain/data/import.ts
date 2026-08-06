import { eq, inArray } from 'drizzle-orm';

import { db } from '@/db/client';
import { actions, completions, domains, procedures, routines, systems } from '@/db/schema';

export type ImportResult = {
  imported: number;
  unknown: number;
  duplicates: number;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const BATCH_SIZE = 200;

type ImportRow = {
  actionId: number;
  date: string;
  completedAt: number;
};

export async function importCompletionsJson(json: string): Promise<ImportResult> {
  const parsed: unknown = JSON.parse(json);
  if (!Array.isArray(parsed)) {
    throw new Error('Expected a JSON array of completions.');
  }

  const lookup = await db
    .select({
      actionId: actions.id,
      action: actions.name,
      routine: routines.name,
      system: systems.name,
      domain: domains.name,
    })
    .from(actions)
    .innerJoin(procedures, eq(actions.procedureId, procedures.id))
    .innerJoin(routines, eq(procedures.routineId, routines.id))
    .innerJoin(systems, eq(routines.systemId, systems.id))
    .innerJoin(domains, eq(systems.domainId, domains.id));

  const byKey = new Map<string, number>();
  for (const row of lookup) {
    byKey.set(
      `${row.domain}|${row.system}|${row.routine}|${row.action}`.toLowerCase(),
      row.actionId,
    );
  }

  const seen = new Set<string>();
  const toInsert: ImportRow[] = [];
  let unknown = 0;
  let malformed = 0;

  for (const row of parsed) {
    if (!row || typeof row !== 'object') {
      malformed += 1;
      continue;
    }
    const r = row as Record<string, unknown>;
    const date = typeof r.date === 'string' ? r.date : '';
    const actionName = typeof r.action === 'string' ? r.action : '';
    const routineName = typeof r.routine === 'string' ? r.routine : '';
    const systemName = typeof r.system === 'string' ? r.system : '';
    const domainName = typeof r.domain === 'string' ? r.domain : '';

    if (!DATE_RE.test(date)) {
      malformed += 1;
      continue;
    }

    const actionId = byKey.get(
      `${domainName}|${systemName}|${routineName}|${actionName}`.toLowerCase(),
    );
    if (actionId === undefined) {
      unknown += 1;
      continue;
    }

    const dedupeKey = `${date}:${actionId}`;
    if (seen.has(dedupeKey)) {
      malformed += 1;
      continue;
    }
    seen.add(dedupeKey);

    toInsert.push({
      actionId,
      date,
      completedAt: typeof r.completedAt === 'number' ? r.completedAt : Date.now(),
    });
  }

  let duplicates = 0;
  let imported = 0;
  if (toInsert.length > 0) {
    const dates = [...new Set(toInsert.map((row) => row.date))];
    const existing = await db
      .select({ actionId: completions.actionId, date: completions.date })
      .from(completions)
      .where(inArray(completions.date, dates));
    const existingSet = new Set(existing.map((row) => `${row.actionId}:${row.date}`));

    const fresh = toInsert.filter((row) => {
      const key = `${row.actionId}:${row.date}`;
      if (existingSet.has(key)) {
        duplicates += 1;
        return false;
      }
      return true;
    });

    for (let i = 0; i < fresh.length; i += BATCH_SIZE) {
      const chunk = fresh.slice(i, i + BATCH_SIZE);
      const inserted = await db
        .insert(completions)
        .values(chunk)
        .onConflictDoNothing()
        .returning({ id: completions.id });
      imported += inserted.length;
    }
  }

  return { imported, unknown, duplicates: duplicates + malformed };
}
