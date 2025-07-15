import type { PluginSettings } from './settings';

import { Notice, Plugin, TFolder } from 'obsidian';
import { DEFAULT_SETTINGS, WritingInboxSettingTab } from './settings';
import { EntryManager } from './core/entry-manager';
import { DailyReviewModal } from './ui/daily-review-modal';
import { NewEntryModal } from './ui/new-entry-modal';

export default class WritingInboxPlugin extends Plugin {
	settings: PluginSettings;
	entryManager: EntryManager;

	async onload() {
		await this.loadSettings();

		this.entryManager = new EntryManager(this.app.vault);

		// Ribbon icon for daily review
		this.addRibbonIcon('book-open', 'Start Daily Review', () => {
			this.startDailyReview();
		});

		// Command: Start Daily Review
		this.addCommand({
			id: 'start-daily-review',
			name: 'Start Daily Review',
			callback: () => {
				this.startDailyReview();
			}
		});

		// Command: Add New Entry
		this.addCommand({
			id: 'add-new-entry',
			name: 'Add New Entry',
			callback: () => {
				this.addNewEntry();
			}
		});

		// Command: Open Writing Inbox Folder
		this.addCommand({
			id: 'open-writing-inbox-folder',
			name: 'Open Writing Inbox Folder',
			callback: () => {
				this.openWritingInboxFolder();
			}
		});

		// Settings tab
		this.addSettingTab(new WritingInboxSettingTab(this.app, this));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	private async startDailyReview() {
		try {
			await this.ensureFoldersExist();
			const modal = new DailyReviewModal(this.app, this.entryManager, this.settings.writingInboxFolder);
			modal.open();
		} catch (error) {
			console.error('Error starting daily review:', error);
			new Notice('Error starting daily review. Please check your settings.');
		}
	}

	private async addNewEntry() {
		try {
			await this.ensureFoldersExist();
			const modal = new NewEntryModal(this.app, this.entryManager, this.settings.writingInboxFolder);
			modal.open();
		} catch (error) {
			console.error('Error opening new entry modal:', error);
			new Notice('Error creating new entry. Please check your settings.');
		}
	}

	private async openWritingInboxFolder() {
		const folder = this.app.vault.getAbstractFileByPath(this.settings.writingInboxFolder);
		if (folder instanceof TFolder) {
			// Navigate to the folder in the file explorer instead of trying to open it as a file
			this.app.workspace.getLeaf().setViewState({
				type: 'file-explorer',
				state: { file: folder.path }
			});
		} else {
			new Notice(`Writing inbox folder not found: ${this.settings.writingInboxFolder}`);
		}
	}

	private async ensureFoldersExist() {
		const basePath = this.settings.writingInboxFolder;
		const entriesPath = `${basePath}/entries`;
		const archivePath = `${basePath}/archive`;

		// Create base folder if it doesn't exist
		if (!this.app.vault.getAbstractFileByPath(basePath)) {
			await this.app.vault.createFolder(basePath);
		}

		// Create entries folder if it doesn't exist
		if (!this.app.vault.getAbstractFileByPath(entriesPath)) {
			await this.app.vault.createFolder(entriesPath);
		}

		// Create archive folder if it doesn't exist
		if (!this.app.vault.getAbstractFileByPath(archivePath)) {
			await this.app.vault.createFolder(archivePath);
		}
	}
}


