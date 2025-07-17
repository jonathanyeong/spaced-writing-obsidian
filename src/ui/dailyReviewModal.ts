import type { WritingEntry, QualityRating } from '../core/writingInbox';

import { App, Modal, TFile, Notice } from 'obsidian';
import { WritingInbox } from '../core/writingInbox';

export class DailyReviewModal extends Modal {
  private writingInbox: WritingInbox;
  private entries: WritingEntry[] = [];
  private currentIndex = 0;
  private folder: string;
  private currentFile: TFile | null = null;
  private textArea: HTMLTextAreaElement;
  private progressElement: HTMLElement;
  private actionButtonsContainer: HTMLElement;

  constructor(
    app: App,
    writingInbox: WritingInbox,
    folder: string
  ) {
    super(app);
    this.writingInbox = writingInbox;
    this.folder = folder;
  }

  async onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    // Load entries due for review
    await this.loadEntries();

    if (this.entries.length === 0) {
      this.showNoEntriesMessage();
      return;
    }

    this.createReviewInterface();
    await this.displayCurrentEntry();
  }

  private async loadEntries() {
    try {
      this.entries = await this.writingInbox.getEntriesDueForReview(this.folder);
    } catch (error) {
      console.error('Error loading entries:', error);
      new Notice('Error loading entries for review');
      this.close();
    }
  }

  private showNoEntriesMessage() {
    const { contentEl } = this;
    contentEl.createEl('div', {
      text: 'No entries due for review today!',
      cls: 'writing-inbox-no-entries'
    });

    const buttonContainer = contentEl.createEl('div', {
      cls: 'writing-inbox-button-container'
    });

    const closeButton = buttonContainer.createEl('button', {
      text: 'Close',
      cls: 'mod-cta'
    });
    closeButton.onclick = () => this.close();
  }

  private createReviewInterface() {
    const { contentEl } = this;

    // Progress indicator
    this.progressElement = contentEl.createEl('div', {
      cls: 'writing-inbox-progress'
    });

    // Entry content area
    const contentContainer = contentEl.createEl('div', {
      cls: 'writing-inbox-content-container'
    });

    this.textArea = contentContainer.createEl('textarea', {
      cls: 'writing-inbox-textarea'
    });
    this.textArea.placeholder = 'Write your response here...';

    // Action buttons
    this.actionButtonsContainer = contentEl.createEl('div', {
      cls: 'writing-inbox-actions'
    });

    this.createActionButtons();
  }

  private createActionButtons() {
    this.actionButtonsContainer.empty();

    const fruitfulBtn = this.actionButtonsContainer.createEl('button', {
      text: 'Fruitful',
      cls: 'writing-inbox-btn writing-inbox-btn-fruitful'
    });
    fruitfulBtn.onclick = () => this.handleQualityRating('fruitful');

    const skipBtn = this.actionButtonsContainer.createEl('button', {
      text: 'Skip',
      cls: 'writing-inbox-btn writing-inbox-btn-skip'
    });
    skipBtn.onclick = () => this.handleQualityRating('skip');

    const unfruitfulBtn = this.actionButtonsContainer.createEl('button', {
      text: 'Unfruitful',
      cls: 'writing-inbox-btn writing-inbox-btn-unfruitful'
    });
    unfruitfulBtn.onclick = () => this.handleQualityRating('unfruitful');

    const archiveBtn = this.actionButtonsContainer.createEl('button', {
      text: 'Archive',
      cls: 'writing-inbox-btn writing-inbox-btn-archive'
    });
    archiveBtn.onclick = () => this.handleArchive();

    // Navigation buttons
    const navContainer = this.actionButtonsContainer.createEl('div', {
      cls: 'writing-inbox-navigation'
    });

    const closeBtn = navContainer.createEl('button', {
      text: 'Close',
      cls: 'writing-inbox-btn writing-inbox-btn-close'
    });
    closeBtn.onclick = () => this.close();
  }

  private async displayCurrentEntry() {
    if (this.currentIndex >= this.entries.length) {
      this.showCompletionMessage();
      return;
    }

    const entry = this.entries[this.currentIndex];

    // Get the file for this entry
    this.currentFile = await this.writingInbox.getFileForEntry(entry);

    if (!this.currentFile) {
      new Notice('Error: Could not find file for entry');
      return;
    }

    // Update progress
    this.progressElement.textContent = `Entry ${this.currentIndex + 1} of ${this.entries.length}`;

    // Display content
    this.textArea.value = entry.content;
    this.textArea.focus();

    // Update action buttons
    this.createActionButtons();
  }

  private async handleQualityRating(quality: QualityRating) {
    if (!this.currentFile) {
      new Notice('Error: No current entry file');
      return;
    }

    try {
      const content = this.textArea.value;
      await this.writingInbox.reviewEntry(this.currentFile, content, quality);

      new Notice(`Entry marked as ${quality}`);

      // Move to next entry or show completion
      if (this.currentIndex < this.entries.length - 1) {
        this.currentIndex++;
        await this.displayCurrentEntry();
      } else {
        this.showCompletionMessage();
      }
    } catch (error) {
      console.error('Error updating entry:', error);
      new Notice('Error saving entry');
    }
  }

  private async handleArchive() {
    if (!this.currentFile) {
      new Notice('Error: No current entry file');
      return;
    }

    try {
      await this.writingInbox.archiveEntry(this.currentFile);
      new Notice('Entry archived');

      // Remove from current entries array
      this.entries.splice(this.currentIndex, 1);

      // Adjust current index if needed
      if (this.currentIndex >= this.entries.length && this.entries.length > 0) {
        this.currentIndex = this.entries.length - 1;
      }

      // Display next entry or completion message
      if (this.entries.length === 0) {
        this.showCompletionMessage();
      } else {
        await this.displayCurrentEntry();
      }
    } catch (error) {
      console.error('Error archiving entry:', error);
      new Notice('Error archiving entry');
    }
  }

  private showCompletionMessage() {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl('div', {
      text: 'All entries reviewed! Great work!',
      cls: 'writing-inbox-completion'
    });

    const buttonContainer = contentEl.createEl('div', {
      cls: 'writing-inbox-button-container'
    });

    const closeButton = buttonContainer.createEl('button', {
      text: 'Close',
      cls: 'mod-cta'
    });
    closeButton.onclick = () => this.close();
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}