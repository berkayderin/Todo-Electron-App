const fs = require('fs').promises
const path = require('path')
const { app } = require('electron')

// Kullanıcının AppData klasöründe veritabanı dosyasını sakla
const userDataPath = app
	? app.getPath('userData')
	: process.env.APPDATA
const todosPath = path.join(userDataPath, 'todos.json')
const backupDir = path.join(userDataPath, 'backups')

// Türkiye saat diliminde tarih oluşturma yardımcı fonksiyonu
function getCurrentDateTime() {
	const now = new Date()
	return now.toLocaleString('tr-TR', {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hour12: false
	})
}

async function readTodosFile() {
	try {
		const data = await fs.readFile(todosPath, 'utf8')
		return JSON.parse(data)
	} catch (error) {
		if (error.code === 'ENOENT') {
			const initialData = {
				todo: [],
				inprogress: [],
				done: [],
				archived: []
			}
			await fs.writeFile(
				todosPath,
				JSON.stringify(initialData, null, 4)
			)
			return initialData
		}
		throw error
	}
}

async function writeTodosFile(data) {
	await fs.writeFile(todosPath, JSON.stringify(data, null, 4))
}

async function initDatabase() {
	try {
		await readTodosFile()
		console.log('Veritabanı başarıyla oluşturuldu')
	} catch (error) {
		console.error('Veritabanı oluşturma hatası:', error)
	}
}

async function addTodo(todoData, category) {
	try {
		const data = await readTodosFile()
		const newTodo = {
			id: todoData.id || Date.now(),
			title: todoData.title,
			description: todoData.description,
			priority: todoData.dueDate
				? calculatePriority(todoData.dueDate)
				: todoData.priority,
			dueDate: todoData.dueDate,
			tags: todoData.tags || [],
			completed: todoData.completed || false,
			created_at: todoData.created_at || getCurrentDateTime(),
			completed_at: todoData.completed_at || null,
			notes: todoData.notes || ''
		}

		if (!data[category]) {
			data[category] = []
		}

		data[category].unshift(newTodo)
		await writeTodosFile(data)
		return newTodo.id
	} catch (error) {
		console.error('Todo ekleme hatası:', error)
		throw error
	}
}

async function getTodos() {
	try {
		const data = await readTodosFile()
		console.log('Veritabanından okunan veriler:', data)
		return data
	} catch (error) {
		console.error('Todoları getirme hatası:', error)
		throw error
	}
}

async function updateTodo(id, updates, category) {
	try {
		const data = await readTodosFile()
		const todoIndex = data[category].findIndex((t) => t.id === id)

		if (todoIndex !== -1) {
			const todo = data[category][todoIndex]

			// Eğer todo tamamlandıysa arşive taşı
			if (updates.completed && !todo.completed) {
				const completedTime = getCurrentDateTime()
				// Tamamlanma tarihini ayarla ve arşive taşı
				const updatedTodo = {
					...todo,
					completed: true,
					completed_at: completedTime
				}
				data[category][todoIndex] = updatedTodo
				return await archiveTodo(id, category)
			}

			// Normal güncelleme işlemi
			const updatedTodo = {
				...todo,
				...updates,
				id: todo.id,
				completed:
					updates.completed !== undefined
						? updates.completed
						: todo.completed,
				completed_at: updates.completed
					? getCurrentDateTime()
					: updates.completed === false
					? null
					: todo.completed_at
			}

			data[category][todoIndex] = updatedTodo
			await writeTodosFile(data)
			return true
		}
		return false
	} catch (error) {
		console.error('Todo güncelleme hatası:', error)
		throw error
	}
}

async function deleteTodo(id, category) {
	try {
		const data = await readTodosFile()
		if (data[category]) {
			data[category] = data[category].filter((t) => t.id !== id)
			await writeTodosFile(data)
		}
	} catch (error) {
		console.error('Todo silme hatası:', error)
		throw error
	}
}

// Yedekleme ve dışa aktarma fonksiyonları
async function ensureBackupDir() {
	try {
		await fs.access(backupDir)
	} catch {
		try {
			await fs.mkdir(backupDir, { recursive: true })
		} catch (error) {
			console.error('Backup dizini oluşturma hatası:', error)
			throw error
		}
	}
}

async function createBackup() {
	try {
		await ensureBackupDir()
		const data = await readTodosFile()
		const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
		const backupPath = path.join(
			backupDir,
			`todos-backup-${timestamp}.json`
		)
		await fs.writeFile(backupPath, JSON.stringify(data, null, 4))
		console.log('Yedekleme başarıyla oluşturuldu:', backupPath)
		return backupPath
	} catch (error) {
		console.error('Yedekleme oluşturulurken hata:', error)
		throw error
	}
}

async function exportTodos(exportPath) {
	try {
		const data = await readTodosFile()
		await fs.writeFile(exportPath, JSON.stringify(data, null, 4))
		console.log('Veriler başarıyla dışa aktarıldı:', exportPath)
		return true
	} catch (error) {
		console.error('Dışa aktarma hatası:', error)
		throw error
	}
}

async function importTodos(importPath) {
	try {
		const data = await fs.readFile(importPath, 'utf8')
		const importedData = JSON.parse(data)
		await writeTodosFile(importedData)
		console.log('Veriler başarıyla içe aktarıldı')
		return true
	} catch (error) {
		console.error('İçe aktarma hatası:', error)
		throw error
	}
}

// Otomatik yedekleme için son yedekleme zamanını kontrol et
async function checkAndCreateBackup() {
	try {
		await ensureBackupDir()

		const files = await fs.readdir(backupDir)
		const backupInterval = 24 * 60 * 60 * 1000 // 24 saat

		if (files.length === 0) {
			return await createBackup()
		}

		const lastBackup = files
			.filter((f) => f.startsWith('todos-backup-'))
			.sort()
			.pop()

		if (lastBackup) {
			const lastBackupTime = new Date(
				lastBackup.split('todos-backup-')[1].split('.')[0]
			)
			const now = new Date()

			if (now - lastBackupTime >= backupInterval) {
				return await createBackup()
			}
		}
	} catch (error) {
		console.error('Yedekleme kontrolü sırasında hata:', error)
	}
}

// Öncelik hesaplama fonksiyonu ekle
function calculatePriority(dueDate) {
	if (!dueDate) return 'low'

	const now = new Date()
	const due = new Date(dueDate)
	const diffInHours = (due - now) / (1000 * 60 * 60)

	if (diffInHours <= 24) {
		return 'high'
	} else if (diffInHours <= 72) {
		return 'medium'
	} else {
		return 'low'
	}
}

// Otomatik öncelik güncelleme fonksiyonu
async function updatePriorities() {
	try {
		const data = await readTodosFile()
		let updated = false

		for (const category in data) {
			data[category] = data[category].map((todo) => {
				if (todo.dueDate && !todo.completed) {
					const newPriority = calculatePriority(todo.dueDate)
					if (todo.priority !== newPriority) {
						updated = true
						return { ...todo, priority: newPriority }
					}
				}
				return todo
			})
		}

		if (updated) {
			await writeTodosFile(data)
			return true
		}
		return false
	} catch (error) {
		console.error('Öncelik güncelleme hatası:', error)
		throw error
	}
}

// Arşiv fonksiyonları ekle
async function archiveTodo(id, category) {
	try {
		const data = await readTodosFile()
		const todoIndex = data[category].findIndex((t) => t.id === id)

		if (todoIndex !== -1) {
			const todo = data[category][todoIndex]

			// Arşiv kategorisi yoksa oluştur
			if (!data.archived) {
				data.archived = []
			}

			// Todo'yu arşive taşı ve tamamlanma bilgilerini güncelle
			const archivedTodo = {
				...todo,
				completed: true,
				completed_at: todo.completed_at || getCurrentDateTime(),
				archived_at: getCurrentDateTime(),
				original_category: category
			}

			data.archived.unshift(archivedTodo)

			// Orijinal kategoriden kaldır
			data[category].splice(todoIndex, 1)

			await writeTodosFile(data)
			return true
		}
		return false
	} catch (error) {
		console.error('Todo arşivleme hatası:', error)
		throw error
	}
}

// Arşivden geri alma fonksiyonu
async function unarchiveTodo(id) {
	try {
		const data = await readTodosFile()
		const todoIndex = data.archived.findIndex((t) => t.id === id)

		if (todoIndex !== -1) {
			const todo = data.archived[todoIndex]
			const originalCategory = todo.original_category

			// Arşivden kaldır
			data.archived.splice(todoIndex, 1)

			// Orijinal kategoriye geri ekle
			if (!data[originalCategory]) {
				data[originalCategory] = []
			}

			// Arşiv ve tamamlanma bilgilerini temizle
			const restoredTodo = {
				...todo,
				completed: false,
				completed_at: null
			}
			delete restoredTodo.archived_at
			delete restoredTodo.original_category

			// Orijinal kategoriye ekle
			data[originalCategory].unshift(restoredTodo)

			await writeTodosFile(data)
			return true
		}
		return false
	} catch (error) {
		console.error('Arşivden geri alma hatası:', error)
		throw error
	}
}

async function copyTodo(id, sourceCategory) {
	try {
		const data = await readTodosFile()
		const sourceTodo = data[sourceCategory].find((t) => t.id === id)

		if (sourceTodo) {
			const copiedTodo = {
				...sourceTodo,
				id: Date.now(),
				title: `${sourceTodo.title} (Kopya)`,
				created_at: getCurrentDateTime(),
				completed: false,
				completed_at: null
			}

			await addTodo(copiedTodo, sourceCategory)
			return copiedTodo.id
		}
		return null
	} catch (error) {
		console.error('Todo kopyalama hatası:', error)
		throw error
	}
}

async function deleteAllArchivedTodos() {
	try {
		const data = await readTodosFile()
		data.archived = []
		await writeTodosFile(data)
		return true
	} catch (error) {
		console.error('Tüm arşivlenmiş görevleri silme hatası:', error)
		throw error
	}
}

module.exports = {
	initDatabase,
	addTodo,
	getTodos,
	updateTodo,
	deleteTodo,
	createBackup,
	exportTodos,
	importTodos,
	checkAndCreateBackup,
	updatePriorities,
	calculatePriority,
	archiveTodo,
	unarchiveTodo,
	copyTodo,
	deleteAllArchivedTodos
}
