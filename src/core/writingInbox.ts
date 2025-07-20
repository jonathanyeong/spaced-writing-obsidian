import matter from 'gray-matter';
import { TFile, TFolder, Vault } from 'obsidian';
import { format } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { calculateSM2, getInitialSM2Values } from '../sm2/sm2';

export const QUALITY_MAPPING = {
  fruitful: 0,
  skip: 3,
  unfruitful: 5
} as const;

export type QualityRating = keyof typeof QUALITY_MAPPING;

export interface EntryFrontmatter {
  id: string;
  lastReviewed: string;
  nextReview: string;
  lastModified: string;
  interval: number;
  easeFactor: number;
  repetitions: number;
}

export interface WritingEntry {
  content: string;
  path: string;
  frontmatter: EntryFrontmatter
}

export class WritingInbox {
  constructor(private vault: Vault) {}

  /**
   * Create a new writing entry
   * @param content - The body content to save to file
   * @param folder - The writing inbox folder path
   */
  async createEntry(content: string, folder: string): Promise<void> {
    const now = new Date();
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const zonedDate = toZonedTime(now, userTimezone);
    
    // Use local date for filename
    const dateStr = format(zonedDate, 'yyyy-MM-dd');
    const title = content.split('\n')[0].slice(0, 50).replace(/[^a-zA-Z0-9\s]/g, '').trim();
    const filename = `${dateStr}-${title.toLowerCase().replace(/\s+/g, '-')}.md`;
    const filepath = `${folder}/entries/${filename}`;
    const { interval, repetitions, easeFactor } = getInitialSM2Values();

    // Create ID with format: YYYYMMDDHHmmss (local time)
    const dateId = format(zonedDate, 'yyyyMMddHHmmss');

    const frontmatter: EntryFrontmatter = {
      id: dateId,
      lastReviewed: now.toISOString(),
      nextReview: now.toISOString(),
      lastModified: now.toISOString(),
      interval,
      easeFactor,
      repetitions,
    };

    const fileContent = matter.stringify(content, frontmatter);
    const file = await this.vault.create(filepath, fileContent);
    if (!file) {
      throw new Error('Failed to create file');
    }
  }

  /**
   * Update an entry's content and SM-2 scheduling based on quality rating
   * @param file - The file to update
   * @param content - The new content
   * @param quality - The quality rating
   */
  async reviewEntry(
    file: TFile,
    content: string,
    quality: QualityRating
  ): Promise<void> {
    const entry = await this.readEntry(file);

    if (!entry) {
      throw new Error('Entry not found');
    }
    const { repetitions, easeFactor, interval } = entry.frontmatter
    // Calculate new SM-2 values
    const qualityValue = QUALITY_MAPPING[quality];
    const sm2Result = calculateSM2(
      qualityValue,
      repetitions,
      easeFactor,
      interval
    );

    // Calculate next review date
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + sm2Result.interval);

    // Update frontmatter
    const now = new Date();
    const frontmatter: EntryFrontmatter = {
      ...entry.frontmatter,
      lastReviewed: now.toISOString(),
      nextReview: nextReview.toISOString(),
      lastModified: now.toISOString(),
      interval: sm2Result.interval,
      easeFactor: sm2Result.easeFactor,
      repetitions: sm2Result.repetitions,
    };

    const fileContent = matter.stringify(content, frontmatter);
    await this.vault.modify(file, fileContent);
  }

  /**
   * Archive an entry by moving it to the archive/ folder
   * @param file - The file to archive
   */
  async archiveEntry(file: TFile): Promise<void> {
    const entry = await this.vault.read(file);
    if (!entry) {
      throw new Error('Entry not found');
    }

    const newPath = file.path.replace('/entries/', '/archive/');
    await this.vault.rename(file, newPath);
  }

  /**
   * Get entries due for review today
   * @param folder - The writing inbox folder path
   * @returns Array of WritingEntry objects due for review
   */
  async getEntriesDueForReview(folder: string): Promise<WritingEntry[]> {
    const activeEntries = await this.getActiveEntries(folder);
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Get end of today in user's timezone
    const now = new Date();
    const zonedNow = toZonedTime(now, userTimezone);
    const endOfToday = new Date(zonedNow);
    endOfToday.setHours(23, 59, 59, 999);
    
    // Convert back to UTC for comparison with stored ISO dates
    const endOfTodayUTC = fromZonedTime(endOfToday, userTimezone);

    return activeEntries.filter(entry => new Date(entry.frontmatter.nextReview) <= endOfTodayUTC);
  }

  /**
   * Get the corresponding TFile for an entry
   * @param entry - The WritingEntry
   * @returns The TFile
   */
  async getFileForEntry(entry: WritingEntry): Promise<TFile> {
    const file = this.vault.getFileByPath(entry.path)

    if (!file) {
      throw new Error('File not found');
    }

    return file
  }

  /**
   * Get all active entries from the writing inbox
   * @param folder - The writing inbox folder path
   * @returns Array of WritingEntry objects
   */
  private async getActiveEntries(folder: string): Promise<WritingEntry[]> {
    const entriesPath = `${folder}/entries`;
    const entriesFolder = this.vault.getAbstractFileByPath(entriesPath);

    if (!entriesFolder || !(entriesFolder instanceof TFolder)) {
      return [];
    }
    const entries: WritingEntry[] = [];
    for (const file of entriesFolder.children) {
      if (file instanceof TFile && file.extension === 'md') {
        const entry = await this.readEntry(file);
        if (entry) {
          entries.push(entry);
        }
      }
    }

    return entries;
  }

  /**
   * Read a writing entry from a markdown file
   * @param file - The Obsidian TFile to read
   * @returns WritingEntry or null if invalid
   */
  private async readEntry(file: TFile): Promise<WritingEntry | null> {
    try {
      const content = await this.vault.read(file);
      if (!content) {
        return null
      }
      const { data, content: body } = matter(content);

      // Check if this is a valid entry file
      if (!data.id) {
        return null;
      }

      const frontmatter = data as EntryFrontmatter;

      return {
        content: body,
        frontmatter,
        path: file.path
      };
    } catch (error) {
      console.error('Error reading entry file:', error);
      return null;
    }
  }

}