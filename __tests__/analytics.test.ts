import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  calculateStreak,
  buildTrendSeries,
  averageItch,
  averageSleep,
  topAffectedAreas,
  topFoods,
  sleepItchCorrelation,
  toLocalDateString,
  parseLocalDate,
  type LogSummary,
} from '@/lib/logs/analytics';

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

let _id = 0;
function makeLog(
  log_date: string,
  overrides: Partial<Omit<LogSummary, 'id' | 'log_date'>> = {},
): LogSummary {
  return {
    id: String(++_id),
    log_date,
    itch_level: null,
    stress_level: null,
    sleep_hours: null,
    sleep_quality: null,
    affected_areas: [],
    notes: null,
    skin_status: null,
    quick_tags: [],
    ...overrides,
  };
}

function makeFood(food_name: string): { food_name: string } {
  return { food_name };
}

/** Fixed "today" for all date-sensitive tests. */
const FAKE_TODAY = new Date('2026-04-17T10:00:00.000Z');

// ---------------------------------------------------------------------------
// Exported pure helpers
// ---------------------------------------------------------------------------

describe('toLocalDateString', () => {
  it('formats a date to YYYY-MM-DD using local time', () => {
    const d = new Date(2026, 3, 17); // April 17 in local time
    expect(toLocalDateString(d)).toBe('2026-04-17');
  });

  it('pads month and day with leading zeros', () => {
    const d = new Date(2026, 0, 5); // Jan 5
    expect(toLocalDateString(d)).toBe('2026-01-05');
  });
});

describe('parseLocalDate', () => {
  it('parses YYYY-MM-DD back to a local Date', () => {
    const d = parseLocalDate('2026-04-17');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(3); // April (0-indexed)
    expect(d.getDate()).toBe(17);
  });

  it('handles single-digit month and day strings', () => {
    const d = parseLocalDate('2026-01-05');
    expect(d.getMonth()).toBe(0); // January
    expect(d.getDate()).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// averageItch
// ---------------------------------------------------------------------------

describe('averageItch', () => {
  it('returns null for empty array', () => {
    expect(averageItch([])).toBeNull();
  });

  it('returns null when all itch_level values are null', () => {
    expect(averageItch([makeLog('2026-01-01'), makeLog('2026-01-02')])).toBeNull();
  });

  it('returns the value when only one log has a level', () => {
    const logs = [makeLog('2026-01-01', { itch_level: 7 })];
    expect(averageItch(logs)).toBe(7);
  });

  it('averages correctly across multiple logs', () => {
    const logs = [
      makeLog('2026-01-01', { itch_level: 4 }),
      makeLog('2026-01-02', { itch_level: 6 }),
      makeLog('2026-01-03', { itch_level: 8 }),
    ];
    expect(averageItch(logs)).toBeCloseTo(6);
  });

  it('skips null values when averaging', () => {
    const logs = [
      makeLog('2026-01-01', { itch_level: 4 }),
      makeLog('2026-01-02', { itch_level: null }),
      makeLog('2026-01-03', { itch_level: 8 }),
    ];
    expect(averageItch(logs)).toBeCloseTo(6);
  });
});

// ---------------------------------------------------------------------------
// averageSleep
// ---------------------------------------------------------------------------

describe('averageSleep', () => {
  it('returns null for empty array', () => {
    expect(averageSleep([])).toBeNull();
  });

  it('returns null when all sleep_hours are null', () => {
    expect(averageSleep([makeLog('2026-01-01'), makeLog('2026-01-02')])).toBeNull();
  });

  it('returns the single value when only one entry', () => {
    const logs = [makeLog('2026-01-01', { sleep_hours: 8 })];
    expect(averageSleep(logs)).toBe(8);
  });

  it('averages correctly, coercing to number', () => {
    const logs = [
      makeLog('2026-01-01', { sleep_hours: 6 }),
      makeLog('2026-01-02', { sleep_hours: 8 }),
    ];
    expect(averageSleep(logs)).toBeCloseTo(7);
  });

  it('skips null sleep values', () => {
    const logs = [
      makeLog('2026-01-01', { sleep_hours: 6 }),
      makeLog('2026-01-02', { sleep_hours: null }),
      makeLog('2026-01-03', { sleep_hours: 8 }),
    ];
    expect(averageSleep(logs)).toBeCloseTo(7);
  });
});

// ---------------------------------------------------------------------------
// topAffectedAreas
// ---------------------------------------------------------------------------

describe('topAffectedAreas', () => {
  it('returns [] for empty logs', () => {
    expect(topAffectedAreas([])).toEqual([]);
  });

  it('returns [] when no log has affected_areas', () => {
    const logs = [makeLog('2026-01-01'), makeLog('2026-01-02')];
    expect(topAffectedAreas(logs)).toEqual([]);
  });

  it('returns [] for logs with empty affected_areas arrays', () => {
    const logs = [makeLog('2026-01-01', { affected_areas: [] })];
    expect(topAffectedAreas(logs)).toEqual([]);
  });

  it('counts occurrences per area across logs', () => {
    const logs = [
      makeLog('2026-01-01', { affected_areas: ['face', 'arms'] }),
      makeLog('2026-01-02', { affected_areas: ['face'] }),
      makeLog('2026-01-03', { affected_areas: ['arms'] }),
    ];
    const result = topAffectedAreas(logs);
    const face = result.find((r) => r.area === 'face');
    const arms = result.find((r) => r.area === 'arms');
    expect(face?.count).toBe(2);
    expect(arms?.count).toBe(2);
  });

  it('sorts by count descending', () => {
    const logs = [
      makeLog('2026-01-01', { affected_areas: ['face', 'arms', 'legs'] }),
      makeLog('2026-01-02', { affected_areas: ['face', 'arms'] }),
      makeLog('2026-01-03', { affected_areas: ['face'] }),
    ];
    const result = topAffectedAreas(logs);
    expect(result[0]?.area).toBe('face');
    expect(result[1]?.area).toBe('arms');
  });

  it('respects the limit parameter', () => {
    const logs = [
      makeLog('2026-01-01', { affected_areas: ['a', 'b', 'c', 'd', 'e', 'f'] }),
    ];
    expect(topAffectedAreas(logs, 3)).toHaveLength(3);
  });

  it('calculates percent as count / number_of_logs_with_areas', () => {
    const logs = [
      makeLog('2026-01-01', { affected_areas: ['face'] }),
      makeLog('2026-01-02', { affected_areas: ['face'] }),
      makeLog('2026-01-03', { affected_areas: ['arms'] }),
    ];
    const result = topAffectedAreas(logs);
    const face = result.find((r) => r.area === 'face');
    // 2 out of 3 logs with areas
    expect(face?.percent).toBeCloseTo(2 / 3);
  });

  it('ignores logs with null or empty affected_areas in denominator', () => {
    const logs = [
      makeLog('2026-01-01', { affected_areas: ['face'] }),
      makeLog('2026-01-02', { affected_areas: null as unknown as string[] }),
      makeLog('2026-01-03', { affected_areas: [] }),
    ];
    const result = topAffectedAreas(logs);
    // denom = 1 (only first log has areas)
    expect(result[0]?.percent).toBeCloseTo(1);
  });
});

// ---------------------------------------------------------------------------
// topFoods
// ---------------------------------------------------------------------------

describe('topFoods', () => {
  it('returns [] for empty foods', () => {
    expect(topFoods([])).toEqual([]);
  });

  it('counts food occurrences case-insensitively', () => {
    const foods = [makeFood('Dairy'), makeFood('dairy'), makeFood('DAIRY')];
    const result = topFoods(foods);
    expect(result).toHaveLength(1);
    expect(result[0]?.count).toBe(3);
  });

  it('capitalises the output name', () => {
    const result = topFoods([makeFood('dairy')]);
    expect(result[0]?.name).toBe('Dairy');
  });

  it('sorts by count descending', () => {
    const foods = [
      makeFood('dairy'),
      makeFood('gluten'),
      makeFood('dairy'),
      makeFood('gluten'),
      makeFood('dairy'),
    ];
    const result = topFoods(foods);
    expect(result[0]?.name).toBe('Dairy');
    expect(result[0]?.count).toBe(3);
    expect(result[1]?.name).toBe('Gluten');
    expect(result[1]?.count).toBe(2);
  });

  it('respects the limit parameter', () => {
    const foods = [
      makeFood('a'), makeFood('a'),
      makeFood('b'), makeFood('b'),
      makeFood('c'), makeFood('c'),
      makeFood('d'), makeFood('d'),
    ];
    expect(topFoods(foods, 2)).toHaveLength(2);
  });

  it('skips blank food names after trim', () => {
    const foods = [makeFood('  '), makeFood(''), makeFood('eggs')];
    const result = topFoods(foods);
    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe('Eggs');
  });

  it('trims whitespace before normalising', () => {
    const foods = [makeFood('  dairy  '), makeFood('dairy')];
    const result = topFoods(foods);
    expect(result).toHaveLength(1);
    expect(result[0]?.count).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// sleepItchCorrelation
// ---------------------------------------------------------------------------

describe('sleepItchCorrelation', () => {
  it('returns nulls when fewer than 3 paired logs', () => {
    const logs = [
      makeLog('2026-01-01', { itch_level: 5, sleep_hours: 7 }),
      makeLog('2026-01-02', { itch_level: 6, sleep_hours: 6 }),
    ];
    const r = sleepItchCorrelation(logs);
    expect(r.highSleep).toBeNull();
    expect(r.lowSleep).toBeNull();
  });

  it('returns nulls when logs lack itch_level or sleep_hours', () => {
    const logs = [
      makeLog('2026-01-01', { itch_level: 5, sleep_hours: null }),
      makeLog('2026-01-02', { itch_level: null, sleep_hours: 7 }),
      makeLog('2026-01-03'),
    ];
    const r = sleepItchCorrelation(logs);
    expect(r.highSleep).toBeNull();
    expect(r.lowSleep).toBeNull();
  });

  it('splits logs at the 7-hour boundary: >= 7 = high, < 7 = low', () => {
    const logs = [
      makeLog('2026-01-01', { itch_level: 2, sleep_hours: 8 }),  // high
      makeLog('2026-01-02', { itch_level: 4, sleep_hours: 7 }),  // high
      makeLog('2026-01-03', { itch_level: 8, sleep_hours: 5 }),  // low
    ];
    const r = sleepItchCorrelation(logs);
    expect(r.highSleep).not.toBeNull();
    expect(r.lowSleep).not.toBeNull();
    expect(r.highSleep!.count).toBe(2);
    expect(r.lowSleep!.count).toBe(1);
    expect(r.highSleep!.avgItch).toBeCloseTo(3);
    expect(r.lowSleep!.avgItch).toBeCloseTo(8);
  });

  it('returns null for the group with no members', () => {
    // All logs are high-sleep; no low-sleep entries
    const logs = [
      makeLog('2026-01-01', { itch_level: 3, sleep_hours: 8 }),
      makeLog('2026-01-02', { itch_level: 5, sleep_hours: 9 }),
      makeLog('2026-01-03', { itch_level: 4, sleep_hours: 7 }),
    ];
    const r = sleepItchCorrelation(logs);
    expect(r.highSleep).not.toBeNull();
    expect(r.lowSleep).toBeNull();
  });

  it('ignores logs that are missing itch_level or sleep_hours from averages', () => {
    const logs = [
      makeLog('2026-01-01', { itch_level: 2, sleep_hours: 8 }),
      makeLog('2026-01-02', { itch_level: 6, sleep_hours: 8 }),
      makeLog('2026-01-03', { itch_level: 8, sleep_hours: 5 }),
      makeLog('2026-01-04', { itch_level: null, sleep_hours: 8 }), // unpaired, excluded
    ];
    const r = sleepItchCorrelation(logs);
    // high group: day1 (itch=2) + day2 (itch=6) only; day4 excluded
    expect(r.highSleep!.count).toBe(2);
    expect(r.highSleep!.avgItch).toBeCloseTo(4);
  });
});

// ---------------------------------------------------------------------------
// calculateStreak  (requires date mocking)
// ---------------------------------------------------------------------------

describe('calculateStreak', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FAKE_TODAY);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns 0 for empty logs', () => {
    expect(calculateStreak([])).toBe(0);
  });

  it('returns 0 when no log on today or yesterday', () => {
    const logs = [makeLog('2026-04-10')]; // 7 days ago
    expect(calculateStreak(logs)).toBe(0);
  });

  it('counts a streak starting from today', () => {
    const logs = [
      makeLog('2026-04-17'), // today
      makeLog('2026-04-16'),
      makeLog('2026-04-15'),
    ];
    expect(calculateStreak(logs)).toBe(3);
  });

  it('allows today to be missing (skip-today behaviour)', () => {
    // Today not logged, but yesterday and 2 days ago are
    const logs = [
      makeLog('2026-04-16'),
      makeLog('2026-04-15'),
    ];
    expect(calculateStreak(logs)).toBe(2);
  });

  it('returns 0 if only gap days exist when today is not logged', () => {
    // Yesterday not logged either, so streak breaks immediately
    const logs = [makeLog('2026-04-15')]; // 2 days ago, yesterday missing
    expect(calculateStreak(logs)).toBe(0);
  });

  it('stops counting at a gap', () => {
    const logs = [
      makeLog('2026-04-17'), // today
      makeLog('2026-04-16'),
      // 2026-04-15 missing — gap
      makeLog('2026-04-14'),
      makeLog('2026-04-13'),
    ];
    expect(calculateStreak(logs)).toBe(2);
  });

  it('returns 1 for only today logged', () => {
    const logs = [makeLog('2026-04-17')];
    expect(calculateStreak(logs)).toBe(1);
  });

  it('returns 1 for only yesterday logged (today skipped)', () => {
    const logs = [makeLog('2026-04-16')];
    expect(calculateStreak(logs)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// buildTrendSeries  (requires date mocking)
// ---------------------------------------------------------------------------

describe('buildTrendSeries', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FAKE_TODAY);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns exactly `days` points', () => {
    expect(buildTrendSeries([], 7)).toHaveLength(7);
    expect(buildTrendSeries([], 14)).toHaveLength(14);
    expect(buildTrendSeries([], 30)).toHaveLength(30);
  });

  it('last point is always today', () => {
    const series = buildTrendSeries([], 7);
    expect(series[series.length - 1]?.date).toBe('2026-04-17');
  });

  it('first point is (today - days + 1)', () => {
    const series = buildTrendSeries([], 7);
    expect(series[0]?.date).toBe('2026-04-11');
  });

  it('fills null itch and sleep for dates with no log', () => {
    const series = buildTrendSeries([], 3);
    for (const p of series) {
      expect(p.itch).toBeNull();
      expect(p.sleep).toBeNull();
    }
  });

  it('populates itch and sleep from matching logs', () => {
    const logs = [
      makeLog('2026-04-17', { itch_level: 5, sleep_hours: 7 }),
      makeLog('2026-04-16', { itch_level: 3, sleep_hours: 6 }),
    ];
    const series = buildTrendSeries(logs, 3);
    const today = series.find((p) => p.date === '2026-04-17');
    const yesterday = series.find((p) => p.date === '2026-04-16');
    expect(today?.itch).toBe(5);
    expect(today?.sleep).toBe(7);
    expect(yesterday?.itch).toBe(3);
    expect(yesterday?.sleep).toBe(6);
  });

  it('coerces sleep_hours to number', () => {
    // sleep_hours is Decimal in DB — may come through as string
    const logs = [makeLog('2026-04-17', { sleep_hours: '7.5' as unknown as number })];
    const series = buildTrendSeries(logs, 1);
    expect(series[0]?.sleep).toBe(7.5);
  });

  it('leaves itch null when only sleep is recorded', () => {
    const logs = [makeLog('2026-04-17', { sleep_hours: 8 })];
    const series = buildTrendSeries(logs, 1);
    expect(series[0]?.itch).toBeNull();
    expect(series[0]?.sleep).toBe(8);
  });

  it('dates are in ascending order', () => {
    const series = buildTrendSeries([], 7);
    for (let i = 1; i < series.length; i++) {
      expect(series[i]!.date > series[i - 1]!.date).toBe(true);
    }
  });
});
