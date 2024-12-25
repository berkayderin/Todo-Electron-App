const {
	app,
	BrowserWindow,
	Notification,
	ipcMain,
	dialog
} = require('electron')
const path = require('path')

// Bildirim gönderme fonksiyonu
function showNotification(title, body) {
	new Notification({
		title: title,
		body: body,
		icon: path.join(__dirname, 'src/assets/notification-icon.png') // İsteğe bağlı
	}).show()
}

function createWindow() {
	const win = new BrowserWindow({
		width: 1920,
		height: 1080,
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false,
			enableRemoteModule: true,
			webSecurity: true,
			allowRunningInsecureContent: false
		}
	})

	win.maximize()
	win.setMenuBarVisibility(false)
	win.loadFile('src/index.html')

	// IPC mesajlarını dinle
	ipcMain.on('show-notification', (event, { title, body }) => {
		showNotification(title, body)
	})
}

app.whenReady().then(() => {
	createWindow()

	app.on('activate', () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			createWindow()
		}
	})
})

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit()
	}
})

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
