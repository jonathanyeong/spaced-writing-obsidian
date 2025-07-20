export const INITIAL_EASE_FACTOR = 2.5;

interface SM2Result {
  interval: number;
  repetitions: number;
  easeFactor: number;
}

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

  let newInterval, newRepetitions, newEaseFactor;

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
