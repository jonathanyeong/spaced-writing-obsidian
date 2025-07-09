export interface WritingEntry {
  id: string;
  content: string;
  dateCreated: Date;
  lastReviewed: Date;
  nextReview: Date;
  lastModified: Date;
  interval: number;
  easeFactor: number;
  repetitions: number;
  quality: number;
  responses: Response[];
  status: 'active' | 'archived';
}

export interface Response {
  date: Date;
  content: string;
  quality: 'fruitful' | 'skip' | 'unfruitful';
}

export interface SM2Result {
  interval: number;
  repetitions: number;
  easeFactor: number;
}

export const QUALITY_MAPPING = {
  fruitful: 0,
  skip: 3,
  unfruitful: 5
} as const;

export type QualityRating = keyof typeof QUALITY_MAPPING;