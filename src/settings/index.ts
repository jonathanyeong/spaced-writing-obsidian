import type WritingInboxPlugin from '../main';

import { App, PluginSettingTab, Setting } from 'obsidian';

export interface PluginSettings {
  writingInboxFolder: string;
  dailyLimit: string;
  reviewTime: string;
}

export const DEFAULT_SETTINGS: PluginSettings = {
	writingInboxFolder: 'writing-inbox',
	dailyLimit: '10',
	reviewTime: '09:00'
};

export class WritingInboxSettingTab extends PluginSettingTab {
	plugin: WritingInboxPlugin;

	constructor(app: App, plugin: WritingInboxPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', { text: 'Writing Inbox Settings' });

		new Setting(containerEl)
			.setName('Writing Inbox Folder')
			.setDesc('The folder where writing entries will be stored')
			.addText(text => text
				.setPlaceholder('Example: folder1/folder2')
				.setValue(this.plugin.settings.writingInboxFolder)
				.onChange(async (value) => {
					this.plugin.settings.writingInboxFolder = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Daily Entry Limit')
			.setDesc('Maximum number of entries to review per day')
			.addText(text => text
				.setPlaceholder('10')
				.setValue(this.plugin.settings.dailyLimit)
				.onChange(async (value) => {
					this.plugin.settings.dailyLimit = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Review Time')
			.setDesc('Preferred time for daily reviews (HH:MM format)')
			.addText(text => text
				.setPlaceholder('09:00')
				.setValue(this.plugin.settings.reviewTime)
				.onChange(async (value) => {
					this.plugin.settings.reviewTime = value;
					await this.plugin.saveSettings();
				}));
	}
}