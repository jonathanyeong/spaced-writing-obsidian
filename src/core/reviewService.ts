import { App, TFile, Notice, WorkspaceLeaf, MarkdownView } from 'obsidian';
import { WritingInbox } from './writingInbox';
import type { WritingEntry, QualityRating } from './writingInbox';
import { EditorView } from '@codemirror/view';
import { toggleReviewMode } from '../extensions/reviewExtension';

export class ReviewService {
  private app: App;
  private writingInbox: WritingInbox;
  private currentReviewEntries: WritingEntry[] = [];
  private currentReviewIndex = 0;
  private isReviewMode = false;
  private currentReviewFile: TFile | null = null;

  constructor(app: App, writingInbox: WritingInbox) {
    this.app = app;
    this.writingInbox = writingInbox;
  }

  async startDailyReview(folder: string): Promise<void> {
    try {
      // Load entries due for review
      this.currentReviewEntries = await this.writingInbox.getEntriesDueForReview(folder);

      if (this.currentReviewEntries.length === 0) {
        new Notice('No entries due for review today!');
        return;
      }

      this.currentReviewIndex = 0;
      this.isReviewMode = true;

      new Notice(`Starting review of ${this.currentReviewEntries.length} entries`);
      await this.openCurrentEntry();

    } catch (error) {
      console.error('Error starting daily review:', error);
      new Notice('Error starting daily review. Please check your settings.');
    }
  }

  async openCurrentEntry(): Promise<void> {
    if (this.currentReviewIndex >= this.currentReviewEntries.length) {
      await this.endReview();
      return;
    }

    const entry = this.currentReviewEntries[this.currentReviewIndex];
    this.currentReviewFile = await this.writingInbox.getFileForEntry(entry);

    if (!this.currentReviewFile) {
      new Notice('Error: Could not find file for entry');
      return;
    }

    // Open the file
    const leaf = this.app.workspace.getLeaf();
    await leaf.openFile(this.currentReviewFile);

    // Enable review mode in the editor
    await this.enableReviewMode(leaf);
  }

  private async enableReviewMode(leaf: WorkspaceLeaf): Promise<void> {
    // Wait a bit for the editor to be ready
    await new Promise(resolve => setTimeout(resolve, 100));

    const view = leaf.view;
    if (view instanceof MarkdownView && view.editor) {
      // @ts-expect-error, not typed - accessing internal editor
      const editorView = view.editor.cm as EditorView;
      if (editorView) {
        editorView.dispatch({
          effects: toggleReviewMode.of(true)
        });
      }
    }
  }

  private async disableReviewMode(): Promise<void> {
    const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (activeView && activeView.editor) {
      // @ts-expect-error, not typed - accessing internal editor
      const editorView = activeView.editor.cm as EditorView;
      if (editorView) {
        editorView.dispatch({
          effects: toggleReviewMode.of(false)
        });
      }
    }
  }

  async handleReview(quality: QualityRating): Promise<void> {
    if (!this.currentReviewFile) {
      new Notice('Error: No current entry file');
      return;
    }

    try {
      // Get the current content from the active editor
      const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
      let content = '';

      if (activeView && activeView.file === this.currentReviewFile && activeView.editor) {
        // Get content from the editor (includes any unsaved changes)
        content = activeView.editor.getValue();
        // Parse just the body content without frontmatter
        const matterResult = await import('gray-matter');
        const parsed = matterResult.default(content);
        content = parsed.content;
      }

      await this.writingInbox.reviewEntry(this.currentReviewFile, content, quality);

      // Move to next entry
      this.currentReviewIndex++;
      await this.openCurrentEntry();

    } catch (error) {
      console.error('Error reviewing entry:', error);
      new Notice('Error saving entry');
    }
  }

  async handleArchive(): Promise<void> {
    if (!this.currentReviewFile) {
      new Notice('Error: No current entry file');
      return;
    }

    try {
      await this.writingInbox.archiveEntry(this.currentReviewFile);
      new Notice('Entry archived');

      // Remove from current entries array
      this.currentReviewEntries.splice(this.currentReviewIndex, 1);

      // Adjust current index if needed
      if (this.currentReviewIndex >= this.currentReviewEntries.length && this.currentReviewEntries.length > 0) {
        this.currentReviewIndex = this.currentReviewEntries.length - 1;
      }

      // Continue with next entry or end review
      if (this.currentReviewEntries.length === 0) {
        await this.endReview();
      } else {
        await this.openCurrentEntry();
      }

    } catch (error) {
      console.error('Error archiving entry:', error);
      new Notice('Error archiving entry');
    }
  }

  private async endReview(): Promise<void> {
    await this.disableReviewMode();
    this.isReviewMode = false;
    this.currentReviewEntries = [];
    this.currentReviewIndex = 0;
    this.currentReviewFile = null;

    new Notice('Review completed! Great work!');
  }

  isInReviewMode(): boolean {
    return this.isReviewMode;
  }

  getCurrentReviewFile(): TFile | null {
    return this.currentReviewFile;
  }

  getReviewProgress(): { current: number; total: number } {
    return {
      current: this.currentReviewIndex,
      total: this.currentReviewEntries.length
    };
  }

  stopReview(): void {
    this.endReview();
  }
}