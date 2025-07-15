import { TFile, Vault } from 'obsidian';
import { FileManager } from './fileRepository';
import { calculateSM2 } from '../sm2/sm2';

export const QUALITY_MAPPING = {
  fruitful: 0,
  skip: 3,
  unfruitful: 5
} as const;

export type QualityRating = keyof typeof QUALITY_MAPPING;


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
  status: 'active' | 'archived';
}

// EntryManager takes the fileManager and uses it to do business logic stuff.
// These methods are called by the UIs

export class WritingInbox {
  private fileManager: FileManager;

  constructor(private vault: Vault) {
    this.fileManager = new FileManager(vault);
  }

  /**
   * Create a new writing entry
   * @param content - The initial content of the entry
   * @param folder - The writing inbox folder path
   * @returns The created WritingEntry
   */
  async createEntry(content: string, folder: string): Promise<WritingEntry> {
    const file = await this.fileManager.createEntry(content, folder);
    const entry = await this.fileManager.readEntry(file);

    if (!entry) {
      throw new Error('Failed to create entry');
    }

    return entry;
  }

  /**
   * Get a writing entry by its file
   * @param file - The TFile to read
   * @returns The WritingEntry or null if not found
   */
  async getEntry(file: TFile): Promise<WritingEntry | null> {
    return this.fileManager.readEntry(file);
  }

  /**
   * Update an entry's content and SM-2 scheduling based on quality rating
   * @param file - The file to update
   * @param content - The new content
   * @param quality - The quality rating
   * @returns The updated WritingEntry
   */
  async updateEntry(
    file: TFile,
    content: string,
    quality: QualityRating
  ): Promise<WritingEntry> {
    const entry = await this.fileManager.readEntry(file);

    if (!entry) {
      throw new Error('Entry not found');
    }

    // Calculate new SM-2 values
    const qualityValue = QUALITY_MAPPING[quality];
    const sm2Result = calculateSM2(
      qualityValue,
      entry.repetitions,
      entry.easeFactor,
      entry.interval
    );

    // Calculate next review date
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + sm2Result.interval);

    // Update the entry
    const updatedEntry: WritingEntry = {
      ...entry,
      content,
      lastReviewed: new Date(),
      nextReview,
      lastModified: new Date(),
      interval: sm2Result.interval,
      easeFactor: sm2Result.easeFactor,
      repetitions: sm2Result.repetitions,
      quality: qualityValue
    };

    await this.fileManager.writeEntry(updatedEntry, file, content);

    return updatedEntry;
  }

  /**
   * Archive an entry
   * @param file - The file to archive
   */
  async archiveEntry(file: TFile): Promise<void> {
    await this.fileManager.archiveEntry(file);
  }

  /**
   * Get all active entries from the writing inbox
   * @param folder - The writing inbox folder path
   * @returns Array of WritingEntry objects
   */
  async getActiveEntries(folder: string): Promise<WritingEntry[]> {
    const files = await this.fileManager.getEntryFiles(folder);
    const entries: WritingEntry[] = [];

    for (const file of files) {
      const entry = await this.fileManager.readEntry(file);
      if (entry && entry.status === 'active') {
        entries.push(entry);
      }
    }

    return entries;
  }

  /**
   * Get entries due for review today
   * @param folder - The writing inbox folder path
   * @returns Array of WritingEntry objects due for review
   */
  async getEntriesDueForReview(folder: string): Promise<WritingEntry[]> {
    const activeEntries = await this.getActiveEntries(folder);
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today

    return activeEntries.filter(entry => entry.nextReview <= today);
  }

  /**
   * Get the corresponding TFile for an entry
   * @param entry - The WritingEntry
   * @param folder - The writing inbox folder path
   * @returns The TFile or null if not found
   */
  async getFileForEntry(entry: WritingEntry, folder: string): Promise<TFile | null> {
    const files = await this.fileManager.getEntryFiles(folder);

    for (const file of files) {
      const fileEntry = await this.fileManager.readEntry(file);
      if (fileEntry && fileEntry.id === entry.id) {
        return file;
      }
    }

    return null;
  }

  /**
   * Check if an entry was manually edited and reset if needed
   * @param file - The file to check
   * @returns True if the entry was manually edited
   */
  async checkAndHandleManualEdit(file: TFile): Promise<boolean> {
    const entry = await this.fileManager.readEntry(file);

    if (!entry) {
      return false;
    }

    // The FileManager already detects manual edits and sets quality to 0
    // This method is here for explicit checking if needed
    return entry.quality === 0;
  }
}