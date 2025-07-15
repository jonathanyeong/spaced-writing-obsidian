import { describe, it, expect } from 'vitest';
import { calculateSM2 } from './sm2';

describe('SM-2 Algorithm', () => {
  describe('calculateSM2', () => {
    it('should handle first review with fruitful response', () => {
      const result = calculateSM2(0, 0, 2.5, 1);
      expect(result.interval).toBe(1);
      expect(result.repetitions).toBe(0);
      expect(result.easeFactor).toBeCloseTo(1.7, 1);
    });

    it('should handle first review with skip response', () => {
      const result = calculateSM2(3, 0, 2.5, 1);
      expect(result.interval).toBe(1);
      expect(result.repetitions).toBe(1);
      expect(result.easeFactor).toBeCloseTo(2.36, 2);
    });

    it('should handle second review with unfruitful response', () => {
      const result = calculateSM2(5, 1, 2.5, 1);
      expect(result.interval).toBe(6);
      expect(result.repetitions).toBe(2);
      expect(result.easeFactor).toBeCloseTo(2.6, 1);
    });

    it('should handle third review with skip response', () => {
      const result = calculateSM2(3, 2, 2.6, 6);
      expect(result.interval).toBe(16);
      expect(result.repetitions).toBe(3);
      expect(result.easeFactor).toBeCloseTo(2.46, 2);
    });

    it('should reset after fruitful response', () => {
      const result = calculateSM2(0, 5, 2.5, 30);
      expect(result.interval).toBe(1);
      expect(result.repetitions).toBe(0);
      expect(result.easeFactor).toBeCloseTo(1.7, 1);
    });

    it('should enforce minimum ease factor of 1.3', () => {
      const result = calculateSM2(0, 0, 1.0, 1);
      expect(result.easeFactor).toBeGreaterThanOrEqual(1.3);
    });

    it('should clamp quality values between 0 and 5', () => {
      const resultNegative = calculateSM2(-1, 0, 2.5, 1);
      const resultTooHigh = calculateSM2(10, 0, 2.5, 1);
      // Both should behave as if quality was clamped to valid range
      expect(resultNegative.interval).toBe(1);
      expect(resultTooHigh.interval).toBe(1);
    });
  });
});