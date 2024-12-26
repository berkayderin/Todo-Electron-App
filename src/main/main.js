const { app, BrowserWindow } = require('electron')
const path = require('path')
require('./ipc/handlers')

// Renderer process'te app modülünü kullanabilmek için
app.allowRendererProcessReuse = true

function createWindow() {
	const win = new BrowserWindow({
		width: 1920,
		height: 1080,
		icon: path.join(__dirname, '../assets/icon.ico'),
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
	win.loadFile(path.join(__dirname, '../renderer/pages/index.html'))
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
