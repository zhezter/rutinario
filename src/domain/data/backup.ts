import { sqlite } from '@/db/client';

export type BackupRow = Record<string, number | string | null>;

export type FullBackup = {
  app: 'rutinario';
  type: 'full-backup';
  version: number;
  exportedAt: number;
  data: Record<string, BackupRow[]>;
};

const BACKUP_VERSION = 1;

const TABLES = [
  'domains',
  'systems',
  'routines',
  'procedures',
  'actions',
  'completions',
  'inventory_items',
  'app_settings',
  'day_notes',
  'day_closures',
  'workouts',
  'workout_days',
  'exercises',
  'workout_exercises',
  'exercise_logs',
];

const SEQUENCED = TABLES.filter((name) => name !== 'app_settings');

export function buildFullBackup(): FullBackup {
  const data: Record<string, BackupRow[]> = {};
  for (const name of TABLES) {
    data[name] = sqlite.getAllSync<BackupRow>(`SELECT * FROM "${name}"`);
  }
  return {
    app: 'rutinario',
    type: 'full-backup',
    version: BACKUP_VERSION,
    exportedAt: Date.now(),
    data,
  };
}

export function backupToJson(backup: FullBackup): string {
  return JSON.stringify(backup);
}

export function parseFullBackup(json: string): FullBackup {
  const parsed: unknown = JSON.parse(json);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid backup file.');
  }
  const backup = parsed as Partial<FullBackup>;
  if (backup.app !== 'rutinario' || backup.type !== 'full-backup') {
    throw new Error('This file is not a Rutinario backup.');
  }
  if (backup.version !== BACKUP_VERSION) {
    throw new Error(`Unsupported backup version ${String(backup.version)}.`);
  }
  if (!backup.data || typeof backup.data !== 'object') {
    throw new Error('The backup has no data.');
  }
  return backup as FullBackup;
}

export function restoreFullBackup(backup: FullBackup): number {
  let restored = 0;
  sqlite.withTransactionSync(() => {
    for (let i = TABLES.length - 1; i >= 0; i--) {
      sqlite.execSync(`DELETE FROM "${TABLES[i]}"`);
    }
    for (const name of TABLES) {
      const rows = backup.data[name] ?? [];
      for (const row of rows) {
        const columns = Object.keys(row);
        const values = columns.map((column) => row[column] ?? null);
        const placeholders = columns.map(() => '?').join(', ');
        sqlite.runSync(
          `INSERT INTO "${name}" (${columns.map((column) => `"${column}"`).join(', ')}) VALUES (${placeholders})`,
          values,
        );
        restored += 1;
      }
      if (SEQUENCED.includes(name) && rows.length > 0) {
        sqlite.runSync(
          `UPDATE sqlite_sequence SET seq = (SELECT MAX(id) FROM "${name}") WHERE name = ?`,
          [name],
        );
      }
    }
  });
  return restored;
}
