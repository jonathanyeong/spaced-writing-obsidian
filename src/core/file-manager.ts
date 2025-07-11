import { TFile, TFolder, Vault } from 'obsidian';
import matter from 'gray-matter';
import type { WritingEntry } from '../types/settings';
import { getInitialSM2Values } from './sm2';


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

export class FileManager {
  constructor(private vault: Vault) {}

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

  /**
   * Write a writing entry to a markdown file
   * @param entry - The WritingEntry to save
   * @param file - The file to write to
   * @param content - The full markdown content (including any responses)
   */
  async writeEntry(entry: WritingEntry, file: TFile, content: string): Promise<void> {
    const frontmatter: EntryFrontmatter = {
      id: entry.id,
      lastReviewed: entry.lastReviewed.toISOString(),
      nextReview: entry.nextReview.toISOString(),
      lastModified: new Date().toISOString(),
      interval: entry.interval,
      easeFactor: entry.easeFactor,
      repetitions: entry.repetitions,
      status: entry.status
    };

    const fileContent = matter.stringify(content, frontmatter);
    await this.vault.modify(file, fileContent);
  }

  /**
   * Create a new writing entry file
   * @param content - The initial content of the entry
   * @param folder - The folder to create the entry in
   * @returns The created TFile
   */
  async createEntry(content: string, folder: string): Promise<TFile> {
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

    return file;
  }

  /**
   * Archive an entry by updating status and moving it to the archive folder
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
}
