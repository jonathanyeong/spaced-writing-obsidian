import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WritingInbox, QUALITY_MAPPING, type QualityRating, type WritingEntry, type EntryFrontmatter } from './writingInbox';
import { TFile, TFolder, Vault } from 'obsidian';
import matter from 'gray-matter';

// Mock the SM2 module
vi.mock('../sm2/sm2', () => ({
  getInitialSM2Values: vi.fn(() => ({
    interval: 1,
    repetitions: 0,
    easeFactor: 2.5
  })),
  calculateSM2: vi.fn((quality, repetitions, easeFactor, interval) => ({
    interval: quality >= 3 ? interval * 2 : 1,
    repetitions: quality >= 3 ? repetitions + 1 : 0,
    easeFactor: Math.max(1.3, easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)))
  }))
}));


describe('WritingInbox', () => {
  let vault: Vault;
  let writingInbox: WritingInbox;
  let mockFiles: Map<string, string>;

  beforeEach(() => {
    mockFiles = new Map();

    // Mock Vault
    vault = {
      create: vi.fn(async (path: string, content: string) => {
        mockFiles.set(path, content);
        const file = new TFile();
        file.path = path;
        return file;
      }),
      read: vi.fn(async (file: TFile) => {
        return mockFiles.get(file.path) || null;
      }),
      modify: vi.fn(async (file: TFile, content: string) => {
        mockFiles.set(file.path, content);
      }),
      rename: vi.fn(async (file: TFile, newPath: string) => {
        const content = mockFiles.get(file.path);
        if (content) {
          mockFiles.delete(file.path);
          mockFiles.set(newPath, content);
          file.path = newPath;
        }
      }),
      getFileByPath: vi.fn((path: string) => {
        if (mockFiles.has(path)) {
          const file = new TFile();
          file.path = path;
          return file;
        }
        return null;
      }),
      getAbstractFileByPath: vi.fn((path: string) => {
        if (path.endsWith('/entries')) {
          const children = Array.from(mockFiles.keys())
            .filter(p => p.startsWith(path + '/') && p.endsWith('.md'))
            .map(p => {
              const file = new TFile();
              file.path = p;
              file.extension = 'md';
              return file;
            });
          let tfolder = new TFolder
          tfolder.children = children
          return tfolder;
        }
        return null;
      })
    } as unknown as Vault;

    writingInbox = new WritingInbox(vault);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('createEntry', () => {
    it('should create a new entry with correct filename and frontmatter', async () => {
      const mockDate = new Date('2024-01-15T10:30:00.000Z');
      vi.setSystemTime(mockDate);

      const content = 'Test Entry Title\n\nThis is the body content.';
      const folder = '/writing-inbox';

      await writingInbox.createEntry(content, folder);

      expect(vault.create).toHaveBeenCalledOnce();
      const [filepath, fileContent] = (vault.create as any).mock.calls[0];

      // Check filename
      expect(filepath).toBe('/writing-inbox/entries/2024-01-15-test-entry-title.md');

      // Parse and check frontmatter
      const parsed = matter(fileContent);
      expect(parsed.data).toMatchObject({
        id: '20240115103000',
        lastReviewed: '2024-01-15T10:30:00.000Z',
        nextReview: '2024-01-15T10:30:00.000Z',
        lastModified: '2024-01-15T10:30:00.000Z',
        interval: 1,
        easeFactor: 2.5,
        repetitions: 0
      });

      expect(parsed.content.trim()).toBe(content);
    });

    it('should handle special characters in title', async () => {
      const content = 'Test @ Entry # Title $ With % Special & Characters!\n\nBody content.';
      const folder = '/writing-inbox';

      await writingInbox.createEntry(content, folder);

      const [filepath] = (vault.create as any).mock.calls[0];
      expect(filepath).toContain('test-entry-title-with-special-characters');
    });

    it('should truncate long titles to 50 characters', async () => {
      const content = 'This is a very long title that exceeds fifty characters and should be truncated\n\nBody content.';
      const folder = '/writing-inbox';

      await writingInbox.createEntry(content, folder);

      const [filepath] = (vault.create as any).mock.calls[0];
      expect(filepath).toContain('this-is-a-very-long-title-that-exceeds-fifty-char');
    });

    it('should throw error if file creation fails', async () => {
      (vault.create as any).mockResolvedValueOnce(null);

      await expect(writingInbox.createEntry('Test', '/folder')).rejects.toThrowError('Failed to create file');
    });
  });

  describe('reviewEntry', () => {
    let mockFile: TFile;
    let mockEntryContent: string;

    beforeEach(() => {
      mockFile = new TFile();
      mockFile.path = '/writing-inbox/entries/2024-01-15-test.md';
      const frontmatter: EntryFrontmatter = {
        id: '20240115103000',
        lastReviewed: '2024-01-15T10:30:00.000Z',
        nextReview: '2024-01-15T10:30:00.000Z',
        lastModified: '2024-01-15T10:30:00.000Z',
        interval: 1,
        easeFactor: 2.5,
        repetitions: 0
      };
      mockEntryContent = matter.stringify('Original content', frontmatter);
      mockFiles.set(mockFile.path, mockEntryContent);
    });

    it('should update entry content and calculate new SM2 values for fruitful review', async () => {
      const mockDate = new Date('2024-01-16T14:00:00.000Z');
      vi.setSystemTime(mockDate);

      const newContent = 'Updated content';
      await writingInbox.reviewEntry(mockFile as TFile, newContent, 'fruitful');

      expect(vault.modify).toHaveBeenCalledOnce();
      const [file, fileContent] = (vault.modify as any).mock.calls[0];

      expect(file).toBe(mockFile);

      const parsed = matter(fileContent);
      expect(parsed.content.trim()).toBe(newContent);
      expect(parsed.data.lastReviewed).toBe('2024-01-16T14:00:00.000Z');
      expect(parsed.data.lastModified).toBe('2024-01-16T14:00:00.000Z');
      expect(parsed.data.nextReview).toBe('2024-01-17T14:00:00.000Z'); // 1 day later (interval 1)
      expect(parsed.data.repetitions).toBe(0); // Quality 0 resets repetitions
    });

    it('should update entry for skip review', async () => {
      const mockDate = new Date('2024-01-16T14:00:00.000Z');
      vi.setSystemTime(mockDate);

      await writingInbox.reviewEntry(mockFile as TFile, 'Updated content', 'skip');

      const [, fileContent] = (vault.modify as any).mock.calls[0];
      const parsed = matter(fileContent);

      expect(parsed.data.nextReview).toBe('2024-01-18T14:00:00.000Z'); // 2 days later (interval * 2)
      expect(parsed.data.repetitions).toBe(1); // Quality 3 increases repetitions
    });

    it('should update entry for unfruitful review', async () => {
      const mockDate = new Date('2024-01-16T14:00:00.000Z');
      vi.setSystemTime(mockDate);

      await writingInbox.reviewEntry(mockFile as TFile, 'Updated content', 'unfruitful');

      const [, fileContent] = (vault.modify as any).mock.calls[0];
      const parsed = matter(fileContent);

      expect(parsed.data.nextReview).toBe('2024-01-18T14:00:00.000Z'); // 2 days later
      expect(parsed.data.repetitions).toBe(1); // Quality 5 increases repetitions
    });

    it('should throw error if entry not found', async () => {
      mockFiles.clear();

      await expect(writingInbox.reviewEntry(mockFile as TFile, 'content', 'skip'))
        .rejects.toThrowError('Entry not found');
    });
  });

  describe('archiveEntry', () => {
    it('should move entry from entries to archive folder', async () => {
      const mockFile = new TFile();
      mockFile.path = '/writing-inbox/entries/2024-01-15-test.md';
      mockFiles.set(mockFile.path, 'File content');

      await writingInbox.archiveEntry(mockFile as TFile);

      expect(vault.rename).toHaveBeenCalledWith(
        mockFile,
        '/writing-inbox/archive/2024-01-15-test.md'
      );
    });

    it('should throw error if entry not found', async () => {
      const mockFile = new TFile();
      mockFile.path = '/writing-inbox/entries/nonexistent.md';
      (vault.read as any).mockResolvedValueOnce(null);

      await expect(writingInbox.archiveEntry(mockFile as TFile))
        .rejects.toThrowError('Entry not found');
    });
  });

  describe('getEntriesDueForReview', () => {
    beforeEach(() => {
      const mockDate = new Date('2024-01-16T10:00:00.000Z');
      vi.setSystemTime(mockDate);
    });

    it('should return entries due for review today', async () => {
      // Create mock entries
      const entry1 = {
        id: '20240114000000',
        lastReviewed: '2024-01-14T10:00:00.000Z',
        nextReview: '2024-01-15T10:00:00.000Z', // Due yesterday
        lastModified: '2024-01-14T10:00:00.000Z',
        interval: 1,
        easeFactor: 2.5,
        repetitions: 0
      };

      const entry2 = {
        id: '20240115000000',
        lastReviewed: '2024-01-15T10:00:00.000Z',
        nextReview: '2024-01-16T10:00:00.000Z', // Due today
        lastModified: '2024-01-15T10:00:00.000Z',
        interval: 1,
        easeFactor: 2.5,
        repetitions: 0
      };

      const entry3 = {
        id: '20240116000000',
        lastReviewed: '2024-01-16T10:00:00.000Z',
        nextReview: '2024-01-17T10:00:00.000Z', // Due tomorrow
        lastModified: '2024-01-16T10:00:00.000Z',
        interval: 1,
        easeFactor: 2.5,
        repetitions: 0
      };

      mockFiles.set('/writing-inbox/entries/entry1.md', matter.stringify('Content 1', entry1));
      mockFiles.set('/writing-inbox/entries/entry2.md', matter.stringify('Content 2', entry2));
      mockFiles.set('/writing-inbox/entries/entry3.md', matter.stringify('Content 3', entry3));

      const results = await writingInbox.getEntriesDueForReview('/writing-inbox');

      expect(results).toHaveLength(2);
      expect(results[0].frontmatter.id).toBe('20240114000000');
      expect(results[1].frontmatter.id).toBe('20240115000000');
    });

    it('should return empty array if no entries folder exists', async () => {
      (vault.getAbstractFileByPath as any).mockReturnValueOnce(null);

      const results = await writingInbox.getEntriesDueForReview('/writing-inbox');

      expect(results).toEqual([]);
    });

    it('should skip invalid entries without ID', async () => {
      const validEntry = {
        id: '20240115000000',
        lastReviewed: '2024-01-15T10:00:00.000Z',
        nextReview: '2024-01-16T10:00:00.000Z',
        lastModified: '2024-01-15T10:00:00.000Z',
        interval: 1,
        easeFactor: 2.5,
        repetitions: 0
      };

      mockFiles.set('/writing-inbox/entries/valid.md', matter.stringify('Valid', validEntry));
      mockFiles.set('/writing-inbox/entries/invalid.md', '---\ntitle: No ID\n---\nInvalid entry');

      const results = await writingInbox.getEntriesDueForReview('/writing-inbox');

      expect(results).toHaveLength(1);
      expect(results[0].frontmatter.id).toBe('20240115000000');
    });
  });

  describe('getFileForEntry', () => {
    it('should return TFile for valid entry', async () => {
      const entry: WritingEntry = {
        path: '/writing-inbox/entries/test.md',
        content: 'Test content',
        frontmatter: {
          id: '20240115000000',
          lastReviewed: '2024-01-15T10:00:00.000Z',
          nextReview: '2024-01-16T10:00:00.000Z',
          lastModified: '2024-01-15T10:00:00.000Z',
          interval: 1,
          easeFactor: 2.5,
          repetitions: 0
        }
      };

      mockFiles.set(entry.path, 'File exists');

      const file = await writingInbox.getFileForEntry(entry);

      expect(vault.getFileByPath).toHaveBeenCalledWith(entry.path);
      expect(file).toBeDefined();
      expect(file.path).toBe(entry.path);
    });

    it('should throw error if file not found', async () => {
      const entry: WritingEntry = {
        path: '/nonexistent.md',
        content: 'Test',
        frontmatter: {} as EntryFrontmatter
      };

      await expect(writingInbox.getFileForEntry(entry))
        .rejects.toThrowError('File not found');
    });
  });
});