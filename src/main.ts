import type { PluginSettings } from './settings';

import { Notice, Plugin } from 'obsidian';
import { DEFAULT_SETTINGS, WritingInboxSettingTab } from './settings';
import { WritingInbox } from './core/writingInbox';
import { NewEntryModal } from './ui/newEntryModal';
import { ReviewService } from './core/reviewService';
import { createReviewExtension, reviewModeField } from './extensions/reviewExtension';

export default class WritingInboxPlugin extends Plugin {
	settings: PluginSettings;
	writingInbox: WritingInbox;
	reviewService: ReviewService;

	async onload() {
		await this.loadSettings();

		this.writingInbox = new WritingInbox(this.app.vault);
		this.reviewService = new ReviewService(this.app, this.writingInbox);

		// Register editor extension
		this.registerEditorExtension([
			reviewModeField,
			createReviewExtension(
				() => this.reviewService.getCurrentReviewFile(),
				(quality) => this.reviewService.handleReview(quality),
				() => this.reviewService.handleArchive(),
				() => this.reviewService.getReviewProgress()
			)
		]);

		this.addRibbonIcon('book-open', 'Start Daily Review', () => {
			this.startDailyReview();
		});

		this.addCommand({
			id: 'start-daily-review',
			name: 'Start Daily Review',
			callback: () => {
				this.startDailyReview();
			}
		});

		this.addCommand({
			id: 'add-new-entry',
			name: 'Add New Entry',
			callback: () => {
				this.addNewEntry();
			}
		});

		this.addCommand({
			id: 'stop-daily-review',
			name: 'Stop Daily Review',
			callback: () => {
				this.reviewService.stopReview();
			}
		});

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
			await this.reviewService.startDailyReview(this.settings.writingInboxFolder);
		} catch (error) {
			console.error('Error starting daily review:', error);
			new Notice('Error starting daily review. Please check your settings.');
		}
	}

	private async addNewEntry() {
		try {
			await this.ensureFoldersExist();
			const modal = new NewEntryModal(this.app, this.writingInbox, this.settings.writingInboxFolder);
			modal.open();
		} catch (error) {
			console.error('Error opening new entry modal:', error);
			new Notice('Error creating new entry. Please check your settings.');
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


