export type SkinStatus = 'clear' | 'mild' | 'flare';

export interface InsightLog {
  log_date: string;
  skin_status: SkinStatus | null;
  quick_tags: string[];
  stress_level: number | null;
  itch_level: number | null;
}

export interface InsightFood {
  food_name: string;
  log_date: string;
}

export type FindingRule =
  | 'stress_flare'
  | 'sleep_flare'
  | 'food_flare'
  | 'frequent_flares'
  | 'clear_streak';

export type Confidence = 'possible' | 'likely' | 'strong';

export interface Finding {
  rule: FindingRule;
  confidence: Confidence;
  matchCount: number;
  supportingData?: string;
}

export type PredictionState = 'elevated' | 'stable' | 'neutral';

function confidenceFromCount(count: number): Confidence {
  if (count >= 6) return 'strong';
  if (count >= 4) return 'likely';
  return 'possible';
}

export function getFindings(logs: InsightLog[], foods: InsightFood[]): Finding[] {
  if (logs.length < 3) return [];

  const sorted = [...logs].sort((a, b) => a.log_date.localeCompare(b.log_date));
  const findings: Finding[] = [];

  // stress_flare: stress tag on day N, flare within 1 day
  let stressFlareCount = 0;
  for (let i = 0; i < sorted.length; i++) {
    const log = sorted[i]!;
    if (!log.quick_tags.includes('stress')) continue;
    const nextDay = sorted[i + 1];
    const sameOrNext =
      log.skin_status === 'flare' ||
      (nextDay && nextDay.skin_status === 'flare');
    if (sameOrNext) stressFlareCount++;
  }
  if (stressFlareCount >= 2) {
    findings.push({
      rule: 'stress_flare',
      confidence: confidenceFromCount(stressFlareCount),
      matchCount: stressFlareCount,
    });
  }

  // sleep_flare: poor_sleep tag on day N, flare within 1 day
  let sleepFlareCount = 0;
  for (let i = 0; i < sorted.length; i++) {
    const log = sorted[i]!;
    if (!log.quick_tags.includes('poor_sleep')) continue;
    const nextDay = sorted[i + 1];
    const sameOrNext =
      log.skin_status === 'flare' ||
      (nextDay && nextDay.skin_status === 'flare');
    if (sameOrNext) sleepFlareCount++;
  }
  if (sleepFlareCount >= 2) {
    findings.push({
      rule: 'sleep_flare',
      confidence: confidenceFromCount(sleepFlareCount),
      matchCount: sleepFlareCount,
    });
  }

  // food_flare: food tag + same food_name appears before flare repeatedly
  const foodsByDate = new Map<string, string[]>();
  for (const f of foods) {
    const existing = foodsByDate.get(f.log_date) ?? [];
    existing.push(f.food_name.toLowerCase());
    foodsByDate.set(f.log_date, existing);
  }
  const foodFlareCounts = new Map<string, number>();
  for (let i = 0; i < sorted.length; i++) {
    const log = sorted[i]!;
    if (!log.quick_tags.includes('food')) continue;
    const nextDay = sorted[i + 1];
    const followedByFlare =
      log.skin_status === 'flare' ||
      (nextDay && nextDay.skin_status === 'flare');
    if (!followedByFlare) continue;
    const dayFoods = foodsByDate.get(log.log_date) ?? [];
    for (const food of dayFoods) {
      foodFlareCounts.set(food, (foodFlareCounts.get(food) ?? 0) + 1);
    }
  }
  let topFood: string | null = null;
  let topFoodCount = 0;
  for (const [food, count] of foodFlareCounts) {
    if (count > topFoodCount) {
      topFood = food;
      topFoodCount = count;
    }
  }
  if (topFood && topFoodCount >= 2) {
    findings.push({
      rule: 'food_flare',
      confidence: confidenceFromCount(topFoodCount),
      matchCount: topFoodCount,
      supportingData: `${topFood} appeared before ${topFoodCount} flares`,
    });
  }

  // frequent_flares: 3+ flare days within any 7-day window
  let maxConsecutive = 0;
  const windowSize = 7;
  for (let i = 0; i < sorted.length; i++) {
    const windowFlares = sorted
      .slice(Math.max(0, i - windowSize + 1), i + 1)
      .filter((l) => l.skin_status === 'flare').length;
    if (windowFlares > maxConsecutive) maxConsecutive = windowFlares;
  }
  if (maxConsecutive >= 3) {
    findings.push({
      rule: 'frequent_flares',
      confidence: confidenceFromCount(maxConsecutive),
      matchCount: maxConsecutive,
      supportingData: `${maxConsecutive} flares within 7 days`,
    });
  }

  // clear_streak: 3+ clear days in a row
  let maxClearStreak = 0;
  let currentClear = 0;
  for (const log of sorted) {
    if (log.skin_status === 'clear') {
      currentClear++;
      if (currentClear > maxClearStreak) maxClearStreak = currentClear;
    } else {
      currentClear = 0;
    }
  }
  if (maxClearStreak >= 3) {
    findings.push({
      rule: 'clear_streak',
      confidence: confidenceFromCount(maxClearStreak),
      matchCount: maxClearStreak,
    });
  }

  return findings;
}

export function getPrediction(logs: InsightLog[]): PredictionState {
  if (logs.length < 2) return 'neutral';
  const sorted = [...logs].sort((a, b) => b.log_date.localeCompare(a.log_date));
  const last2 = sorted.slice(0, 2);
  const allFlare = last2.every((l) => l.skin_status === 'flare');
  const stressRecent = last2.some(
    (l) => l.quick_tags.includes('stress') && l.skin_status !== 'clear'
  );
  if (allFlare || stressRecent) return 'elevated';
  const allClear = last2.every((l) => l.skin_status === 'clear');
  if (allClear) return 'stable';
  return 'neutral';
}
