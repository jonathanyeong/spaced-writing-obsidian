import { App, PluginSettingTab, Setting } from 'obsidian';
import WritingInboxPlugin from 'src/main';


export interface PluginSettings {
  writingInboxFolder: string;
  dailyLimit: string;
  reviewTime: string;
  showStats: boolean;
}

export class SampleSettingTab extends PluginSettingTab {
	plugin: WritingInboxPlugin;

	constructor(app: App, plugin: WritingInboxPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Setting #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.dailyLimit)
				.onChange(async (value) => {
					this.plugin.settings.dailyLimit = value;
					await this.plugin.saveSettings();
				}));
	}
}