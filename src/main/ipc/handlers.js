const { ipcMain, dialog, app, Notification } = require('electron')
const path = require('path')

// IPC olaylarını dinle
ipcMain.handle('export-todos', async () => {
	const { filePath } = await dialog.showSaveDialog({
		title: 'Todoları Dışa Aktar',
		defaultPath: path.join(
			app.getPath('documents'),
			'todos-export.json'
		),
		filters: [{ name: 'JSON', extensions: ['json'] }]
	})

	if (filePath) {
		return filePath
	}
})

ipcMain.handle('import-todos', async () => {
	const { filePaths } = await dialog.showOpenDialog({
		title: 'Todoları İçe Aktar',
		properties: ['openFile'],
		filters: [{ name: 'JSON', extensions: ['json'] }]
	})

	if (filePaths && filePaths.length > 0) {
		return filePaths[0]
	}
})

// Bildirim gönderme fonksiyonu
function showNotification(title, body) {
	new Notification({
		title: 'Deep Todo - ' + title,
		body: body,
		icon: path.join(__dirname, '../../assets/icon.ico'),
		silent: false,
		timeoutType: 'default'
	}).show()
}

// IPC mesajlarını dinle
ipcMain.on('show-notification', (event, { title, body }) => {
	showNotification(title, body)
})

module.exports = {
	showNotification
}
