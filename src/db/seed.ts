import { format, subDays } from 'date-fns';

import { db } from './client';
import {
  actions,
  completions,
  domains,
  inventoryItems,
  procedures,
  routines,
  systems,
  type AnchorType,
  type FrequencyType,
  type ScheduleType,
  type ViabilityLevel,
} from './schema';

type ActionSeed = {
  name: string;
  description?: string;
  durationMin?: number;
  scheduleType?: ScheduleType;
  fixedTime?: string;
  anchorType?: AnchorType;
  anchorTarget?: string;
  frequencyType?: FrequencyType;
  frequencyValue?: number;
  minViableLevel?: ViabilityLevel;
  product?: string;
  instructions?: string;
  notes?: string;
};

const actionIds = new Map<string, number>();

async function insertDomain(name: string, sortOrder: number) {
  const rows = await db
    .insert(domains)
    .values({ name, sortOrder })
    .returning({ id: domains.id });
  return rows[0].id;
}

async function insertSystem(domainId: number, name: string, sortOrder: number) {
  const rows = await db
    .insert(systems)
    .values({ domainId, name, sortOrder })
    .returning({ id: systems.id });
  return rows[0].id;
}

async function insertRoutine(systemId: number, name: string, sortOrder: number, description?: string) {
  const rows = await db
    .insert(routines)
    .values({ systemId, name, sortOrder, description })
    .returning({ id: routines.id });
  return rows[0].id;
}

async function insertProcedure(routineId: number, name: string, sortOrder: number, description?: string) {
  const rows = await db
    .insert(procedures)
    .values({ routineId, name, sortOrder, description })
    .returning({ id: procedures.id });
  return rows[0].id;
}

async function insertAction(procedureId: number, key: string, actionSeed: ActionSeed, orderIndex: number) {
  const rows = await db
    .insert(actions)
    .values({ procedureId, ...actionSeed, orderIndex })
    .returning({ id: actions.id });
  actionIds.set(key, rows[0].id);
  return rows[0].id;
}

const action = (name: string, partial: Omit<ActionSeed, 'name'> = {}): ActionSeed => ({
  name,
  minViableLevel: 'essential',
  scheduleType: 'flexible',
  frequencyType: 'daily',
  ...partial,
});

export async function seedDatabase() {
  const existing = await db.select({ id: domains.id }).from(domains).limit(1);
  if (existing.length > 0) return false;

  const domainIds: Record<string, number> = {};

  domainIds.personalCare = await insertDomain('Personal Care', 1);
  domainIds.health = await insertDomain('Health & Fitness', 2);
  domainIds.nutrition = await insertDomain('Nutrition', 3);
  domainIds.study = await insertDomain('Study', 4);
  domainIds.environment = await insertDomain('Environment', 5);
  domainIds.productivity = await insertDomain('Productivity', 6);

  // ─── PERSONAL CARE ────────────────────────────────────────────────

  const skinSystem = await insertSystem(domainIds.personalCare, 'Skin', 1);

  const morningSkin = await insertRoutine(skinSystem, 'Morning Care', 1, 'Daily morning skin routine');
  let proc = await insertProcedure(morningSkin, 'Cleanse', 1, 'Clean the face');
  await insertAction(proc, 'am-skin/cleanse/wet', action('Wet face', { instructions: 'Wet the face with lukewarm water.', minViableLevel: 'standard' }), 1);
  await insertAction(proc, 'am-skin/cleanse/apply', action('Apply cleanser', { product: 'Cleanser', instructions: 'Massage a small amount onto damp skin.', minViableLevel: 'standard' }), 2);
  await insertAction(proc, 'am-skin/cleanse/massage', action('Massage', { description: 'Circular motions for 30 seconds.', minViableLevel: 'full' }), 3);
  await insertAction(proc, 'am-skin/cleanse/rinse', action('Rinse', { minViableLevel: 'standard' }), 4);
  await insertAction(proc, 'am-skin/cleanse/dry', action('Dry', { description: 'Pat dry with a clean towel.', minViableLevel: 'full' }), 5);

  proc = await insertProcedure(morningSkin, 'Moisturize', 2);
  await insertAction(proc, 'am-skin/moisturize/apply', action('Apply moisturizer', { product: 'Moisturizer', minViableLevel: 'standard' }), 1);

  proc = await insertProcedure(morningSkin, 'Sunscreen', 3);
  await insertAction(proc, 'am-skin/sunscreen/apply', action('Apply sunscreen', { product: 'Sunscreen', minViableLevel: 'essential' }), 1);

  const nightSkin = await insertRoutine(skinSystem, 'Night Care', 2, 'Daily night skin routine');
  proc = await insertProcedure(nightSkin, 'Cleanse', 1);
  await insertAction(proc, 'pm-skin/cleanse/wet', action('Wet face', { minViableLevel: 'essential' }), 1);
  await insertAction(proc, 'pm-skin/cleanse/apply', action('Apply cleanser', { product: 'Cleanser', minViableLevel: 'essential' }), 2);
  await insertAction(proc, 'pm-skin/cleanse/massage', action('Massage', { minViableLevel: 'full' }), 3);
  await insertAction(proc, 'pm-skin/cleanse/rinse', action('Rinse', { minViableLevel: 'essential' }), 4);

  proc = await insertProcedure(nightSkin, 'Treatment', 2);
  await insertAction(proc, 'pm-skin/treatment/apply', action('Apply treatment', { product: 'Treatment', minViableLevel: 'full', instructions: 'Apply before moisturizer.' }), 1);

  proc = await insertProcedure(nightSkin, 'Moisturize', 3);
  await insertAction(proc, 'pm-skin/moisturize/apply', action('Apply night moisturizer', { product: 'Moisturizer', minViableLevel: 'standard' }), 1);

  proc = await insertProcedure(nightSkin, 'Eye care', 4);
  await insertAction(proc, 'pm-skin/eye/apply', action('Apply eye cream', { product: 'Eye cream', minViableLevel: 'full' }), 1);

  const hairSystem = await insertSystem(domainIds.personalCare, 'Hair', 2);
  const hairCare = await insertRoutine(hairSystem, 'Hair Care', 1);
  proc = await insertProcedure(hairCare, 'Wash', 1);
  await insertAction(
    proc,
    'hair/wash',
    action('Wash hair', {
      durationMin: 10,
      scheduleType: 'anchored',
      anchorType: 'after',
      anchorTarget: 'shower',
      frequencyType: 'n_per_week',
      frequencyValue: 2,
      product: 'Shampoo + Conditioner',
    }),
    1,
  );

  const oralSystem = await insertSystem(domainIds.personalCare, 'Oral', 3);
  const morningOral = await insertRoutine(oralSystem, 'Morning Oral Care', 1);
  proc = await insertProcedure(morningOral, 'Brush', 1);
  await insertAction(
    proc,
    'am-oral/brush',
    action('Brush teeth', {
      durationMin: 2,
      scheduleType: 'anchored',
      anchorType: 'after',
      anchorTarget: 'waking',
      product: 'Toothbrush + Toothpaste',
    }),
    1,
  );
  proc = await insertProcedure(morningOral, 'Floss', 2);
  await insertAction(proc, 'am-oral/floss', action('Floss', { durationMin: 2, minViableLevel: 'standard', product: 'Floss' }), 1);

  const nightOral = await insertRoutine(oralSystem, 'Night Oral Care', 2);
  proc = await insertProcedure(nightOral, 'Brush', 1);
  await insertAction(
    proc,
    'pm-oral/brush',
    action('Brush teeth', {
      durationMin: 2,
      scheduleType: 'anchored',
      anchorType: 'before',
      anchorTarget: 'sleep',
      product: 'Toothbrush + Toothpaste',
    }),
    1,
  );
  proc = await insertProcedure(nightOral, 'Floss', 2);
  await insertAction(proc, 'pm-oral/floss', action('Floss', { durationMin: 2, minViableLevel: 'standard', product: 'Floss' }), 1);

  const bodySystem = await insertSystem(domainIds.personalCare, 'Body', 4);
  const showerRoutine = await insertRoutine(bodySystem, 'Shower', 1);
  proc = await insertProcedure(showerRoutine, 'Shower', 1);
  await insertAction(
    proc,
    'body/shower',
    action('Take shower', {
      durationMin: 15,
      scheduleType: 'anchored',
      anchorType: 'after',
      anchorTarget: 'training',
      product: 'Soap + Shampoo',
    }),
    1,
  );
  const bodyCare = await insertRoutine(bodySystem, 'Body Care', 2);
  proc = await insertProcedure(bodyCare, 'Moisturize', 1);
  await insertAction(
    proc,
    'body/moisturize',
    action('Apply body moisturizer', {
      durationMin: 3,
      scheduleType: 'anchored',
      anchorType: 'after',
      anchorTarget: 'shower',
      minViableLevel: 'standard',
      product: 'Body moisturizer',
    }),
    1,
  );

  // ─── HEALTH & FITNESS ─────────────────────────────────────────────

  const trainingSystem = await insertSystem(domainIds.health, 'Training', 1);

  const pullDay = await insertRoutine(trainingSystem, 'Pull Day', 1, 'Calisthenics pull session');
  proc = await insertProcedure(pullDay, 'Warm-up', 1);
  await insertAction(proc, 'pull/warmup', action('Warm-up', { durationMin: 5, notes: 'Minimum viable: 10 min mobility.' }), 1);
  proc = await insertProcedure(pullDay, 'Scapular activation', 2);
  await insertAction(proc, 'pull/scapular', action('Scapular activation', { durationMin: 5, minViableLevel: 'standard' }), 1);
  proc = await insertProcedure(pullDay, 'Pull-ups', 3);
  await insertAction(proc, 'pull/pullups', action('Pull-ups', { durationMin: 20, minViableLevel: 'standard' }), 1);
  proc = await insertProcedure(pullDay, 'Rows', 4);
  await insertAction(proc, 'pull/rows', action('Rows', { durationMin: 15, minViableLevel: 'standard' }), 1);
  proc = await insertProcedure(pullDay, 'Biceps', 5);
  await insertAction(proc, 'pull/biceps', action('Biceps', { durationMin: 10, minViableLevel: 'full' }), 1);
  proc = await insertProcedure(pullDay, 'Core', 6);
  await insertAction(proc, 'pull/core', action('Core', { durationMin: 10, minViableLevel: 'standard' }), 1);
  proc = await insertProcedure(pullDay, 'Cooldown', 7);
  await insertAction(proc, 'pull/cooldown', action('Cooldown', { durationMin: 5, minViableLevel: 'standard' }), 1);

  const pushDay = await insertRoutine(trainingSystem, 'Push Day', 2, 'Calisthenics push session');
  proc = await insertProcedure(pushDay, 'Warm-up', 1);
  await insertAction(proc, 'push/warmup', action('Warm-up', { durationMin: 5 }), 1);
  proc = await insertProcedure(pushDay, 'Push-ups', 2);
  await insertAction(proc, 'push/pushups', action('Push-ups', { durationMin: 15, minViableLevel: 'standard' }), 1);
  proc = await insertProcedure(pushDay, 'Dips', 3);
  await insertAction(proc, 'push/dips', action('Dips', { durationMin: 15, minViableLevel: 'full' }), 1);
  proc = await insertProcedure(pushDay, 'Shoulder press', 4);
  await insertAction(proc, 'push/press', action('Shoulder press', { durationMin: 10, minViableLevel: 'full' }), 1);
  proc = await insertProcedure(pushDay, 'Core', 5);
  await insertAction(proc, 'push/core', action('Core', { durationMin: 10, minViableLevel: 'standard' }), 1);
  proc = await insertProcedure(pushDay, 'Cooldown', 6);
  await insertAction(proc, 'push/cooldown', action('Cooldown', { durationMin: 5, minViableLevel: 'standard' }), 1);

  const recoverySystem = await insertSystem(domainIds.health, 'Recovery', 2);

  const sleepRoutine = await insertRoutine(recoverySystem, 'Sleep', 1);
  proc = await insertProcedure(sleepRoutine, 'Sleep', 1);
  await insertAction(
    proc,
    'recovery/sleep',
    action('Sleep', {
      durationMin: 450,
      scheduleType: 'fixed',
      fixedTime: '23:30',
      notes: 'Target 7h 30m of rest.',
    }),
    1,
  );

  const hydrationRoutine = await insertRoutine(recoverySystem, 'Hydration', 2);
  proc = await insertProcedure(hydrationRoutine, 'Hydrate', 1);
  await insertAction(
    proc,
    'recovery/hydrate',
    action('Drink water on waking', {
      durationMin: 2,
      scheduleType: 'anchored',
      anchorType: 'after',
      anchorTarget: 'waking',
      frequencyType: 'n_per_day',
      frequencyValue: 2,
    }),
    1,
  );

  const stretchRoutine = await insertRoutine(recoverySystem, 'Stretching', 3);
  proc = await insertProcedure(stretchRoutine, 'Stretch', 1);
  await insertAction(
    proc,
    'recovery/stretch',
    action('Evening stretch', {
      durationMin: 10,
      scheduleType: 'anchored',
      anchorType: 'before',
      anchorTarget: 'sleep',
      minViableLevel: 'standard',
    }),
    1,
  );

  // ─── NUTRITION ────────────────────────────────────────────────────

  const mealsSystem = await insertSystem(domainIds.nutrition, 'Meals', 1);

  const breakfast = await insertRoutine(mealsSystem, 'Breakfast', 1, '07:00');
  proc = await insertProcedure(breakfast, 'Prepare', 1);
  await insertAction(proc, 'breakfast/oats', action('Prepare oats', { durationMin: 5 }), 1);
  await insertAction(proc, 'breakfast/eggs', action('Prepare eggs', { durationMin: 5, minViableLevel: 'standard' }), 2);
  await insertAction(proc, 'breakfast/fruit', action('Fruit', { durationMin: 2 }), 3);
  await insertAction(proc, 'breakfast/water', action('Water', { durationMin: 1 }), 4);
  proc = await insertProcedure(breakfast, 'Clean up', 2);
  await insertAction(proc, 'breakfast/clean', action('Clean kitchen', { durationMin: 5, minViableLevel: 'standard' }), 1);

  const lunch = await insertRoutine(mealsSystem, 'Lunch', 2, '12:30');
  proc = await insertProcedure(lunch, 'Eat', 1);
  await insertAction(
    proc,
    'lunch/eat',
    action('Eat lunch', {
      durationMin: 30,
      scheduleType: 'fixed',
      fixedTime: '12:30',
    }),
    1,
  );

  const dinner = await insertRoutine(mealsSystem, 'Dinner', 3, 'Anchored after training');
  proc = await insertProcedure(dinner, 'Eat', 1);
  await insertAction(
    proc,
    'dinner/eat',
    action('Eat dinner', {
      durationMin: 30,
      scheduleType: 'anchored',
      anchorType: 'after',
      anchorTarget: 'training',
    }),
    1,
  );

  // ─── STUDY ────────────────────────────────────────────────────────

  const universitySystem = await insertSystem(domainIds.study, 'University', 1);

  const studyBlocks: { key: string; time: string; level: ViabilityLevel }[] = [
    { key: 'study/i', time: '07:30', level: 'essential' },
    { key: 'study/ii', time: '10:30', level: 'standard' },
    { key: 'study/iii', time: '18:00', level: 'standard' },
  ];

  for (const [i, block] of studyBlocks.entries()) {
    const routine = await insertRoutine(universitySystem, `Study Block ${['I', 'II', 'III'][i]}`, i + 1, block.time);
    proc = await insertProcedure(routine, 'Focused study', 1);
    await insertAction(
      proc,
      block.key,
      action('Study', {
        durationMin: 90,
        scheduleType: 'fixed',
        fixedTime: block.time,
        minViableLevel: block.level,
        notes: block.level === 'essential' ? 'Minimum viable: 20 min.' : undefined,
      }),
      1,
    );
  }

  // ─── ENVIRONMENT ──────────────────────────────────────────────────

  const morningSystem = await insertSystem(domainIds.environment, 'Morning', 1);

  const wakeRoutine = await insertRoutine(morningSystem, 'Wake Up Routine', 1, '06:30');
  proc = await insertProcedure(wakeRoutine, 'Make bed', 1);
  await insertAction(proc, 'env/wake/make-bed', action('Make bed', { durationMin: 2, scheduleType: 'fixed', fixedTime: '06:30' }), 1);
  proc = await insertProcedure(wakeRoutine, 'Bathroom', 2);
  await insertAction(
    proc,
    'env/wake/bathroom',
    action('Morning bathroom', {
      durationMin: 5,
      scheduleType: 'anchored',
      anchorType: 'after',
      anchorTarget: 'waking',
    }),
    1,
  );

  const nightRoutine = await insertRoutine(morningSystem, 'Night Prep', 2, '22:30');
  proc = await insertProcedure(nightRoutine, 'Prepare tomorrow', 1);
  await insertAction(
    proc,
    'env/night/prepare',
    action('Prepare for tomorrow', {
      durationMin: 10,
      scheduleType: 'anchored',
      anchorType: 'before',
      anchorTarget: 'sleep',
      notes: 'Set clothes, plan the day.',
    }),
    1,
  );

  // ─── PRODUCTIVITY ─────────────────────────────────────────────────

  const readingSystem = await insertSystem(domainIds.productivity, 'Reading', 1);
  const readingRoutine = await insertRoutine(readingSystem, 'Daily Reading', 1);
  proc = await insertProcedure(readingRoutine, 'Read', 1);
  await insertAction(proc, 'productivity/read', action('Read', { durationMin: 20 }), 1);

  // ─── INVENTORY ────────────────────────────────────────────────────

  const inventorySeed: {
    name: string;
    category: string;
    usedInActionKey: string;
    amountRemaining: number;
    replacementIntervalDays?: number;
  }[] = [
    { name: 'Cleanser', category: 'Face', usedInActionKey: 'am-skin/cleanse/apply', amountRemaining: 30, replacementIntervalDays: 90 },
    { name: 'Moisturizer', category: 'Face', usedInActionKey: 'am-skin/moisturize/apply', amountRemaining: 55, replacementIntervalDays: 90 },
    { name: 'Sunscreen', category: 'Face', usedInActionKey: 'am-skin/sunscreen/apply', amountRemaining: 15, replacementIntervalDays: 30 },
    { name: 'Treatment', category: 'Face', usedInActionKey: 'pm-skin/treatment/apply', amountRemaining: 70, replacementIntervalDays: 60 },
    { name: 'Eye cream', category: 'Face', usedInActionKey: 'pm-skin/eye/apply', amountRemaining: 80, replacementIntervalDays: 120 },
    { name: 'Shampoo', category: 'Hair', usedInActionKey: 'hair/wash', amountRemaining: 40, replacementIntervalDays: 45 },
    { name: 'Conditioner', category: 'Hair', usedInActionKey: 'hair/wash', amountRemaining: 40, replacementIntervalDays: 45 },
    { name: 'Soap', category: 'Body', usedInActionKey: 'body/shower', amountRemaining: 25, replacementIntervalDays: 30 },
    { name: 'Body moisturizer', category: 'Body', usedInActionKey: 'body/moisturize', amountRemaining: 60, replacementIntervalDays: 90 },
    { name: 'Toothbrush', category: 'Oral', usedInActionKey: 'am-oral/brush', amountRemaining: 90, replacementIntervalDays: 90 },
    { name: 'Toothpaste', category: 'Oral', usedInActionKey: 'am-oral/brush', amountRemaining: 20, replacementIntervalDays: 60 },
    { name: 'Floss', category: 'Oral', usedInActionKey: 'am-oral/floss', amountRemaining: 50, replacementIntervalDays: 60 },
  ];

  for (const item of inventorySeed) {
    await db.insert(inventoryItems).values({
      name: item.name,
      category: item.category,
      usedInActionId: actionIds.get(item.usedInActionKey),
      amountRemaining: item.amountRemaining,
      replacementIntervalDays: item.replacementIntervalDays,
    });
  }

  // ─── SAMPLE COMPLETIONS (today + recent history) ──────────────────

  const today = format(new Date(), 'yyyy-MM-dd');

  const completionKeys: { key: string; date: string; levelUsed?: 'minimum' | 'standard' | 'full' }[] = [
    'env/wake/make-bed',
    'env/wake/bathroom',
    'recovery/hydrate',
    'am-oral/brush',
    'am-skin/cleanse/wet',
    'am-skin/cleanse/apply',
    'am-skin/cleanse/rinse',
    'am-skin/sunscreen/apply',
    'breakfast/oats',
    'breakfast/fruit',
    'breakfast/water',
  ].map((key) => ({ key, date: today }));

  const history: { key: string; daysAgo: number }[] = [
    { key: 'env/wake/make-bed', daysAgo: 1 },
    { key: 'am-skin/sunscreen/apply', daysAgo: 1 },
    { key: 'body/shower', daysAgo: 1 },
    { key: 'lunch/eat', daysAgo: 1 },
    { key: 'recovery/sleep', daysAgo: 1 },
    { key: 'env/wake/make-bed', daysAgo: 2 },
    { key: 'body/shower', daysAgo: 2 },
    { key: 'recovery/sleep', daysAgo: 2 },
    { key: 'hair/wash', daysAgo: 2 },
    { key: 'hair/wash', daysAgo: 6 },
  ];

  for (const c of completionKeys) {
    const actionId = actionIds.get(c.key);
    if (!actionId) continue;
    await db.insert(completions).values({ actionId, date: c.date, levelUsed: c.levelUsed });
  }

  for (const { key, daysAgo } of history) {
    const actionId = actionIds.get(key);
    if (!actionId) continue;
    await db.insert(completions).values({
      actionId,
      date: format(subDays(new Date(), daysAgo), 'yyyy-MM-dd'),
    });
  }

  return true;
}
