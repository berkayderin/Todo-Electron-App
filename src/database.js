const fs = require('fs').promises
const path = require('path')

const todosPath = path.join(__dirname, 'todos.json')
const backupDir = path.join(__dirname, 'backups')

async function readTodosFile() {
	try {
		const data = await fs.readFile(todosPath, 'utf8')
		return JSON.parse(data)
	} catch (error) {
		if (error.code === 'ENOENT') {
			const initialData = {
				todo: [],
				inprogress: [],
				done: []
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
			priority: todoData.priority,
			dueDate: todoData.dueDate,
			tags: todoData.tags || [],
			completed: todoData.completed || false,
			created_at: todoData.created_at || new Date().toISOString(),
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
			const updatedTodo = {
				...todo,
				...updates,
				id: todo.id, // ID'nin değişmemesini sağla
				completed:
					updates.completed !== undefined
						? updates.completed
						: todo.completed,
				completed_at: updates.completed
					? new Date().toISOString()
					: todo.completed_at
			}

			data[category][todoIndex] = updatedTodo
			await writeTodosFile(data)
			console.log('Todo güncellendi:', updatedTodo)
		}
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

module.exports = {
	initDatabase,
	addTodo,
	getTodos,
	updateTodo,
	deleteTodo,
	createBackup,
	exportTodos,
	importTodos,
	checkAndCreateBackup
}
