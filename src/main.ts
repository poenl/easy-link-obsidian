import { Editor, Plugin, requestUrl, moment } from 'obsidian'
import { EditorView } from '@codemirror/view'
import { SettingTab } from './settings'
import { i18n } from './lang'

const DEFAULT_SETTINGS = {
	autoFormat: true,
	placeholder: '[Parsing URL...]'
}
const IGNORE_REG = [/<$/, /^\[.*\]:\s*/]

export default class EasyLinkPlugin extends Plugin {
	settings: typeof DEFAULT_SETTINGS

	async onload() {
		await this.loadSettings()
		i18n(moment.locale())

		this.registerEvent(
			this.app.workspace.on('editor-paste', async (evt, editor: Editor) => {
				// @ts-expect-error, not typed
				const editorView = editor.cm as EditorView

				if (!this.settings.autoFormat) return
				// 剪切板内容
				const clipboardText = evt.clipboardData?.getData('text/plain')
				if (!clipboardText) return

				const url = URL.parse(clipboardText)
				if (!url) return
				// 阻止默认粘贴行为
				evt.preventDefault()
				// 替换为markdown链接
				const select = editor.getSelection()
				if (select) {
					editor.replaceSelection(`[${select}](${url.href})`)
					return
				}

				const from = editor.getCursor('from')
				const fromOffset = editor.posToOffset(from)
				// 处理需要跳过的情况
				const lineText = editor.getLine(from.line)
				for (let index = 0; index < this.ignore.length; index++) {
					const reg = this.ignore[index]
					if (lineText.match(reg)) {
						editor.replaceSelection(clipboardText)
						return
					}
				}
				// 插入占位符
				const placeholder = this.settings.placeholder.replace('{url}', url.href)

				editorView.dispatch({
					changes: {
						from: fromOffset,
						to: fromOffset,
						insert: placeholder
					}
				})
				const to = {
					line: from.line,
					ch: from.ch + placeholder.length
				}
				// 移动光标
				editor.setCursor(to)

				let finalLink = clipboardText

				// 自动获取网页标题
				try {
					const res = await requestUrl(url.href)
					const contentType = res.headers['content-type']

					const line = editor.getLine(from.line)

					if (contentType && contentType.startsWith('text/html')) {
						const html = res.text
						const titleMatch = html.match(/<title>(.*?)<\/title>/)
						const title = titleMatch?.[1] ? titleMatch[1] : 'no title'

						finalLink = `[${title}](${url.href})`
					} else if (contentType && contentType.startsWith('image')) {
						finalLink = `![${url.pathname.replace(/.*\//, '')}](${url.href})`
					}
					editor.setLine(from.line, line.replace(placeholder, finalLink))
				} catch {}
			})
		)

		this.addSettingTab(new SettingTab(this.app, this))
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData())
	}

	async saveSettings() {
		await this.saveData(this.settings)
	}

	// 需要跳过的情况
	ignore: RegExp[] = IGNORE_REG
}
