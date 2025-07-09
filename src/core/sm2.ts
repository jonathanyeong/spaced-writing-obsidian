import { SM2Result, QUALITY_MAPPING } from '../types/settings';
import type { WritingEntry } from '../types/settings';

export const INITIAL_EASE_FACTOR = 2.5;

/**
 * Implements the SM-2 (SuperMemo 2) spaced repetition algorithm
 *
 * Quality ratings for Writing Inbox:
 * - Fruitful (0): Complete blackout - see more frequently
 * - Skip (3): Correct with difficulty - moderate frequency
 * - Unfruitful (5): Perfect response - see less frequently
 *
 * @param quality - Rating from 0-5 (0=fruitful, 3=skip, 5=unfruitful)
 * @param repetitions - Number of consecutive correct reviews
 * @param easeFactor - Difficulty factor (min 1.3)
 * @param interval - Current interval in days
 * @returns Updated SM2 parameters
 */
export function calculateSM2(
  quality: number,
  repetitions: number,
  prevEaseFactor: number,
  prevInterval: number
): SM2Result {
  // Ensure valid inputs since a user can change these values manually in the note frontmatter
  quality = Math.max(0, Math.min(5, quality));
  repetitions = Math.max(0, repetitions);
  prevEaseFactor = Math.max(1.3, prevEaseFactor);
  prevInterval = Math.max(1, prevInterval);

  var newInterval, newRepetitions, newEaseFactor;

  if (quality >= 3) {
    if (repetitions === 0) {
      newInterval = 1;
    } else if (repetitions === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(prevInterval * prevEaseFactor);
    }
    newRepetitions = repetitions + 1;
  } else {
    newRepetitions = 0;
    newInterval = 1;
  }

  newEaseFactor = prevEaseFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  newEaseFactor = Math.max(1.3, newEaseFactor);

  return {
    interval: newInterval,
    repetitions: newRepetitions,
    easeFactor: newEaseFactor
  };
}

/**
 * Calculate the next review date based on current date and interval
 * @param currentDate - Current date
 * @param intervalDays - Interval in days
 * @returns Next review date
 */
export function calculateNextReviewDate(currentDate: Date, intervalDays: number): Date {
  const nextDate = new Date(currentDate);
  nextDate.setDate(nextDate.getDate() + intervalDays);
  return nextDate;
}

/**
 * Get entries that are due for review
 * @param entries - All writing entries
 * @param currentDate - Current date (defaults to now)
 * @param limit - Maximum number of entries to return
 * @returns Array of entries due for review
 */
export function getDueEntries(
  entries: WritingEntry[],
  currentDate: Date = new Date(),
  limit?: number
): WritingEntry[] {
  const dueEntries = entries
    .filter(entry =>
      entry.status === 'active' &&
      entry.nextReview <= currentDate
    )
    .sort((a, b) => a.nextReview.getTime() - b.nextReview.getTime());

  return limit ? dueEntries.slice(0, limit) : dueEntries;
}

/**
 * Convert quality rating to numeric value
 * @param rating - Quality rating ('fruitful', 'skip', 'unfruitful')
 * @returns Numeric quality value (0, 3, or 5)
 */
export function qualityToNumber(rating: keyof typeof QUALITY_MAPPING): number {
  return QUALITY_MAPPING[rating];
}

/**
 * Get initial SM-2 values for a new entry
 * @returns Initial SM2 parameters
 */
export function getInitialSM2Values(): SM2Result {
  return {
    interval: 1,
    repetitions: 0,
    easeFactor: INITIAL_EASE_FACTOR
  };
}