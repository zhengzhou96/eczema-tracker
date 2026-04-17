import { describe, it, expect } from 'vitest';
import { getFindings } from '@/lib/insights/engine';

describe('getFindings', () => {
  it('returns empty array when given fewer than 3 logs', () => {
    expect(getFindings([], [])).toEqual([]);
    expect(getFindings([{ log_date: '2026-01-01', skin_status: 'flare', quick_tags: ['stress'], stress_level: 8, itch_level: 7 }], [])).toEqual([]);
    expect(
      getFindings(
        [
          { log_date: '2026-01-01', skin_status: 'flare', quick_tags: [], stress_level: 5, itch_level: 5 },
          { log_date: '2026-01-02', skin_status: 'mild', quick_tags: [], stress_level: 4, itch_level: 4 },
        ],
        []
      )
    ).toEqual([]);
  });

  it('returns findings when given sufficient logs', () => {
    const logs = [
      { log_date: '2026-01-01', skin_status: 'clear' as const, quick_tags: [], stress_level: 2, itch_level: 1 },
      { log_date: '2026-01-02', skin_status: 'clear' as const, quick_tags: [], stress_level: 2, itch_level: 1 },
      { log_date: '2026-01-03', skin_status: 'clear' as const, quick_tags: [], stress_level: 2, itch_level: 1 },
    ];
    const findings = getFindings(logs, []);
    expect(Array.isArray(findings)).toBe(true);
    expect(findings.some((f) => f.rule === 'clear_streak')).toBe(true);
  });
});
