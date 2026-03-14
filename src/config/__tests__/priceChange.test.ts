import { describe, it, expect } from 'vitest';

import {
  calculatePriceChangeThresholds,
  AVGPPM_THRESHOLDS,
  PRICE_TIER_BOUNDARY,
} from '../priceChange';

// Helper: build races array where all 3 races score the same, yielding a known avgPPM
function racesForAvgPPM(avgPPM: number, price: number): number[] {
  const avg = avgPPM * price;
  return [avg, avg, avg];
}

describe('calculatePriceChangeThresholds', () => {
  // ─── Performance tier classification ──────────────────────────────

  describe('performance tier classification', () => {
    const price = 10; // Tier B, easy math

    it.each([
      { avgPPM: 0, expected: 'terrible' },
      { avgPPM: 0.604, expected: 'terrible' },
      { avgPPM: 0.605, expected: 'poor' },
      { avgPPM: 0.899, expected: 'poor' },
      { avgPPM: 0.9, expected: 'good' },
      { avgPPM: 1.194, expected: 'good' },
      { avgPPM: 1.195, expected: 'great' },
      { avgPPM: 2.0, expected: 'great' },
    ])('avgPPM=$avgPPM → $expected', ({ avgPPM, expected }) => {
      const races = racesForAvgPPM(avgPPM, price);
      const result = calculatePriceChangeThresholds(price, races);
      expect(result.avgPPM).toBe(avgPPM);
      expect(result.performanceTier).toBe(expected);
    });
  });

  // ─── Price tier classification ────────────────────────────────────

  describe('price tier classification', () => {
    it.each([
      { price: 18.5, expected: 'A' },
      { price: 18.6, expected: 'A' },
      { price: 30.0, expected: 'A' },
      { price: 18.4, expected: 'B' },
      { price: 5.0, expected: 'B' },
    ])('price=$price → tier $expected', ({ price, expected }) => {
      const result = calculatePriceChangeThresholds(price, [0, 0, 0]);
      expect(result.priceTier).toBe(expected);
    });
  });

  // ─── avgPPM calculation ───────────────────────────────────────────

  describe('avgPPM calculation', () => {
    it('computes avg of last 3 races divided by price, rounded to 3 decimals', () => {
      // avg = (10+20+30)/3 = 20, avgPPM = 20/20 = 1.0
      const result = calculatePriceChangeThresholds(20, [10, 20, 30]);
      expect(result.avgPPM).toBe(1.0);
    });

    it('handles non-integer average correctly', () => {
      // avg = (10+11+12)/3 = 11, avgPPM = 11/20 = 0.55
      const result = calculatePriceChangeThresholds(20, [10, 11, 12]);
      expect(result.avgPPM).toBe(0.55);
    });

    it('rounds to exactly 3 decimal places', () => {
      // avg = (7+8+9)/3 = 8, avgPPM = 8/30 = 0.26666... → 0.267
      const result = calculatePriceChangeThresholds(30, [7, 8, 9]);
      expect(result.avgPPM).toBe(0.267);
    });

    it('uses only last 3 races when more are provided', () => {
      // last3 = [5,5,5], avg = 5, avgPPM = 5/10 = 0.5
      const result = calculatePriceChangeThresholds(10, [100, 5, 5, 5]);
      expect(result.avgPPM).toBe(0.5);
    });

    it('works with 1 race', () => {
      // last3 = [15], avg = 15, avgPPM = 15/10 = 1.5
      const result = calculatePriceChangeThresholds(10, [15]);
      expect(result.avgPPM).toBe(1.5);
    });

    it('works with 2 races', () => {
      // last3 = [10,20], avg = 15, avgPPM = 15/10 = 1.5
      const result = calculatePriceChangeThresholds(10, [10, 20]);
      expect(result.avgPPM).toBe(1.5);
    });
  });

  // ─── All 8 price-change combinations (4 tiers × 2 price tiers) ───

  describe('expected price change values', () => {
    const tierAPrice = 20; // >= 18.5
    const tierBPrice = 15; // < 18.5

    it.each([
      { price: tierAPrice, tier: 'great', avgPPM: 1.195, change: 0.3 },
      { price: tierAPrice, tier: 'good', avgPPM: 0.9, change: 0.1 },
      { price: tierAPrice, tier: 'poor', avgPPM: 0.605, change: -0.1 },
      { price: tierAPrice, tier: 'terrible', avgPPM: 0.604, change: -0.3 },
      { price: tierBPrice, tier: 'great', avgPPM: 1.195, change: 0.6 },
      { price: tierBPrice, tier: 'good', avgPPM: 0.9, change: 0.2 },
      { price: tierBPrice, tier: 'poor', avgPPM: 0.605, change: -0.2 },
      { price: tierBPrice, tier: 'terrible', avgPPM: 0.604, change: -0.6 },
    ])(
      'price=$price ($tier) → expectedPriceChange=$change',
      ({ price, avgPPM, change }) => {
        const races = racesForAvgPPM(avgPPM, price);
        const result = calculatePriceChangeThresholds(price, races);
        expect(result.expectedPriceChange).toBe(change);
      },
    );
  });

  // ─── Points needed for next race (thresholds array) ───────────────

  describe('thresholds / points needed for next race', () => {
    it('computes correct thresholds with 3 races (windowSize=3)', () => {
      // price=20, races=[10,20,30]
      // windowSize=3, last2=[20,30], sumLast2=50
      const result = calculatePriceChangeThresholds(20, [10, 20, 30]);

      expect(result.thresholds).toHaveLength(4);

      const byTier = Object.fromEntries(
        result.thresholds.map((t) => [t.tier, t]),
      );

      // great: ceil(1.195*20*3 - 50) = ceil(71.7-50) = ceil(21.7) = 22
      expect(byTier.great.pointsNeeded).toBe(22);
      expect(byTier.great.priceChange).toBe(0.3); // Tier A great

      // good: ceil(0.9*20*3 - 50) = ceil(54-50) = 4
      expect(byTier.good.pointsNeeded).toBe(4);

      // poor: ceil(0.605*20*3 - 50) = ceil(36.3-50) = ceil(-13.7) = -13
      expect(byTier.poor.pointsNeeded).toBe(-13);

      // terrible: ceil(0*20*3 - 50) = ceil(-50) = -50
      expect(byTier.terrible.pointsNeeded).toBe(-50);
    });

    it('uses windowSize=1 with empty races', () => {
      // windowSize = min(0+1, 3) = 1, last2 = [], sumLast2 = 0
      const result = calculatePriceChangeThresholds(20, []);
      const byTier = Object.fromEntries(
        result.thresholds.map((t) => [t.tier, t]),
      );

      // great: ceil(1.195*20*1 - 0) = ceil(23.9) = 24
      expect(byTier.great.pointsNeeded).toBe(24);
      // good: ceil(0.9*20*1) = ceil(18) = 18
      expect(byTier.good.pointsNeeded).toBe(18);
      // poor: ceil(0.605*20*1) = ceil(12.1) = 13
      expect(byTier.poor.pointsNeeded).toBe(13);
      // terrible: ceil(0) = 0
      expect(byTier.terrible.pointsNeeded).toBe(0);
    });

    it('uses windowSize=2 with 1 race', () => {
      // windowSize = min(1+1, 3) = 2, last2 = [15], sumLast2 = 15
      const result = calculatePriceChangeThresholds(20, [15]);
      const byTier = Object.fromEntries(
        result.thresholds.map((t) => [t.tier, t]),
      );

      // great: ceil(1.195*20*2 - 15) = ceil(47.8-15) = ceil(32.8) = 33
      expect(byTier.great.pointsNeeded).toBe(33);
      // good: ceil(0.9*20*2 - 15) = ceil(36-15) = 21
      expect(byTier.good.pointsNeeded).toBe(21);
      // poor: ceil(0.605*20*2 - 15) = ceil(24.2-15) = ceil(9.2) = 10
      expect(byTier.poor.pointsNeeded).toBe(10);
      // terrible: ceil(0-15) = -15
      expect(byTier.terrible.pointsNeeded).toBe(-15);
    });

    it('uses windowSize=3 with 2 races', () => {
      // windowSize = min(2+1, 3) = 3, last2 = [10,15], sumLast2 = 25
      const result = calculatePriceChangeThresholds(20, [10, 15]);
      const byTier = Object.fromEntries(
        result.thresholds.map((t) => [t.tier, t]),
      );

      // great: ceil(1.195*20*3 - 25) = ceil(71.7-25) = ceil(46.7) = 47
      expect(byTier.great.pointsNeeded).toBe(47);
      // good: ceil(0.9*20*3 - 25) = ceil(54-25) = 29
      expect(byTier.good.pointsNeeded).toBe(29);
      // poor: ceil(0.605*20*3 - 25) = ceil(36.3-25) = ceil(11.3) = 12
      expect(byTier.poor.pointsNeeded).toBe(12);
      // terrible: ceil(0-25) = -25
      expect(byTier.terrible.pointsNeeded).toBe(-25);
    });

    it('caps windowSize at 3 for 4+ races', () => {
      // 5 races, windowSize = min(5+1, 3) = 3
      // last2 = [8,9], sumLast2 = 17
      const result = calculatePriceChangeThresholds(10, [1, 2, 3, 8, 9]);
      const byTier = Object.fromEntries(
        result.thresholds.map((t) => [t.tier, t]),
      );

      // great: ceil(1.195*10*3 - 17) = ceil(35.85-17) = ceil(18.85) = 19
      expect(byTier.great.pointsNeeded).toBe(19);
      // good: ceil(0.9*10*3 - 17) = ceil(27-17) = 10
      expect(byTier.good.pointsNeeded).toBe(10);
    });

    it('returns thresholds in order: great, good, poor, terrible', () => {
      const result = calculatePriceChangeThresholds(20, [10, 20, 30]);
      const tiers = result.thresholds.map((t) => t.tier);
      expect(tiers).toEqual(['great', 'good', 'poor', 'terrible']);
    });

    it('includes correct threshold values from AVGPPM_THRESHOLDS', () => {
      const result = calculatePriceChangeThresholds(20, [10]);
      const thresholdValues = result.thresholds.map((t) => t.threshold);
      expect(thresholdValues).toEqual([
        AVGPPM_THRESHOLDS.great,
        AVGPPM_THRESHOLDS.good,
        AVGPPM_THRESHOLDS.poor,
        AVGPPM_THRESHOLDS.terrible,
      ]);
    });
  });

  // ─── Edge cases ───────────────────────────────────────────────────

  describe('edge cases', () => {
    it('price=0 returns avgPPM=0 and terrible tier', () => {
      const result = calculatePriceChangeThresholds(0, [10, 20, 30]);
      expect(result.avgPPM).toBe(0);
      expect(result.performanceTier).toBe('terrible');
      expect(result.priceTier).toBe('B');
      expect(result.expectedPriceChange).toBe(-0.6);
    });

    it('price=0 thresholds all equal -sumLast2', () => {
      // windowSize=3, last2=[20,30], sumLast2=50
      const result = calculatePriceChangeThresholds(0, [10, 20, 30]);
      for (const t of result.thresholds) {
        // ceil(threshold * 0 * 3 - 50) = -50
        expect(t.pointsNeeded).toBe(-50);
      }
    });

    it('empty races array returns avgPPM=0', () => {
      const result = calculatePriceChangeThresholds(20, []);
      expect(result.avgPPM).toBe(0);
      expect(result.performanceTier).toBe('terrible');
    });

    it('single race is used directly as average', () => {
      const result = calculatePriceChangeThresholds(10, [12]);
      // avg = 12, avgPPM = 12/10 = 1.2
      expect(result.avgPPM).toBe(1.2);
      expect(result.performanceTier).toBe('great');
    });

    it('only last 3 races matter even with many races', () => {
      const manyRaces = [50, 50, 50, 50, 0, 0, 0];
      // last3 = [0,0,0], avg = 0, avgPPM = 0
      const result = calculatePriceChangeThresholds(20, manyRaces);
      expect(result.avgPPM).toBe(0);
      expect(result.performanceTier).toBe('terrible');
    });

    it('all zero points yields terrible tier', () => {
      const result = calculatePriceChangeThresholds(25, [0, 0, 0]);
      expect(result.avgPPM).toBe(0);
      expect(result.performanceTier).toBe('terrible');
    });

    it('very large points still computes correctly', () => {
      const result = calculatePriceChangeThresholds(10, [100, 100, 100]);
      // avgPPM = 100/10 = 10.0
      expect(result.avgPPM).toBe(10);
      expect(result.performanceTier).toBe('great');
    });
  });

  // ─── Boundary: exactly at PRICE_TIER_BOUNDARY ─────────────────────

  describe('boundary: PRICE_TIER_BOUNDARY constant', () => {
    it('equals 18.5', () => {
      expect(PRICE_TIER_BOUNDARY).toBe(18.5);
    });

    it('price exactly at boundary is tier A', () => {
      const result = calculatePriceChangeThresholds(
        PRICE_TIER_BOUNDARY,
        [0, 0, 0],
      );
      expect(result.priceTier).toBe('A');
    });

    it('price just below boundary is tier B', () => {
      const result = calculatePriceChangeThresholds(
        PRICE_TIER_BOUNDARY - 0.1,
        [0, 0, 0],
      );
      expect(result.priceTier).toBe('B');
    });
  });

  // ─── Boundary: AVGPPM_THRESHOLDS constants ────────────────────────

  describe('boundary: AVGPPM_THRESHOLDS constants', () => {
    it('has the expected threshold values', () => {
      expect(AVGPPM_THRESHOLDS).toEqual({
        terrible: 0,
        poor: 0.605,
        good: 0.9,
        great: 1.195,
      });
    });
  });

  // ─── Full integration: complete result shape ──────────────────────

  describe('result shape', () => {
    it('returns all expected fields', () => {
      const result = calculatePriceChangeThresholds(20, [10, 20, 30]);
      expect(result).toHaveProperty('avgPPM');
      expect(result).toHaveProperty('performanceTier');
      expect(result).toHaveProperty('priceTier');
      expect(result).toHaveProperty('expectedPriceChange');
      expect(result).toHaveProperty('thresholds');
      expect(result.thresholds).toHaveLength(4);

      for (const t of result.thresholds) {
        expect(t).toHaveProperty('tier');
        expect(t).toHaveProperty('threshold');
        expect(t).toHaveProperty('priceChange');
        expect(t).toHaveProperty('pointsNeeded');
      }
    });
  });
});
