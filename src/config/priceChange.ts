// AvgPPM threshold boundaries (ascending)
export const AVGPPM_THRESHOLDS = {
  terrible: 0, // below 0.605
  poor: 0.605,
  good: 0.9,
  great: 1.195,
} as const;

// Price tier boundary in millions
export const PRICE_TIER_BOUNDARY = 18.5;

export type PerformanceTier = 'great' | 'good' | 'poor' | 'terrible';

// Price changes per performance tier and price tier (in millions)
const PRICE_CHANGES: Record<'A' | 'B', Record<PerformanceTier, number>> = {
  A: { great: 0.3, good: 0.1, poor: -0.1, terrible: -0.3 },
  B: { great: 0.6, good: 0.2, poor: -0.2, terrible: -0.6 },
};

export interface ThresholdInfo {
  tier: PerformanceTier;
  threshold: number;
  priceChange: number;
  pointsNeeded: number;
}

export interface PriceChangeResult {
  avgPPM: number;
  performanceTier: PerformanceTier;
  priceTier: 'A' | 'B';
  expectedPriceChange: number;
  thresholds: ThresholdInfo[];
}

function getPerformanceTier(avgPPM: number): PerformanceTier {
  if (avgPPM >= AVGPPM_THRESHOLDS.great) return 'great';
  if (avgPPM >= AVGPPM_THRESHOLDS.good) return 'good';
  if (avgPPM >= AVGPPM_THRESHOLDS.poor) return 'poor';
  return 'terrible';
}

function getPriceTier(price: number): 'A' | 'B' {
  return price >= PRICE_TIER_BOUNDARY ? 'A' : 'B';
}

/**
 * Calculates the points needed for each price-change tier in the next race.
 *
 * Uses the last 3 races (or fewer if the season has just started) to compute
 * average points-per-million (AvgPPM). The `thresholds` array contains one
 * entry per performance tier (great / good / poor / terrible) with the exact
 * points needed to land in that tier after the next race.
 *
 * @param currentPrice - Asset price in millions (e.g. `30.0`).
 * @param recentRacesPoints - All race totals for the season, oldest first.
 */
export function calculatePriceChangeThresholds(
  currentPrice: number,
  recentRacesPoints: number[],
): PriceChangeResult {
  const raceCount = recentRacesPoints.length;

  // Last 3 races for current average
  const last3 = recentRacesPoints.slice(-3);
  const sum3 = last3.reduce((a, b) => a + b, 0);
  const avg = raceCount > 0 ? sum3 / last3.length : 0;
  const avgPPM = currentPrice > 0 ? Math.round((avg / currentPrice) * 1000) / 1000 : 0;

  const performanceTier = getPerformanceTier(avgPPM);
  const priceTier = getPriceTier(currentPrice);
  const expectedPriceChange = PRICE_CHANGES[priceTier][performanceTier];

  // For the NEXT race calculation: the window will be last 2 races + the upcoming one
  // (the average always uses the most recent 3 races)
  const windowSize = Math.min(raceCount + 1, 3);
  const last2 = recentRacesPoints.slice(-(windowSize - 1));
  const sumLast2 = last2.reduce((a, b) => a + b, 0);

  const orderedTiers: { tier: PerformanceTier; threshold: number }[] = [
    { tier: 'great', threshold: AVGPPM_THRESHOLDS.great },
    { tier: 'good', threshold: AVGPPM_THRESHOLDS.good },
    { tier: 'poor', threshold: AVGPPM_THRESHOLDS.poor },
    { tier: 'terrible', threshold: AVGPPM_THRESHOLDS.terrible },
  ];

  const thresholds: ThresholdInfo[] = orderedTiers.map(({ tier, threshold }) => {
    const pointsNeeded = threshold * currentPrice * windowSize - sumLast2;
    return {
      tier,
      priceChange: PRICE_CHANGES[priceTier][tier],
      threshold,
      pointsNeeded: Math.ceil(pointsNeeded),
    };
  });

  return { avgPPM, performanceTier, priceTier, expectedPriceChange, thresholds };
}
