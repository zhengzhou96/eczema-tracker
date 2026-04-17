import { describe, it, expect } from 'vitest';
import {
  getFindings,
  getPrediction,
  type InsightLog,
  type InsightFood,
  type Finding,
} from '@/lib/insights/engine';

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

function makeLog(
  log_date: string,
  skin_status: InsightLog['skin_status'],
  quick_tags: string[] = [],
  stress_level: number | null = null,
  itch_level: number | null = null
): InsightLog {
  return { log_date, skin_status, quick_tags, stress_level, itch_level };
}

function makeFood(food_name: string, log_date: string): InsightFood {
  return { food_name, log_date };
}

/** Pad a base date by N days; base is ISO string like '2026-01-01'. */
function addDays(base: string, n: number): string {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Build N consecutive dates starting from base. */
function dateRange(base: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => addDays(base, i));
}

// ---------------------------------------------------------------------------
// Helper assertions
// ---------------------------------------------------------------------------

function findingFor(findings: Finding[], rule: Finding['rule']): Finding | undefined {
  return findings.find((f) => f.rule === rule);
}

// ---------------------------------------------------------------------------
// getFindings
// ---------------------------------------------------------------------------

describe('getFindings', () => {
  // -------------------------------------------------------------------------
  // Edge cases — minimum log count
  // -------------------------------------------------------------------------
  describe('minimum log count guard', () => {
    it('returns [] for 0 logs', () => {
      expect(getFindings([], [])).toEqual([]);
    });

    it('returns [] for 1 log', () => {
      const logs = [makeLog('2026-01-01', 'flare', ['stress'])];
      expect(getFindings(logs, [])).toEqual([]);
    });

    it('returns [] for 2 logs', () => {
      const logs = [
        makeLog('2026-01-01', 'flare', ['stress']),
        makeLog('2026-01-02', 'flare', ['stress']),
      ];
      expect(getFindings(logs, [])).toEqual([]);
    });

    it('returns [] for 3 logs with no rule matches', () => {
      const logs = [
        makeLog('2026-01-01', 'mild'),
        makeLog('2026-01-02', 'mild'),
        makeLog('2026-01-03', 'mild'),
      ];
      expect(getFindings(logs, [])).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // stress_flare rule
  // -------------------------------------------------------------------------
  describe('stress_flare rule', () => {
    it('does NOT fire for exactly 1 stress+flare match', () => {
      const logs = [
        makeLog('2026-01-01', 'flare', ['stress']),
        makeLog('2026-01-02', 'mild'),
        makeLog('2026-01-03', 'mild'),
      ];
      expect(findingFor(getFindings(logs, []), 'stress_flare')).toBeUndefined();
    });

    it('fires with confidence=possible for exactly 2 matches', () => {
      const logs = [
        makeLog('2026-01-01', 'flare', ['stress']),
        makeLog('2026-01-02', 'mild'),
        makeLog('2026-01-03', 'flare', ['stress']),
        makeLog('2026-01-04', 'mild'),
      ];
      const f = findingFor(getFindings(logs, []), 'stress_flare');
      expect(f).toBeDefined();
      expect(f!.confidence).toBe('possible');
      expect(f!.matchCount).toBe(2);
    });

    it('fires with confidence=likely for exactly 4 matches', () => {
      const dates = dateRange('2026-01-01', 8);
      const logs = dates.map((d, i) =>
        i % 2 === 0 ? makeLog(d, 'flare', ['stress']) : makeLog(d, 'mild')
      );
      const f = findingFor(getFindings(logs, []), 'stress_flare');
      expect(f).toBeDefined();
      expect(f!.confidence).toBe('likely');
      expect(f!.matchCount).toBe(4);
    });

    it('fires with confidence=strong for exactly 6 matches', () => {
      const dates = dateRange('2026-01-01', 12);
      const logs = dates.map((d, i) =>
        i % 2 === 0 ? makeLog(d, 'flare', ['stress']) : makeLog(d, 'mild')
      );
      const f = findingFor(getFindings(logs, []), 'stress_flare');
      expect(f).toBeDefined();
      expect(f!.confidence).toBe('strong');
      expect(f!.matchCount).toBe(6);
    });

    it('counts same-day stress+flare (day N has stress and flare)', () => {
      const logs = [
        makeLog('2026-01-01', 'flare', ['stress']),
        makeLog('2026-01-02', 'clear'),
        makeLog('2026-01-03', 'flare', ['stress']),
      ];
      const f = findingFor(getFindings(logs, []), 'stress_flare');
      expect(f).toBeDefined();
      expect(f!.matchCount).toBe(2);
    });

    it('counts stress on day N followed by flare on day N+1 (next element)', () => {
      const logs = [
        makeLog('2026-01-01', 'mild', ['stress']),
        makeLog('2026-01-02', 'flare'),
        makeLog('2026-01-03', 'mild', ['stress']),
        makeLog('2026-01-04', 'flare'),
      ];
      const f = findingFor(getFindings(logs, []), 'stress_flare');
      expect(f).toBeDefined();
      expect(f!.matchCount).toBe(2);
    });

    it('does NOT count stress on day N when flare is 2 elements away', () => {
      // stress on day 1, no flare on day 1 or day 2; flare on day 3
      const logs = [
        makeLog('2026-01-01', 'mild', ['stress']),
        makeLog('2026-01-02', 'mild'),
        makeLog('2026-01-03', 'flare'),
        makeLog('2026-01-04', 'mild', ['stress']),
        makeLog('2026-01-05', 'mild'),
        makeLog('2026-01-06', 'flare'),
      ];
      expect(findingFor(getFindings(logs, []), 'stress_flare')).toBeUndefined();
    });

    it('does NOT fire when stress tag present but no flares at all', () => {
      const logs = [
        makeLog('2026-01-01', 'mild', ['stress']),
        makeLog('2026-01-02', 'mild', ['stress']),
        makeLog('2026-01-03', 'clear', ['stress']),
      ];
      expect(findingFor(getFindings(logs, []), 'stress_flare')).toBeUndefined();
    });

    it('sorts logs by date before evaluating (unsorted input)', () => {
      // Provide logs out of order; after sorting day1=stress, day2=flare x2
      const logs = [
        makeLog('2026-01-03', 'flare', ['stress']),
        makeLog('2026-01-01', 'mild', ['stress']),
        makeLog('2026-01-02', 'flare'),
        makeLog('2026-01-04', 'flare'),
      ];
      const f = findingFor(getFindings(logs, []), 'stress_flare');
      expect(f).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // sleep_flare rule
  // -------------------------------------------------------------------------
  describe('sleep_flare rule', () => {
    it('does NOT fire for exactly 1 poor_sleep+flare match', () => {
      const logs = [
        makeLog('2026-01-01', 'flare', ['poor_sleep']),
        makeLog('2026-01-02', 'mild'),
        makeLog('2026-01-03', 'mild'),
      ];
      expect(findingFor(getFindings(logs, []), 'sleep_flare')).toBeUndefined();
    });

    it('fires with confidence=possible for exactly 2 matches', () => {
      const logs = [
        makeLog('2026-01-01', 'flare', ['poor_sleep']),
        makeLog('2026-01-02', 'mild'),
        makeLog('2026-01-03', 'flare', ['poor_sleep']),
        makeLog('2026-01-04', 'mild'),
      ];
      const f = findingFor(getFindings(logs, []), 'sleep_flare');
      expect(f).toBeDefined();
      expect(f!.confidence).toBe('possible');
      expect(f!.matchCount).toBe(2);
    });

    it('fires with confidence=likely for exactly 4 matches', () => {
      const dates = dateRange('2026-01-01', 8);
      const logs = dates.map((d, i) =>
        i % 2 === 0 ? makeLog(d, 'flare', ['poor_sleep']) : makeLog(d, 'mild')
      );
      const f = findingFor(getFindings(logs, []), 'sleep_flare');
      expect(f).toBeDefined();
      expect(f!.confidence).toBe('likely');
      expect(f!.matchCount).toBe(4);
    });

    it('fires with confidence=strong for exactly 6 matches', () => {
      const dates = dateRange('2026-01-01', 12);
      const logs = dates.map((d, i) =>
        i % 2 === 0 ? makeLog(d, 'flare', ['poor_sleep']) : makeLog(d, 'mild')
      );
      const f = findingFor(getFindings(logs, []), 'sleep_flare');
      expect(f).toBeDefined();
      expect(f!.confidence).toBe('strong');
      expect(f!.matchCount).toBe(6);
    });

    it('counts same-day poor_sleep+flare', () => {
      const logs = [
        makeLog('2026-01-01', 'flare', ['poor_sleep']),
        makeLog('2026-01-02', 'clear'),
        makeLog('2026-01-03', 'flare', ['poor_sleep']),
      ];
      const f = findingFor(getFindings(logs, []), 'sleep_flare');
      expect(f).toBeDefined();
      expect(f!.matchCount).toBe(2);
    });

    it('counts poor_sleep on day N followed by flare on next element', () => {
      const logs = [
        makeLog('2026-01-01', 'mild', ['poor_sleep']),
        makeLog('2026-01-02', 'flare'),
        makeLog('2026-01-03', 'mild', ['poor_sleep']),
        makeLog('2026-01-04', 'flare'),
      ];
      const f = findingFor(getFindings(logs, []), 'sleep_flare');
      expect(f).toBeDefined();
      expect(f!.matchCount).toBe(2);
    });

    it('does NOT count poor_sleep when flare is 2 elements away', () => {
      const logs = [
        makeLog('2026-01-01', 'mild', ['poor_sleep']),
        makeLog('2026-01-02', 'mild'),
        makeLog('2026-01-03', 'flare'),
        makeLog('2026-01-04', 'mild', ['poor_sleep']),
        makeLog('2026-01-05', 'mild'),
        makeLog('2026-01-06', 'flare'),
      ];
      expect(findingFor(getFindings(logs, []), 'sleep_flare')).toBeUndefined();
    });

    it('does NOT fire when poor_sleep tag present but no flares', () => {
      const logs = [
        makeLog('2026-01-01', 'mild', ['poor_sleep']),
        makeLog('2026-01-02', 'mild', ['poor_sleep']),
        makeLog('2026-01-03', 'clear', ['poor_sleep']),
      ];
      expect(findingFor(getFindings(logs, []), 'sleep_flare')).toBeUndefined();
    });

    it('does not confuse poor_sleep with stress tag', () => {
      // stress fires but poor_sleep should not
      const logs = [
        makeLog('2026-01-01', 'flare', ['stress']),
        makeLog('2026-01-02', 'mild'),
        makeLog('2026-01-03', 'flare', ['stress']),
      ];
      expect(findingFor(getFindings(logs, []), 'sleep_flare')).toBeUndefined();
      expect(findingFor(getFindings(logs, []), 'stress_flare')).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // food_flare rule
  // -------------------------------------------------------------------------
  describe('food_flare rule', () => {
    it('does NOT fire for exactly 1 food+flare occurrence', () => {
      const logs = [
        makeLog('2026-01-01', 'flare', ['food']),
        makeLog('2026-01-02', 'mild'),
        makeLog('2026-01-03', 'mild'),
      ];
      const foods = [makeFood('dairy', '2026-01-01')];
      expect(findingFor(getFindings(logs, foods), 'food_flare')).toBeUndefined();
    });

    it('fires with confidence=possible for 2 occurrences of the same food before flare', () => {
      const logs = [
        makeLog('2026-01-01', 'flare', ['food']),
        makeLog('2026-01-02', 'mild'),
        makeLog('2026-01-03', 'flare', ['food']),
        makeLog('2026-01-04', 'mild'),
      ];
      const foods = [makeFood('dairy', '2026-01-01'), makeFood('dairy', '2026-01-03')];
      const f = findingFor(getFindings(logs, foods), 'food_flare');
      expect(f).toBeDefined();
      expect(f!.confidence).toBe('possible');
      expect(f!.matchCount).toBe(2);
    });

    it('fires with confidence=likely for 4 occurrences', () => {
      const dates = dateRange('2026-01-01', 8);
      const logs = dates.map((d, i) =>
        i % 2 === 0 ? makeLog(d, 'flare', ['food']) : makeLog(d, 'mild')
      );
      const foods = dates.filter((_, i) => i % 2 === 0).map((d) => makeFood('eggs', d));
      const f = findingFor(getFindings(logs, foods), 'food_flare');
      expect(f).toBeDefined();
      expect(f!.confidence).toBe('likely');
      expect(f!.matchCount).toBe(4);
    });

    it('fires with confidence=strong for 6 occurrences', () => {
      const dates = dateRange('2026-01-01', 12);
      const logs = dates.map((d, i) =>
        i % 2 === 0 ? makeLog(d, 'flare', ['food']) : makeLog(d, 'mild')
      );
      const foods = dates.filter((_, i) => i % 2 === 0).map((d) => makeFood('gluten', d));
      const f = findingFor(getFindings(logs, foods), 'food_flare');
      expect(f).toBeDefined();
      expect(f!.confidence).toBe('strong');
      expect(f!.matchCount).toBe(6);
    });

    it('normalises food names to lowercase (Dairy == dairy)', () => {
      const logs = [
        makeLog('2026-01-01', 'flare', ['food']),
        makeLog('2026-01-02', 'mild'),
        makeLog('2026-01-03', 'flare', ['food']),
        makeLog('2026-01-04', 'mild'),
      ];
      const foods = [makeFood('Dairy', '2026-01-01'), makeFood('dairy', '2026-01-03')];
      const f = findingFor(getFindings(logs, foods), 'food_flare');
      expect(f).toBeDefined();
      expect(f!.matchCount).toBe(2);
      expect(f!.supportingData).toContain('dairy');
    });

    it('picks the food with the highest flare correlation (topFood)', () => {
      const logs = [
        makeLog('2026-01-01', 'flare', ['food']),
        makeLog('2026-01-02', 'mild'),
        makeLog('2026-01-03', 'flare', ['food']),
        makeLog('2026-01-04', 'mild'),
        makeLog('2026-01-05', 'flare', ['food']),
        makeLog('2026-01-06', 'mild'),
      ];
      // eggs appears 3 times, dairy appears 2 times
      const foods = [
        makeFood('eggs', '2026-01-01'),
        makeFood('dairy', '2026-01-01'),
        makeFood('eggs', '2026-01-03'),
        makeFood('dairy', '2026-01-03'),
        makeFood('eggs', '2026-01-05'),
      ];
      const f = findingFor(getFindings(logs, foods), 'food_flare');
      expect(f).toBeDefined();
      expect(f!.supportingData).toContain('eggs');
      expect(f!.matchCount).toBe(3);
    });

    it('does NOT fire when food tag present but no food entries', () => {
      const logs = [
        makeLog('2026-01-01', 'flare', ['food']),
        makeLog('2026-01-02', 'mild'),
        makeLog('2026-01-03', 'flare', ['food']),
      ];
      expect(findingFor(getFindings(logs, []), 'food_flare')).toBeUndefined();
    });

    it('does NOT fire when food entries exist but no food tag on logs', () => {
      const logs = [
        makeLog('2026-01-01', 'flare'),
        makeLog('2026-01-02', 'mild'),
        makeLog('2026-01-03', 'flare'),
      ];
      const foods = [makeFood('dairy', '2026-01-01'), makeFood('dairy', '2026-01-03')];
      expect(findingFor(getFindings(logs, foods), 'food_flare')).toBeUndefined();
    });

    it('does NOT fire when food tag + food entries exist but no flare follows', () => {
      const logs = [
        makeLog('2026-01-01', 'mild', ['food']),
        makeLog('2026-01-02', 'clear'),
        makeLog('2026-01-03', 'mild', ['food']),
      ];
      const foods = [makeFood('dairy', '2026-01-01'), makeFood('dairy', '2026-01-03')];
      expect(findingFor(getFindings(logs, foods), 'food_flare')).toBeUndefined();
    });

    it('counts food tag on day N when flare is on same day (N)', () => {
      const logs = [
        makeLog('2026-01-01', 'flare', ['food']),
        makeLog('2026-01-02', 'mild'),
        makeLog('2026-01-03', 'flare', ['food']),
        makeLog('2026-01-04', 'mild'),
      ];
      const foods = [makeFood('nuts', '2026-01-01'), makeFood('nuts', '2026-01-03')];
      const f = findingFor(getFindings(logs, foods), 'food_flare');
      expect(f).toBeDefined();
      expect(f!.matchCount).toBe(2);
    });

    it('counts food tag on day N when flare is on next element (N+1)', () => {
      const logs = [
        makeLog('2026-01-01', 'mild', ['food']),
        makeLog('2026-01-02', 'flare'),
        makeLog('2026-01-03', 'mild', ['food']),
        makeLog('2026-01-04', 'flare'),
      ];
      const foods = [makeFood('soy', '2026-01-01'), makeFood('soy', '2026-01-03')];
      const f = findingFor(getFindings(logs, foods), 'food_flare');
      expect(f).toBeDefined();
      expect(f!.matchCount).toBe(2);
    });

    it('supportingData contains the food name and flare count', () => {
      const logs = [
        makeLog('2026-01-01', 'flare', ['food']),
        makeLog('2026-01-02', 'mild'),
        makeLog('2026-01-03', 'flare', ['food']),
        makeLog('2026-01-04', 'mild'),
      ];
      const foods = [makeFood('shellfish', '2026-01-01'), makeFood('shellfish', '2026-01-03')];
      const f = findingFor(getFindings(logs, foods), 'food_flare');
      expect(f!.supportingData).toBe('shellfish appeared before 2 flares');
    });
  });

  // -------------------------------------------------------------------------
  // frequent_flares rule
  // -------------------------------------------------------------------------
  describe('frequent_flares rule', () => {
    it('does NOT fire for 2 flares in a window of 7 elements', () => {
      const dates = dateRange('2026-01-01', 7);
      const logs = dates.map((d, i) =>
        i < 2 ? makeLog(d, 'flare') : makeLog(d, 'mild')
      );
      expect(findingFor(getFindings(logs, []), 'frequent_flares')).toBeUndefined();
    });

    it('fires with confidence=possible for exactly 3 flares in a 7-element window', () => {
      const dates = dateRange('2026-01-01', 7);
      const logs = dates.map((d, i) =>
        i < 3 ? makeLog(d, 'flare') : makeLog(d, 'mild')
      );
      const f = findingFor(getFindings(logs, []), 'frequent_flares');
      expect(f).toBeDefined();
      expect(f!.confidence).toBe('possible');
      expect(f!.matchCount).toBe(3);
    });

    it('fires with confidence=likely for 4 flares in a 7-element window', () => {
      const dates = dateRange('2026-01-01', 7);
      const logs = dates.map((d, i) =>
        i < 4 ? makeLog(d, 'flare') : makeLog(d, 'mild')
      );
      const f = findingFor(getFindings(logs, []), 'frequent_flares');
      expect(f).toBeDefined();
      expect(f!.confidence).toBe('likely');
      expect(f!.matchCount).toBe(4);
    });

    it('fires with confidence=strong for 6 flares in a 7-element window', () => {
      const dates = dateRange('2026-01-01', 7);
      const logs = dates.map((d, i) =>
        i < 6 ? makeLog(d, 'flare') : makeLog(d, 'mild')
      );
      const f = findingFor(getFindings(logs, []), 'frequent_flares');
      expect(f).toBeDefined();
      expect(f!.confidence).toBe('strong');
      expect(f!.matchCount).toBe(6);
    });

    it('sliding window: 3 flares spread across 8 elements but within a 7-element span', () => {
      // elements 0-6 contain 3 flares: indices 0, 3, 6
      const dates = dateRange('2026-01-01', 8);
      const logs = dates.map((d, i) =>
        [0, 3, 6].includes(i) ? makeLog(d, 'flare') : makeLog(d, 'mild')
      );
      const f = findingFor(getFindings(logs, []), 'frequent_flares');
      expect(f).toBeDefined();
      expect(f!.matchCount).toBe(3);
    });

    it('does NOT fire when 3 flares are separated by more than 7 elements', () => {
      // flares at positions 0, 4, 9 — no 7-element window contains all 3
      const dates = dateRange('2026-01-01', 12);
      const flarePosns = new Set([0, 4, 9]);
      const logs = dates.map((d, i) =>
        flarePosns.has(i) ? makeLog(d, 'flare') : makeLog(d, 'mild')
      );
      // max within any window of 7 is 2, so should not fire
      expect(findingFor(getFindings(logs, []), 'frequent_flares')).toBeUndefined();
    });

    it('supportingData contains the flare count', () => {
      const dates = dateRange('2026-01-01', 7);
      const logs = dates.map((d, i) =>
        i < 3 ? makeLog(d, 'flare') : makeLog(d, 'mild')
      );
      const f = findingFor(getFindings(logs, []), 'frequent_flares');
      expect(f!.supportingData).toBe('3 flares within 7 days');
    });

    it('null skin_status days do not count as flares in window', () => {
      const dates = dateRange('2026-01-01', 7);
      const logs = dates.map((d, i) =>
        i < 2 ? makeLog(d, 'flare') : makeLog(d, null)
      );
      expect(findingFor(getFindings(logs, []), 'frequent_flares')).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // clear_streak rule
  // -------------------------------------------------------------------------
  describe('clear_streak rule', () => {
    it('does NOT fire for exactly 2 consecutive clear days', () => {
      const logs = [
        makeLog('2026-01-01', 'clear'),
        makeLog('2026-01-02', 'clear'),
        makeLog('2026-01-03', 'flare'),
      ];
      expect(findingFor(getFindings(logs, []), 'clear_streak')).toBeUndefined();
    });

    it('fires with confidence=possible for exactly 3 consecutive clear days', () => {
      const logs = [
        makeLog('2026-01-01', 'clear'),
        makeLog('2026-01-02', 'clear'),
        makeLog('2026-01-03', 'clear'),
      ];
      const f = findingFor(getFindings(logs, []), 'clear_streak');
      expect(f).toBeDefined();
      expect(f!.confidence).toBe('possible');
      expect(f!.matchCount).toBe(3);
    });

    it('fires with confidence=likely for exactly 4 consecutive clear days', () => {
      const dates = dateRange('2026-01-01', 4);
      const logs = dates.map((d) => makeLog(d, 'clear'));
      const f = findingFor(getFindings(logs, []), 'clear_streak');
      expect(f).toBeDefined();
      expect(f!.confidence).toBe('likely');
      expect(f!.matchCount).toBe(4);
    });

    it('fires with confidence=strong for exactly 6 consecutive clear days', () => {
      const dates = dateRange('2026-01-01', 6);
      const logs = dates.map((d) => makeLog(d, 'clear'));
      const f = findingFor(getFindings(logs, []), 'clear_streak');
      expect(f).toBeDefined();
      expect(f!.confidence).toBe('strong');
      expect(f!.matchCount).toBe(6);
    });

    it('resets streak when broken by mild', () => {
      // 2 clear, 1 mild, 3 clear — only streak of 3 should count
      const logs = [
        makeLog('2026-01-01', 'clear'),
        makeLog('2026-01-02', 'clear'),
        makeLog('2026-01-03', 'mild'),
        makeLog('2026-01-04', 'clear'),
        makeLog('2026-01-05', 'clear'),
        makeLog('2026-01-06', 'clear'),
      ];
      const f = findingFor(getFindings(logs, []), 'clear_streak');
      expect(f).toBeDefined();
      expect(f!.matchCount).toBe(3);
    });

    it('resets streak when broken by flare', () => {
      const logs = [
        makeLog('2026-01-01', 'clear'),
        makeLog('2026-01-02', 'clear'),
        makeLog('2026-01-03', 'flare'),
        makeLog('2026-01-04', 'clear'),
        makeLog('2026-01-05', 'clear'),
        makeLog('2026-01-06', 'clear'),
      ];
      const f = findingFor(getFindings(logs, []), 'clear_streak');
      expect(f).toBeDefined();
      expect(f!.matchCount).toBe(3);
    });

    it('resets streak when broken by null skin_status', () => {
      const logs = [
        makeLog('2026-01-01', 'clear'),
        makeLog('2026-01-02', 'clear'),
        makeLog('2026-01-03', null),
        makeLog('2026-01-04', 'clear'),
        makeLog('2026-01-05', 'clear'),
        makeLog('2026-01-06', 'clear'),
      ];
      const f = findingFor(getFindings(logs, []), 'clear_streak');
      expect(f).toBeDefined();
      expect(f!.matchCount).toBe(3);
    });

    it('finds the streak even when it occurs at the end of the log array', () => {
      const logs = [
        makeLog('2026-01-01', 'flare'),
        makeLog('2026-01-02', 'mild'),
        makeLog('2026-01-03', 'clear'),
        makeLog('2026-01-04', 'clear'),
        makeLog('2026-01-05', 'clear'),
      ];
      const f = findingFor(getFindings(logs, []), 'clear_streak');
      expect(f).toBeDefined();
      expect(f!.matchCount).toBe(3);
    });

    it('reports the longest streak when multiple streaks exist', () => {
      // streak of 3 then streak of 5
      const logs = [
        makeLog('2026-01-01', 'clear'),
        makeLog('2026-01-02', 'clear'),
        makeLog('2026-01-03', 'clear'),
        makeLog('2026-01-04', 'flare'),
        makeLog('2026-01-05', 'clear'),
        makeLog('2026-01-06', 'clear'),
        makeLog('2026-01-07', 'clear'),
        makeLog('2026-01-08', 'clear'),
        makeLog('2026-01-09', 'clear'),
      ];
      const f = findingFor(getFindings(logs, []), 'clear_streak');
      expect(f!.matchCount).toBe(5);
    });
  });

  // -------------------------------------------------------------------------
  // Multiple rules firing simultaneously
  // -------------------------------------------------------------------------
  describe('multiple rules', () => {
    it('can return multiple distinct findings in the same call', () => {
      // stress+flare x2 AND clear streak x3 AND frequent_flares (3 in window of 7)
      const logs = [
        makeLog('2026-01-01', 'flare', ['stress']),
        makeLog('2026-01-02', 'flare', ['stress']),
        makeLog('2026-01-03', 'flare'),
        makeLog('2026-01-04', 'clear'),
        makeLog('2026-01-05', 'clear'),
        makeLog('2026-01-06', 'clear'),
      ];
      const findings = getFindings(logs, []);
      const rules = findings.map((f) => f.rule);
      expect(rules).toContain('stress_flare');
      expect(rules).toContain('frequent_flares');
      expect(rules).toContain('clear_streak');
    });
  });
});

// ---------------------------------------------------------------------------
// getPrediction
// ---------------------------------------------------------------------------

describe('getPrediction', () => {
  it('returns neutral for 0 logs', () => {
    expect(getPrediction([])).toBe('neutral');
  });

  it('returns neutral for 1 log', () => {
    const logs = [makeLog('2026-01-01', 'flare', ['stress'])];
    expect(getPrediction(logs)).toBe('neutral');
  });

  it('returns elevated when last 2 logs are both flare', () => {
    const logs = [
      makeLog('2026-01-01', 'clear'),
      makeLog('2026-01-02', 'flare'),
      makeLog('2026-01-03', 'flare'),
    ];
    expect(getPrediction(logs)).toBe('elevated');
  });

  it('returns stable when last 2 logs are both clear', () => {
    const logs = [
      makeLog('2026-01-01', 'flare'),
      makeLog('2026-01-02', 'clear'),
      makeLog('2026-01-03', 'clear'),
    ];
    expect(getPrediction(logs)).toBe('stable');
  });

  it('returns elevated when one of last 2 has stress tag and status != clear', () => {
    const logs = [
      makeLog('2026-01-01', 'clear'),
      makeLog('2026-01-02', 'mild', ['stress']),
      makeLog('2026-01-03', 'mild'),
    ];
    expect(getPrediction(logs)).toBe('elevated');
  });

  it('does NOT return elevated when stress tag present but skin_status = clear', () => {
    const logs = [
      makeLog('2026-01-01', 'mild'),
      makeLog('2026-01-02', 'clear', ['stress']),
      makeLog('2026-01-03', 'clear'),
    ];
    expect(getPrediction(logs)).toBe('stable');
  });

  it('returns neutral when last 2 are mixed mild/flare without stress', () => {
    const logs = [
      makeLog('2026-01-01', 'clear'),
      makeLog('2026-01-02', 'mild'),
      makeLog('2026-01-03', 'flare'),
    ];
    // last 2 by date: flare + mild — not allFlare, not stressRecent, not allClear
    expect(getPrediction(logs)).toBe('neutral');
  });

  it('returns neutral when last 2 are mild + clear (no stress)', () => {
    const logs = [
      makeLog('2026-01-01', 'flare'),
      makeLog('2026-01-02', 'mild'),
      makeLog('2026-01-03', 'clear'),
    ];
    expect(getPrediction(logs)).toBe('neutral');
  });

  it('uses the 2 most recent dates (not array order) for unsorted input', () => {
    // Provided out of order; most recent 2 dates are clear
    const logs = [
      makeLog('2026-01-05', 'clear'),
      makeLog('2026-01-01', 'flare'),
      makeLog('2026-01-04', 'clear'),
      makeLog('2026-01-02', 'flare'),
    ];
    expect(getPrediction(logs)).toBe('stable');
  });

  it('elevated takes priority over stable (both flare and clear conditions hypothetically)', () => {
    // allFlare is true → elevated wins before allClear check
    const logs = [
      makeLog('2026-01-01', 'flare'),
      makeLog('2026-01-02', 'flare'),
    ];
    expect(getPrediction(logs)).toBe('elevated');
  });

  it('stress tag on log outside the last 2 does not elevate', () => {
    const logs = [
      makeLog('2026-01-01', 'flare', ['stress']),
      makeLog('2026-01-02', 'clear'),
      makeLog('2026-01-03', 'clear'),
    ];
    expect(getPrediction(logs)).toBe('stable');
  });

  it('returns elevated when stress tag on the most recent log with null status', () => {
    const logs = [
      makeLog('2026-01-01', 'mild'),
      makeLog('2026-01-02', null, ['stress']),
    ];
    // null != 'clear', so stressRecent = true → elevated
    expect(getPrediction(logs)).toBe('elevated');
  });
});
