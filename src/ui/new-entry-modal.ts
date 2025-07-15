import { App, Modal, Notice } from 'obsidian';
import { EntryManager } from '../core/entry-manager';

export class NewEntryModal extends Modal {
  private entryManager: EntryManager;
  private folder: string;
  private textArea: HTMLTextAreaElement;

  constructor(
    app: App, 
    entryManager: EntryManager, 
    folder: string
  ) {
    super(app);
    this.entryManager = entryManager;
    this.folder = folder;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl('h2', { text: 'Add New Writing Entry' });

    // Content input area
    const contentContainer = contentEl.createEl('div', {
      cls: 'writing-inbox-content-container'
    });

    contentContainer.createEl('label', {
      text: 'Entry Content:',
      cls: 'writing-inbox-label'
    });

    this.textArea = contentContainer.createEl('textarea', {
      cls: 'writing-inbox-textarea writing-inbox-new-entry-textarea'
    });
    this.textArea.placeholder = 'Write your new entry here...';
    this.textArea.focus();

    // Action buttons
    const actionContainer = contentEl.createEl('div', {
      cls: 'writing-inbox-actions'
    });

    const createButton = actionContainer.createEl('button', {
      text: 'Create Entry',
      cls: 'mod-cta'
    });
    createButton.onclick = () => this.handleCreateEntry();

    const cancelButton = actionContainer.createEl('button', {
      text: 'Cancel'
    });
    cancelButton.onclick = () => this.close();

    // Handle Enter key for creation (Ctrl+Enter or Cmd+Enter)
    this.textArea.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        this.handleCreateEntry();
      }
    });
  }

  private async handleCreateEntry() {
    const content = this.textArea.value.trim();

    if (!content) {
      new Notice('Please enter some content for the entry');
      return;
    }

    try {
      await this.entryManager.createEntry(content, this.folder);
      new Notice('Entry created successfully!');
      this.close();
    } catch (error) {
      console.error('Error creating entry:', error);
      new Notice('Error creating entry');
    }
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}