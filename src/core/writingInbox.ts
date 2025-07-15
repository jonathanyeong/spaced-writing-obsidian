import matter from 'gray-matter';
import { TFile, TFolder, Vault } from 'obsidian';
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
  status: 'active' | 'archived';
}

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
  constructor(private vault: Vault) {}

  /**
   * Create a new writing entry
   * @param content - The initial content of the entry
   * @param folder - The writing inbox folder path
   */
  async createEntry(content: string, folder: string): Promise<void> {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const title = content.split('\n')[0].slice(0, 50).replace(/[^a-zA-Z0-9\s]/g, '').trim();
    const filename = `${dateStr}-${title.toLowerCase().replace(/\s+/g, '-')}.md`;
    const filepath = `${folder}/entries/${filename}`;

    const { interval, repetitions, easeFactor } = getInitialSM2Values();

    // Create ID with format: YYYYMMDDHHmmss (UTC time)
    const dateId = now.toISOString()
      .replace(/[-:T]/g, '')
      .slice(0, 14);

    const frontmatter: EntryFrontmatter = {
      id: dateId,
      lastReviewed: now.toISOString(),
      nextReview: now.toISOString(),
      lastModified: now.toISOString(),
      interval,
      easeFactor,
      repetitions,
      status: 'active'
    };

    const fileContent = matter.stringify(content, frontmatter);
    const file = await this.vault.create(filepath, fileContent);
    if (!file) {
      throw new Error('Failed to create file');
    }
  }

  /**
   * Get a writing entry by its file
   * @param file - The TFile to read
   * @returns The WritingEntry or null if not found
   */
  async getEntry(file: TFile): Promise<WritingEntry | null> {
    return this.readEntry(file);
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
    const entry = await this.readEntry(file);

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

    const frontmatter: EntryFrontmatter = {
      id: updatedEntry.id,
      lastReviewed: updatedEntry.lastReviewed.toISOString(),
      nextReview: updatedEntry.nextReview.toISOString(),
      lastModified: new Date().toISOString(),
      interval: updatedEntry.interval,
      easeFactor: updatedEntry.easeFactor,
      repetitions: updatedEntry.repetitions,
      status: updatedEntry.status
    };

    const fileContent = matter.stringify(content, frontmatter);
    await this.vault.modify(file, fileContent);

    return updatedEntry;
  }

  /**
   * Archive an entry
   * @param file - The file to archive
   */
  async archiveEntry(file: TFile): Promise<void> {
    // First, update the status in frontmatter
    const content = await this.vault.read(file);
    const { data, content: body } = matter(content);

    const frontmatter = data as EntryFrontmatter;
    frontmatter.status = 'archived';
    frontmatter.lastModified = new Date().toISOString();

    const updatedContent = matter.stringify(body, frontmatter);
    await this.vault.modify(file, updatedContent);

    // Then move to archive folder
    const newPath = file.path.replace('/entries/', '/archive/');
    await this.vault.rename(file, newPath);
  }

  /**
   * Get all active entries from the writing inbox
   * @param folder - The writing inbox folder path
   * @returns Array of WritingEntry objects
   */
  async getActiveEntries(folder: string): Promise<WritingEntry[]> {
    const files = await this.getEntryFiles(folder);
    const entries: WritingEntry[] = [];

    for (const file of files) {
      const entry = await this.readEntry(file);
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
    const files = await this.getEntryFiles(folder);

    for (const file of files) {
      const fileEntry = await this.readEntry(file);
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
    const entry = await this.readEntry(file);

    if (!entry) {
      return false;
    }

    // The FileManager already detects manual edits and sets quality to 0
    // This method is here for explicit checking if needed
    return entry.quality === 0;
  }

  /**
   * Get all entry files from a folder
   * @param folder - The folder to search in
   * @returns Array of TFile objects
   */
  async getEntryFiles(folder: string): Promise<TFile[]> {
    const entriesPath = `${folder}/entries`;
    const entriesFolder = this.vault.getAbstractFileByPath(entriesPath);

    if (!entriesFolder || !(entriesFolder instanceof TFolder)) {
      return [];
    }

    const files: TFile[] = [];
    for (const child of entriesFolder.children) {
      if (child instanceof TFile && child.extension === 'md') {
        files.push(child);
      }
    }

    return files;
  }

  /**
   * Read a writing entry from a markdown file
   * @param file - The Obsidian TFile to read
   * @returns WritingEntry or null if invalid
   */
  async readEntry(file: TFile): Promise<WritingEntry | null> {
    try {
      const content = await this.vault.read(file);
      const { data, content: body } = matter(content);

      // Check if this is a valid entry file
      if (!data.id) {
        return null;
      }

      const frontmatter = data as EntryFrontmatter;

      // Check if file was manually modified
      const fileModTime = new Date(file.stat.mtime);
      const lastModified = new Date(frontmatter.lastModified);
      const wasManuallyEdited = fileModTime > lastModified;

      return {
        id: frontmatter.id,
        dateCreated: new Date(file.stat.ctime),
        content: body.trim(),
        lastReviewed: new Date(frontmatter.lastReviewed),
        nextReview: new Date(frontmatter.nextReview),
        lastModified: wasManuallyEdited ? fileModTime : lastModified,
        interval: frontmatter.interval,
        easeFactor: frontmatter.easeFactor,
        repetitions: frontmatter.repetitions,
        quality: wasManuallyEdited ? 0 : -1, // 0 if manually edited (fruitful), -1 otherwise
        status: frontmatter.status
      };
    } catch (error) {
      console.error('Error reading entry file:', error);
      return null;
    }
  }

}