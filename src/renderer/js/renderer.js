const db = require('../../shared/database/database')
const { ipcRenderer } = require('electron')

// Veritabanını başlat
db.initDatabase()

// Bildirim fonksiyonunu global scope'a taşı
function sendNotification(title, body) {
	ipcRenderer.send('show-notification', { title, body })
}

// Görev son tarihi yaklaşan todolar için bildirim kontrolü
async function checkDueDateNotifications() {
	try {
		const todos = await db.getTodos()
		const now = new Date()
		const oneDayInMs = 24 * 60 * 60 * 1000

		Object.values(todos)
			.flat()
			.forEach((todo) => {
				if (todo.dueDate && !todo.completed) {
					const dueDate = new Date(todo.dueDate)
					const timeUntilDue = dueDate - now

					// Son 24 saat kaldıysa bildirim gönder
					if (timeUntilDue > 0 && timeUntilDue <= oneDayInMs) {
						sendNotification(
							'Görev Hatırlatması',
							`"${todo.title}" görevi için son 24 saat!`
						)
					}
				}
			})
	} catch (error) {
		console.error('Bildirim kontrolü sırasında hata:', error)
	}
}

const categories = ['todo', 'inprogress', 'done']
const todoModal = document.getElementById('todoModal')
const todoModalForm = document.getElementById('todoModalForm')
const todoCategory = document.getElementById('todoCategory')
const modalContent = todoModal.querySelector('.bg-white')
const modalOverlay = todoModal.querySelector('.bg-black')

// Sürükle-bırak işlemleri için değişkenler
let draggedItem = null
let draggedCategory = null

// Modal elementleri
const editModal = document.getElementById('editModal')
const editModalForm = document.getElementById('editModalForm')
const editModalContent = editModal.querySelector('.bg-white')
const editModalOverlay = editModal.querySelector('.bg-black')

// Silme modalı elementleri
const deleteModal = document.getElementById('deleteModal')
const deleteModalContent = deleteModal.querySelector('.relative')
const deleteModalOverlay = deleteModal.querySelector('.absolute')
let todoToDelete = null

// Detay modalı elementleri
const detailModal = document.getElementById('detailModal')
const detailModalContent = detailModal.querySelector('.relative')
const detailModalOverlay = detailModal.querySelector('.absolute')

// Takvim değişkenleri
const calendarModal = document.getElementById('calendarModal')
const calendarModalContent = calendarModal.querySelector('.relative')
const calendarModalOverlay = calendarModal.querySelector('.absolute')
const calendarDays = document.getElementById('calendar-days')
const currentMonthElement = document.getElementById('currentMonth')
const prevMonthButton = document.getElementById('prevMonth')
const nextMonthButton = document.getElementById('nextMonth')
let currentDate = new Date()

// Modal işlemleri
function openTodoModal(category) {
	todoCategory.value = category
	todoModal.classList.remove('invisible', 'opacity-0')
	modalOverlay.classList.add('opacity-50')
	modalContent.classList.remove('scale-95', 'opacity-0')
	modalContent.classList.add('scale-100', 'opacity-100')
}

function closeTodoModal() {
	modalContent.classList.remove('scale-100', 'opacity-100')
	modalContent.classList.add('scale-95', 'opacity-0')
	modalOverlay.classList.remove('opacity-50')

	setTimeout(() => {
		todoModal.classList.add('invisible', 'opacity-0')
		todoModalForm.reset()
	}, 300)
}

// Modal dışına tıklandığında kapatma
modalOverlay.addEventListener('click', closeTodoModal)

// ESC tuşuna basıldığında modalı kapat
document.addEventListener('keydown', (e) => {
	if (
		e.key === 'Escape' &&
		!todoModal.classList.contains('invisible')
	) {
		closeTodoModal()
	}
})

// Öncelik renklerini belirle
const priorityColors = {
	low: {
		bg: 'bg-emerald-50',
		text: 'text-emerald-700',
		label: 'Düşük'
	},
	medium: {
		bg: 'bg-amber-50',
		text: 'text-amber-700',
		label: 'Orta'
	},
	high: {
		bg: 'bg-rose-50',
		text: 'text-rose-700',
		label: 'Yüksek'
	}
}

// Sürükle-bırak işlevleri
function handleDragStart(e, todoId, category) {
	e.stopPropagation()
	draggedItem = Number(todoId)
	draggedCategory = category
	e.target.classList.add('opacity-50')

	const dragData = {
		id: todoId,
		category: category
	}

	try {
		e.dataTransfer.setData(
			'application/json',
			JSON.stringify(dragData)
		)
		e.dataTransfer.effectAllowed = 'move'
	} catch (error) {
		console.error('Sürükleme başlatılırken hata:', error)
	}
}

function handleDragEnd(e) {
	e.stopPropagation()
	e.target.classList.remove('opacity-50')
	draggedItem = null
	draggedCategory = null
}

function handleDragOver(e) {
	e.preventDefault()
	e.stopPropagation()
	e.dataTransfer.dropEffect = 'move'
}

function handleDragEnter(e) {
	e.preventDefault()
	e.stopPropagation()
	const container = e.target.closest('.list-container')
	if (container) {
		container.classList.add('bg-white/20')
	}
}

function handleDragLeave(e) {
	e.preventDefault()
	e.stopPropagation()
	const container = e.target.closest('.list-container')
	const relatedContainer = e.relatedTarget?.closest('.list-container')
	if (container && container !== relatedContainer) {
		container.classList.remove('bg-white/20')
	}
}

async function handleDrop(e, targetCategory) {
	e.preventDefault()
	e.stopPropagation()

	const container = e.target.closest('.list-container')
	if (container) {
		container.classList.remove('bg-white/20')
	}

	try {
		const dragData = e.dataTransfer.getData('application/json')
		if (!dragData) {
			console.error('Sürüklenen veri bulunamadı')
			return
		}

		const { id, category: sourceCategory } = JSON.parse(dragData)
		if (!id || !sourceCategory) {
			console.error('Geçersiz sürükleme verisi:', dragData)
			return
		}

		if (sourceCategory && sourceCategory !== targetCategory) {
			// Önce tüm todoları al
			const allTodos = await db.getTodos()

			// Kaynak kategorideki todo'yu bul
			const sourceList = allTodos[sourceCategory]
			if (!sourceList) {
				console.error('Kaynak liste bulunamadı:', sourceCategory)
				return
			}

			const todoToMove = sourceList.find((t) => t.id === Number(id))
			if (!todoToMove) {
				console.error('Taşınacak todo bulunamadı:', id)
				return
			}

			// Todo'yu kaynaktan sil
			await db.deleteTodo(Number(id), sourceCategory)

			// Todo'yu hedef listeye ekle (completed durumunu değiştirmeden)
			await db.addTodo(todoToMove, targetCategory)

			// Arayüzü güncelle
			await loadTodos()
		}
	} catch (error) {
		console.error('Todo taşınırken hata:', error)
	}
}

// Modal işlemleri
function openEditModal(todo, category) {
	// Form alanlarını doldur
	document.getElementById('editTodoId').value = todo.id
	document.getElementById('editTodoCategory').value = category
	document.getElementById('editTodoTitle').value = todo.title
	document.getElementById('editTodoDescription').value =
		todo.description || ''
	document.getElementById('editTodoPriority').value = todo.priority
	document.getElementById('editTodoDueDate').value =
		todo.dueDate || ''
	document.getElementById('editTodoTags').value = todo.tags
		? todo.tags.join(', ')
		: ''
	document.getElementById('editTodoNotes').value = todo.notes || ''

	// Modalı göster
	editModal.classList.remove('invisible', 'opacity-0')
	editModalOverlay.classList.add('opacity-50')
	editModalContent.classList.remove('scale-95', 'opacity-0')
	editModalContent.classList.add('scale-100', 'opacity-100')
}

function closeEditModal() {
	editModalContent.classList.remove('scale-100', 'opacity-100')
	editModalContent.classList.add('scale-95', 'opacity-0')
	editModalOverlay.classList.remove('opacity-50')

	setTimeout(() => {
		editModal.classList.add('invisible', 'opacity-0')
		editModalForm.reset()
	}, 300)
}

// Modal dışına tıklandığında kapatma
editModalOverlay.addEventListener('click', closeEditModal)

// ESC tuşuna basıldığında modalı kapat
document.addEventListener('keydown', (e) => {
	if (
		e.key === 'Escape' &&
		!editModal.classList.contains('invisible')
	) {
		closeEditModal()
	}
})

// Form submit olayını dinle
editModalForm.addEventListener('submit', async (e) => {
	e.preventDefault()
	const todoId = Number(document.getElementById('editTodoId').value)
	const category = document.getElementById('editTodoCategory').value
	const todoData = {
		title: document.getElementById('editTodoTitle').value.trim(),
		description: document
			.getElementById('editTodoDescription')
			.value.trim(),
		priority: document.getElementById('editTodoPriority').value,
		dueDate: document.getElementById('editTodoDueDate').value,
		tags: document
			.getElementById('editTodoTags')
			.value.split(',')
			.map((tag) => tag.trim())
			.filter((tag) => tag),
		notes: document.getElementById('editTodoNotes').value.trim()
	}

	try {
		await db.updateTodo(todoId, todoData, category)
		closeEditModal()
		loadTodos()
	} catch (error) {
		console.error('Todo güncellenirken hata:', error)
	}
})

// Global fonksiyonları tanımla
window.toggleTodo = async function (id, completed, category) {
	try {
		await db.updateTodo(id, { completed }, category)
		if (completed) {
			const todos = await db.getTodos()
			const todo = todos[category].find((t) => t.id === id)
			if (todo) {
				sendNotification(
					'Görev Tamamlandı',
					`"${todo.title}" görevi başarıyla tamamlandı!`
				)
			}
		}
		loadTodos()
	} catch (error) {
		console.error('Todo durumu güncellenirken hata:', error)
	}
}

window.openEditModal = function (todo, category) {
	// Form alanlarını doldur
	document.getElementById('editTodoId').value = todo.id
	document.getElementById('editTodoCategory').value = category
	document.getElementById('editTodoTitle').value = todo.title
	document.getElementById('editTodoDescription').value =
		todo.description || ''
	document.getElementById('editTodoPriority').value = todo.priority
	document.getElementById('editTodoDueDate').value =
		todo.dueDate || ''
	document.getElementById('editTodoTags').value = todo.tags
		? todo.tags.join(', ')
		: ''
	document.getElementById('editTodoNotes').value = todo.notes || ''

	// Modalı göster
	editModal.classList.remove('invisible', 'opacity-0')
	editModalOverlay.classList.add('opacity-50')
	editModalContent.classList.remove('scale-95', 'opacity-0')
	editModalContent.classList.add('scale-100', 'opacity-100')
}

// Silme modalı işlemleri
function openDeleteModal(id, category) {
	todoToDelete = { id, category }
	deleteModal.classList.remove('invisible', 'opacity-0')
	deleteModalOverlay.classList.add('opacity-50')
	deleteModalContent.classList.remove('scale-95', 'opacity-0')
	deleteModalContent.classList.add('scale-100', 'opacity-100')
}

function closeDeleteModal() {
	deleteModalContent.classList.remove('scale-100', 'opacity-100')
	deleteModalContent.classList.add('scale-95', 'opacity-0')
	deleteModalOverlay.classList.remove('opacity-50')

	setTimeout(() => {
		deleteModal.classList.add('invisible', 'opacity-0')
		todoToDelete = null
	}, 300)
}

// Tüm todoları yükle
async function loadTodos() {
	try {
		const todos = await db.getTodos()

		categories.forEach((category) => {
			const todoList = document.getElementById(`${category}-list`)
			todoList.innerHTML = ''

			todos[category].forEach((todo) => {
				const li = createTodoCard(todo, category)

				// Olay dinleyicilerini ekle
				const checkbox = li.querySelector('.todo-checkbox')
				checkbox.addEventListener('change', () => {
					window.toggleTodo(todo.id, checkbox.checked, category)
				})

				const viewButton = li.querySelector('.view-todo-btn')
				viewButton.addEventListener('click', (e) => {
					e.stopPropagation()
					openDetailModal(todo, category)
				})

				const copyButton = li.querySelector('.copy-todo-btn')
				copyButton.addEventListener('click', (e) => {
					e.stopPropagation()
					copyTodoCard(todo.id, category)
				})

				const editButton = li.querySelector('.edit-todo-btn')
				editButton.addEventListener('click', (e) => {
					e.stopPropagation()
					openEditModal(todo, category)
				})

				const deleteButton = li.querySelector('.delete-todo-btn')
				deleteButton.addEventListener('click', (e) => {
					e.stopPropagation()
					openDeleteModal(todo.id, category)
				})

				todoList.appendChild(li)
			})
		})
	} catch (error) {
		console.error('Todolar yüklenirken hata:', error)
	}
}

// Sayfa yüklendiğinde todoları yükle
document.addEventListener('DOMContentLoaded', loadTodos)

// Event listener'ları ekle
document.addEventListener('DOMContentLoaded', () => {
	// Sürükle-bırak olaylarını ekle
	const containers = document.querySelectorAll('.list-container')
	containers.forEach((container) => {
		const category = container.dataset.category

		container.addEventListener('dragover', handleDragOver)
		container.addEventListener('dragenter', handleDragEnter)
		container.addEventListener('dragleave', handleDragLeave)
		container.addEventListener('drop', (e) => handleDrop(e, category))
	})

	// Kategori başlıklarındaki "+" butonlarına event listener ekle
	const addButtons = document.querySelectorAll('.add-todo-btn')
	addButtons.forEach((button) => {
		button.addEventListener('click', () => {
			const category = button.dataset.category
			openTodoModal(category)
		})
	})

	// Modal kapatma butonlarına event listener ekle
	const closeTodoButtons = document.querySelectorAll(
		'.close-todo-modal'
	)
	closeTodoButtons.forEach((button) => {
		button.addEventListener('click', closeTodoModal)
	})

	const closeEditButtons = document.querySelectorAll(
		'.close-edit-modal'
	)
	closeEditButtons.forEach((button) => {
		button.addEventListener('click', closeEditModal)
	})

	// Silme modalı kapatma butonlarına event listener ekle
	const closeDeleteButtons = document.querySelectorAll(
		'.close-delete-modal'
	)
	closeDeleteButtons.forEach((button) => {
		button.addEventListener('click', closeDeleteModal)
	})

	// Silme onay butonuna event listener ekle
	const confirmDeleteButton = document.getElementById('confirmDelete')
	confirmDeleteButton.addEventListener('click', async () => {
		if (todoToDelete) {
			try {
				await db.deleteTodo(todoToDelete.id, todoToDelete.category)
				closeDeleteModal()
				loadTodos()
			} catch (error) {
				console.error('Todo silme hatası:', error)
			}
		}
	})

	// ESC tuşuna basıldığında modalı kapat
	document.addEventListener('keydown', (e) => {
		if (
			e.key === 'Escape' &&
			!deleteModal.classList.contains('invisible')
		) {
			closeDeleteModal()
		}
	})

	// Modal dışına tıklandığında kapat
	deleteModalOverlay.addEventListener('click', closeDeleteModal)

	// Başlangıçta todoları yükle
	loadTodos()

	// Detay modalı kapatma butonlarına event listener ekle
	const closeDetailButtons = document.querySelectorAll(
		'.close-detail-modal'
	)
	closeDetailButtons.forEach((button) => {
		button.addEventListener('click', closeDetailModal)
	})

	// ESC tuşuna basıldığında modalı kapat
	document.addEventListener('keydown', (e) => {
		if (
			e.key === 'Escape' &&
			!detailModal.classList.contains('invisible')
		) {
			closeDetailModal()
		}
	})

	// Modal dışına tıklandığında kapat
	detailModalOverlay.addEventListener('click', closeDetailModal)

	// Her saat başı bildirim kontrolü yap
	setInterval(checkDueDateNotifications, 60 * 60 * 1000)

	// Sayfa yüklendiğinde ilk kontrolü yap
	checkDueDateNotifications()

	// Form submit olayını dinle
	todoModalForm.addEventListener('submit', async (e) => {
		e.preventDefault()
		const category = todoCategory.value
		const todoData = {
			id: Date.now(),
			title: document.getElementById('todoTitle').value.trim(),
			description: document
				.getElementById('todoDescription')
				.value.trim(),
			priority: document.getElementById('todoPriority').value,
			dueDate: document.getElementById('todoDueDate').value,
			tags: document
				.getElementById('todoTags')
				.value.split(',')
				.map((tag) => tag.trim())
				.filter((tag) => tag),
			notes: document.getElementById('todoNotes').value.trim(),
			completed: false
		}

		try {
			await db.addTodo(todoData, category)
			closeTodoModal()
			loadTodos()
			sendNotification('Başarılı', 'Yeni kart başarıyla eklendi.')
		} catch (error) {
			console.error('Todo eklenirken hata:', error)
			sendNotification('Hata', 'Kart eklenirken bir hata oluştu.')
		}
	})

	// Otomatik yedeklemeyi başlat
	startAutoBackup()

	// Dışa/İçe aktarma butonları için event listener'lar
	const exportTodosBtn = document.getElementById('exportTodosBtn')
	const importTodosBtn = document.getElementById('importTodosBtn')

	if (exportTodosBtn) {
		exportTodosBtn.addEventListener('click', exportTodosToFile)
	}

	if (importTodosBtn) {
		importTodosBtn.addEventListener('click', importTodosFromFile)
	}

	const calendarBtn = document.getElementById('calendarBtn')
	const closeCalendarBtn = calendarModal.querySelector(
		'.close-calendar-modal'
	)

	calendarBtn.addEventListener('click', openCalendarModal)
	closeCalendarBtn.addEventListener('click', closeCalendarModal)
	calendarModalOverlay.addEventListener('click', closeCalendarModal)

	prevMonthButton.addEventListener('click', () => {
		currentDate.setMonth(currentDate.getMonth() - 1)
		renderCalendar()
	})

	nextMonthButton.addEventListener('click', () => {
		currentDate.setMonth(currentDate.getMonth() + 1)
		renderCalendar()
	})

	// ESC tuşu ile kapatma
	document.addEventListener('keydown', (e) => {
		if (
			e.key === 'Escape' &&
			!calendarModal.classList.contains('invisible')
		) {
			closeCalendarModal()
		}
	})

	// Öncelik güncelleme aralığını ayarla (her 1 saatte bir)
	const PRIORITY_UPDATE_INTERVAL = 60 * 60 * 1000

	// Otomatik öncelik güncelleme fonksiyonu
	async function checkAndUpdatePriorities() {
		try {
			const updated = await db.updatePriorities()
			if (updated) {
				await loadTodos() // Arayüzü güncelle
				console.log('Öncelikler güncellendi')
			}
		} catch (error) {
			console.error('Öncelik kontrolü sırasında hata:', error)
		}
	}

	// İlk öncelik kontrolünü yap
	checkAndUpdatePriorities()

	// Periyodik kontrol başlat
	setInterval(checkAndUpdatePriorities, PRIORITY_UPDATE_INTERVAL)

	// Yeni kart ekleme butonlarını dinle
	document.querySelectorAll('.add-todo-btn').forEach((btn) => {
		btn.addEventListener('click', () => {
			const category = btn.dataset.category
			openTodoModal(category)
		})
	})

	// Modal kapatma butonlarını dinle
	document.querySelectorAll('.close-todo-modal').forEach((btn) => {
		btn.addEventListener('click', closeTodoModal)
	})

	// Github butonu işlemleri
	const githubButton = document.getElementById('githubButton')
	if (githubButton) {
		githubButton.addEventListener('click', (e) => {
			e.preventDefault()
			e.stopPropagation()
			ipcRenderer.send('open-github')
		})
	}
})

// Global deleteTodo fonksiyonunu güncelle
window.deleteTodo = function (id, category) {
	openDeleteModal(id, category)
}

// Detay modalı işlemleri
function openDetailModal(todo, category) {
	const todoDetail = document.getElementById('todoDetail')
	const priorityColor = priorityColors[todo.priority]

	todoDetail.innerHTML = `
		<div class="space-y-6">
			<div class="flex items-center justify-between">
				<div class="flex items-center space-x-4">
					<div class="flex-shrink-0">
						<span class="inline-flex items-center justify-center w-12 h-12 rounded-xl ${
							priorityColor.bg
						} ${priorityColor.text}">
							<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
							</svg>
						</span>
					</div>
					<div>
						<h2 class="text-2xl font-semibold text-gray-900 dark:text-white">${
							todo.title
						}</h2>
						<p class="text-sm text-gray-500 dark:text-gray-400">Oluşturulma: ${
							todo.created_at
						}</p>
					</div>
				</div>
				<span class="px-3 py-1 text-sm font-medium rounded-full ${
					priorityColor.bg
				} ${priorityColor.text}">
					${priorityColor.label} Öncelik
				</span>
			</div>

			${
				todo.description
					? `
				<div class="prose prose-blue max-w-none">
					<h3 class="text-lg font-medium text-gray-900 dark:text-white">Açıklama</h3>
					<p class="text-gray-600 dark:text-gray-300">${todo.description}</p>
				</div>
			`
					: ''
			}

			<div class="grid grid-cols-2 gap-6">
				<div>
					<h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">Durum</h3>
					<div class="flex items-center space-x-2">
						<span class="flex-shrink-0 w-2.5 h-2.5 rounded-full ${
							category === 'todo'
								? 'bg-gray-400'
								: category === 'inprogress'
								? 'bg-yellow-400'
								: 'bg-green-400'
						}"></span>
						<span class="text-gray-600 dark:text-gray-300">${
							category === 'todo'
								? 'Yapılacak'
								: category === 'inprogress'
								? 'Devam Ediyor'
								: 'Tamamlandı'
						}</span>
					</div>
					${
						todo.completed_at || todo.archived_at
							? `
						<div class="mt-2 space-y-1">
							${
								todo.completed_at
									? `
								<div class="text-sm text-gray-500 dark:text-gray-400">
									Tamamlanma: ${todo.completed_at}
								</div>
							`
									: ''
							}
							${
								todo.archived_at
									? `
								<div class="text-sm text-gray-500 dark:text-gray-400">
									Arşivlenme: ${todo.archived_at}
								</div>
							`
									: ''
							}
						</div>
					`
							: ''
					}
				</div>

				${
					todo.dueDate
						? `
					<div>
						<h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">Bitiş Tarihi</h3>
						<div class="flex items-center space-x-2 ${
							new Date(todo.dueDate) < new Date()
								? 'text-red-600 dark:text-red-400'
								: 'text-gray-600 dark:text-gray-300'
						}">
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								${
									new Date(todo.dueDate) < new Date()
										? `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />`
										: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />`
								}
							</svg>
							<span>${new Date(todo.dueDate).toLocaleDateString('tr-TR')}</span>
							${
								new Date(todo.dueDate) < new Date()
									? `<span class="font-medium">(Zamanı geçti)</span>`
									: ''
							}
						</div>
					</div>
				`
						: ''
				}
			</div>

			${
				todo.tags && todo.tags.length > 0
					? `
					<div>
						<h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">Etiketler</h3>
						<div class="flex flex-wrap gap-2">
							${todo.tags
								.map(
									(tag) => `
								<span class="px-3 py-1 text-sm font-medium bg-blue-50 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300 rounded-full">
									${tag}
								</span>
							`
								)
								.join('')}
						</div>
					</div>
				`
					: ''
			}

			${
				todo.notes
					? `
				<div>
					<h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">Notlar</h3>
					<p class="text-gray-600 dark:text-gray-300 whitespace-pre-wrap">${todo.notes}</p>
				</div>
			`
					: ''
			}
		</div>
	`

	detailModal.classList.remove('invisible', 'opacity-0')
	detailModalOverlay.classList.add('opacity-50')
	detailModalContent.classList.remove('scale-95', 'opacity-0')
	detailModalContent.classList.add('scale-100', 'opacity-100')
}

function closeDetailModal() {
	detailModalContent.classList.remove('scale-100', 'opacity-100')
	detailModalContent.classList.add('scale-95', 'opacity-0')
	detailModalOverlay.classList.remove('opacity-50')

	setTimeout(() => {
		detailModal.classList.add('invisible', 'opacity-0')
	}, 300)
}

// Yedekleme ve dışa aktarma fonksiyonları
async function exportTodosToFile() {
	try {
		const exportPath = await ipcRenderer.invoke('export-todos')
		if (exportPath) {
			await db.exportTodos(exportPath)
			sendNotification(
				'Dışa Aktarma Başarılı',
				'Todolar başarıyla dışa aktarıldı.'
			)
		}
	} catch (error) {
		console.error('Dışa aktarma hatası:', error)
		sendNotification(
			'Dışa Aktarma Hatası',
			'Todolar dışa aktarılırken bir hata oluştu.'
		)
	}
}

async function importTodosFromFile() {
	try {
		const importPath = await ipcRenderer.invoke('import-todos')
		if (importPath) {
			await db.importTodos(importPath)
			await loadTodos()
			sendNotification(
				'İçe Aktarma Başarılı',
				'Todolar başarıyla içe aktarıldı.'
			)
		}
	} catch (error) {
		console.error('İçe aktarma hatası:', error)
		sendNotification(
			'İçe Aktarma Hatası',
			'Todolar içe aktarılırken bir hata oluştu.'
		)
	}
}

// Otomatik yedekleme kontrolü
async function startAutoBackup() {
	await db.checkAndCreateBackup()
	// Her 24 saatte bir yedekleme kontrolü yap
	setInterval(db.checkAndCreateBackup, 24 * 60 * 60 * 1000)
}

// Takvim fonksiyonları
function openCalendarModal() {
	calendarModal.classList.remove('invisible', 'opacity-0')
	calendarModalOverlay.classList.add('opacity-50')
	calendarModalContent.classList.remove('scale-95', 'opacity-0')
	calendarModalContent.classList.add('scale-100', 'opacity-100')
	renderCalendar()
}

function closeCalendarModal() {
	calendarModalContent.classList.remove('scale-100', 'opacity-100')
	calendarModalContent.classList.add('scale-95', 'opacity-0')
	calendarModalOverlay.classList.remove('opacity-50')
	setTimeout(() => {
		calendarModal.classList.add('invisible', 'opacity-0')
	}, 300)
}

async function renderCalendar() {
	const year = currentDate.getFullYear()
	const month = currentDate.getMonth()
	const firstDay = new Date(year, month, 1)
	const lastDay = new Date(year, month + 1, 0)
	const startingDay = firstDay.getDay() || 7
	const totalDays = lastDay.getDate()

	currentMonthElement.textContent = new Date(
		year,
		month
	).toLocaleDateString('tr-TR', {
		month: 'long',
		year: 'numeric'
	})

	// Tüm todoları al
	const todos = await db.getTodos()
	// Arşivlenmiş görevleri hariç tut, sadece aktif kategorilerdeki görevleri al
	const allTodos = Object.entries(todos)
		.filter(([category]) =>
			['todo', 'inprogress', 'done'].includes(category)
		)
		.flatMap(([_, todos]) => todos)

	let calendarHTML = ''

	// Boş günler için
	for (let i = 1; i < startingDay; i++) {
		calendarHTML += `<div class="bg-white p-2 min-h-[100px]"></div>`
	}

	// Ayın günleri için
	for (let day = 1; day <= totalDays; day++) {
		const date = new Date(year, month, day)
		// Tarihi yerel saat dilimine göre formatla
		const formattedDate = date
			.toLocaleDateString('tr-TR', {
				year: 'numeric',
				month: '2-digit',
				day: '2-digit'
			})
			.split('.')
			.reverse()
			.join('-')

		// O güne ait todoları bul
		const dayTodos = allTodos.filter((todo) => {
			if (!todo.dueDate) return false

			// Todo tarihini yerel saat dilimine çevir
			const todoDueDate = new Date(todo.dueDate)
			const formattedDueDate = todoDueDate
				.toLocaleDateString('tr-TR', {
					year: 'numeric',
					month: '2-digit',
					day: '2-digit'
				})
				.split('.')
				.reverse()
				.join('-')

			return formattedDueDate === formattedDate
		})

		const isToday =
			new Date().toLocaleDateString() === date.toLocaleDateString()

		calendarHTML += `
			<div class="bg-white p-2 min-h-[100px] ${
				isToday ? 'ring-2 ring-blue-500' : ''
			}">
				<div class="flex justify-between items-center mb-2">
					<span class="text-sm font-medium ${
						isToday ? 'text-blue-600' : 'text-gray-900'
					}">${day}</span>
					${
						dayTodos.length > 0
							? `<span class="text-xs font-medium text-gray-500">${dayTodos.length} görev</span>`
							: ''
					}
				</div>
				<div class="space-y-1">
					${dayTodos
						.map(
							(todo) => `
						<div class="text-xs p-1 rounded ${priorityColors[todo.priority].bg} ${
								priorityColors[todo.priority].text
							} truncate cursor-pointer hover:opacity-75 transition-opacity"
							 onclick="openDetailModal(${JSON.stringify(todo)}, '${
								todo.category
							}')">
							${todo.title}
						</div>
					`
						)
						.join('')}
				</div>
			</div>
		`
	}

	calendarDays.innerHTML = calendarHTML
}

// Kart kopyalama fonksiyonu
async function copyTodoCard(id, category) {
	try {
		await db.copyTodo(id, category)
		await loadTodos()
		sendNotification('Başarılı', 'Kart başarıyla kopyalandı')
	} catch (error) {
		console.error('Kart kopyalama hatası:', error)
		sendNotification('Hata', 'Kart kopyalanırken bir hata oluştu')
	}
}

// Todo kartını oluşturan fonksiyonu güncelle
function createTodoCard(todo, category) {
	const li = document.createElement('li')
	li.className =
		'bg-white dark:bg-gray-700/50 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200'
	li.setAttribute('data-id', todo.id)
	li.setAttribute('draggable', 'true')

	// Drag event'lerini ekle
	li.addEventListener('dragstart', (e) =>
		handleDragStart(e, todo.id, category)
	)
	li.addEventListener('dragend', handleDragEnd)

	const header = document.createElement('div')
	header.className = 'flex items-center justify-between mb-3'

	const titleWrapper = document.createElement('div')
	titleWrapper.className = 'flex items-center space-x-3'

	const checkbox = document.createElement('input')
	checkbox.type = 'checkbox'
	checkbox.className =
		'h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer dark:border-gray-600 dark:bg-gray-800'
	checkbox.checked = todo.completed
	checkbox.classList.add('todo-checkbox')

	const title = document.createElement('h3')
	title.className = 'font-medium text-gray-900 dark:text-white'
	title.textContent = todo.title

	titleWrapper.appendChild(checkbox)
	titleWrapper.appendChild(title)

	const actions = document.createElement('div')
	actions.className = 'flex items-center space-x-2'

	const viewButton = document.createElement('button')
	viewButton.className =
		'p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 view-todo-btn'
	viewButton.innerHTML = `
		<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
		</svg>
	`

	const copyButton = document.createElement('button')
	copyButton.className =
		'p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 copy-todo-btn'
	copyButton.innerHTML = `
		<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
		</svg>
	`

	const editButton = document.createElement('button')
	editButton.className =
		'p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 edit-todo-btn'
	editButton.innerHTML = `
		<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
		</svg>
	`

	const deleteButton = document.createElement('button')
	deleteButton.className =
		'p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 delete-todo-btn'
	deleteButton.innerHTML = `
		<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
		</svg>
	`

	actions.appendChild(viewButton)
	actions.appendChild(copyButton)
	actions.appendChild(editButton)
	actions.appendChild(deleteButton)

	header.appendChild(titleWrapper)
	header.appendChild(actions)

	const metaSection = document.createElement('div')
	metaSection.className = 'space-y-3'

	const description = document.createElement('p')
	description.className = 'text-gray-600 dark:text-gray-300 text-sm'
	description.textContent = todo.description || ''
	metaSection.appendChild(description)

	const tagsAndPriority = document.createElement('div')
	tagsAndPriority.className = 'flex items-center justify-between'

	const priorityBadge = document.createElement('span')
	const priorityColor = priorityColors[todo.priority]
	priorityBadge.className = `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${priorityColor.bg} ${priorityColor.text}`
	priorityBadge.textContent = `${priorityColor.label} Öncelik`
	tagsAndPriority.appendChild(priorityBadge)

	if (todo.tags && todo.tags.length > 0) {
		const tagsContainer = document.createElement('div')
		tagsContainer.className = 'flex items-center space-x-1'
		todo.tags.forEach((tag) => {
			const tagElement = document.createElement('span')
			tagElement.className =
				'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-300'
			tagElement.textContent = tag
			tagsContainer.appendChild(tagElement)
		})
		tagsAndPriority.appendChild(tagsContainer)
	}

	metaSection.appendChild(tagsAndPriority)

	if (todo.dueDate) {
		const dateInfo = document.createElement('div')
		dateInfo.className = 'text-gray-500 dark:text-gray-400 text-sm'
		const dueDate = new Date(todo.dueDate)
		dateInfo.textContent = dueDate.toLocaleDateString('tr-TR', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		})
		metaSection.appendChild(dateInfo)
	}

	li.appendChild(header)
	li.appendChild(metaSection)

	return li
}
