import { relations } from 'drizzle-orm';
import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const scheduleTypes = ['fixed', 'anchored', 'flexible'] as const;
export type ScheduleType = (typeof scheduleTypes)[number];

export const anchorTypes = ['after', 'before'] as const;
export type AnchorType = (typeof anchorTypes)[number];

export const frequencyTypes = [
  'daily',
  'n_per_day',
  'n_per_week',
  'every_n_days',
  'every_2_weeks',
  'monthly',
  'quarterly',
  'yearly',
  'as_needed',
] as const;
export type FrequencyType = (typeof frequencyTypes)[number];

export const viabilityLevels = ['essential', 'standard', 'full'] as const;
export type ViabilityLevel = (typeof viabilityLevels)[number];

export const completionLevels = ['minimum', 'standard', 'full'] as const;
export type CompletionLevel = (typeof completionLevels)[number];

export const domains = sqliteTable('domains', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  icon: text('icon'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: integer('created_at')
    .notNull()
    .$defaultFn(() => Date.now()),
});

export const systems = sqliteTable('systems', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  domainId: integer('domain_id')
    .notNull()
    .references(() => domains.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: integer('created_at')
    .notNull()
    .$defaultFn(() => Date.now()),
});

export const routines = sqliteTable('routines', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  systemId: integer('system_id')
    .notNull()
    .references(() => systems.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: integer('created_at')
    .notNull()
    .$defaultFn(() => Date.now()),
});

export const procedures = sqliteTable('procedures', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  routineId: integer('routine_id')
    .notNull()
    .references(() => routines.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: integer('created_at')
    .notNull()
    .$defaultFn(() => Date.now()),
});

export const actions = sqliteTable('actions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  procedureId: integer('procedure_id')
    .notNull()
    .references(() => procedures.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  durationMin: integer('duration_min'),
  orderIndex: integer('order_index').notNull().default(0),

  scheduleType: text('schedule_type', { enum: scheduleTypes })
    .notNull()
    .default('flexible'),
  fixedTime: text('fixed_time'),
  anchorType: text('anchor_type', { enum: anchorTypes }),
  anchorTarget: text('anchor_target'),

  frequencyType: text('frequency_type', { enum: frequencyTypes })
    .notNull()
    .default('daily'),
  frequencyValue: integer('frequency_value'),

  minViableLevel: text('min_viable_level', { enum: viabilityLevels })
    .notNull()
    .default('essential'),

  product: text('product'),
  instructions: text('instructions'),
  dependencies: text('dependencies'),
  notes: text('notes'),
  alternatives: text('alternatives'),

  createdAt: integer('created_at')
    .notNull()
    .$defaultFn(() => Date.now()),
});

export const completions = sqliteTable(
  'completions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    actionId: integer('action_id')
      .notNull()
      .references(() => actions.id, { onDelete: 'cascade' }),
    date: text('date').notNull(),
    completedAt: integer('completed_at')
      .notNull()
      .$defaultFn(() => Date.now()),
    levelUsed: text('level_used', { enum: completionLevels }).default('standard'),
  },
  (table) => [
    uniqueIndex('completions_action_date_unique').on(table.actionId, table.date),
  ],
);

export const inventoryItems = sqliteTable('inventory_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  category: text('category').notNull(),
  lowStock: integer('low_stock').notNull().default(0),
  notes: text('notes'),
  createdAt: integer('created_at')
    .notNull()
    .$defaultFn(() => Date.now()),
});

export const appSettings = sqliteTable('app_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export const dayNotes = sqliteTable('day_notes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  date: text('date').notNull().unique(),
  note: text('note').notNull(),
  updatedAt: integer('updated_at')
    .notNull()
    .$defaultFn(() => Date.now()),
});

export const dayClosures = sqliteTable('day_closures', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  date: text('date').notNull().unique(),
  closedAt: integer('closed_at')
    .notNull()
    .$defaultFn(() => Date.now()),
});

export const domainsRelations = relations(domains, ({ many }) => ({
  systems: many(systems),
}));

export const systemsRelations = relations(systems, ({ one, many }) => ({
  domain: one(domains, {
    fields: [systems.domainId],
    references: [domains.id],
  }),
  routines: many(routines),
}));

export const routinesRelations = relations(routines, ({ one, many }) => ({
  system: one(systems, {
    fields: [routines.systemId],
    references: [systems.id],
  }),
  procedures: many(procedures),
}));

export const proceduresRelations = relations(procedures, ({ one, many }) => ({
  routine: one(routines, {
    fields: [procedures.routineId],
    references: [routines.id],
  }),
  actions: many(actions),
}));

export const actionsRelations = relations(actions, ({ one, many }) => ({
  procedure: one(procedures, {
    fields: [actions.procedureId],
    references: [procedures.id],
  }),
  completions: many(completions),
}));

export const completionsRelations = relations(completions, ({ one }) => ({
  action: one(actions, {
    fields: [completions.actionId],
    references: [actions.id],
  }),
}));
