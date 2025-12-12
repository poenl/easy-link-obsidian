import { App, PluginSettingTab, Setting, Notice } from 'obsidian'
import EasyLinkPlugin from './main'
import { t } from './lang'
import manifest from '../manifest.json'

export class SettingTab extends PluginSettingTab {
	plugin: EasyLinkPlugin

	constructor(app: App, plugin: EasyLinkPlugin) {
		super(app, plugin)
		this.plugin = plugin
	}

	display(): void {
		const { containerEl } = this

		containerEl.empty()

		new Setting(containerEl).setName(manifest.name).setHeading()

		new Setting(containerEl)
			.setName(t({ en: 'Placeholder Text', zh: '占位符文本' }))
			.setDesc(
				t({
					en: 'The placeholder text before the URL is parsed, {url} represents the pasted URL',
					zh: 'URL解析完成前的占位符文本，{url}表示粘贴的URL'
				})
			)
			.addText((text) => {
				text.setValue(this.plugin.settings.placeholder).onChange(async (value) => {
					this.plugin.settings.placeholder = value
					try {
						await this.plugin.saveData(this.plugin.settings)
					} catch {
						new Notice(t({ en: 'Save failed', zh: '保存失败' }))
					}
				})
			})
	}
}
