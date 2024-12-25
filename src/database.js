const fs = require('fs').promises
const path = require('path')

const todosPath = path.join(__dirname, 'todos.json')

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

module.exports = {
	initDatabase,
	addTodo,
	getTodos,
	updateTodo,
	deleteTodo
}
