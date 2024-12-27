const db = require('../../shared/database/database')
const { ipcRenderer } = require('electron')

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

// Arşivden geri alma fonksiyonu
async function unarchiveTodo(id) {
	try {
		await db.unarchiveTodo(id)
		await loadArchivedTodos() // Listeyi yenile
		sendNotification('Başarılı', 'Görev arşivden çıkarıldı.')
	} catch (error) {
		console.error('Arşivden çıkarma hatası:', error)
		sendNotification(
			'Hata',
			'Görev arşivden çıkarılırken bir hata oluştu.'
		)
	}
}

// Bildirim fonksiyonu
function sendNotification(title, body) {
	ipcRenderer.send('show-notification', { title, body })
}

// Tüm arşivlenmiş görevleri silme fonksiyonu
async function deleteAllArchived() {
	try {
		await db.deleteAllArchivedTodos()
		await loadArchivedTodos()
		sendNotification('Başarılı', 'Tüm arşivlenmiş görevler silindi.')
	} catch (error) {
		console.error('Tüm arşivlenmiş görevleri silme hatası:', error)
		sendNotification('Hata', 'Görevler silinirken bir hata oluştu.')
	}
}

// Modal işlemleri
function openDeleteAllModal() {
	const modal = document.getElementById('deleteAllModal')
	const modalOverlay = document.getElementById('modalOverlay')
	const modalContent = modal.querySelector('.relative')

	modal.classList.remove('invisible', 'opacity-0')
	modalOverlay.classList.add('backdrop-blur-sm')
	modalOverlay.style.opacity = '0.5'
	modalContent.classList.remove('scale-95', 'opacity-0')
	modalContent.classList.add('scale-100', 'opacity-100')
}

function closeDeleteAllModal() {
	const modal = document.getElementById('deleteAllModal')
	const modalOverlay = document.getElementById('modalOverlay')
	const modalContent = modal.querySelector('.relative')

	modalContent.classList.remove('scale-100', 'opacity-100')
	modalContent.classList.add('scale-95', 'opacity-0')
	modalOverlay.classList.remove('backdrop-blur-sm')
	modalOverlay.style.opacity = '0'

	setTimeout(() => {
		modal.classList.add('invisible', 'opacity-0')
	}, 300)
}

async function loadArchivedTodos() {
	try {
		const todos = await db.getTodos()
		const archivedTodos = todos.archived || []
		const container = document.getElementById('archived-todos')

		// Arşivlenmiş görev yoksa
		if (archivedTodos.length === 0) {
			container.innerHTML = `
				<div class="flex flex-row items-center justify-center py-8">
					<p class="text-white text-sm">Arşivlenmiş görev bulunmamaktadır.</p>
				</div>
			`
			// Tümünü sil butonunu gizle
			document.getElementById('deleteAllArchivedBtn').style.display =
				'none'
			return
		}

		// Tümünü sil butonunu göster
		document.getElementById('deleteAllArchivedBtn').style.display =
			'block'

		// Arşivlenmiş görevleri listele
		container.innerHTML = archivedTodos
			.sort(
				(a, b) => new Date(b.archived_at) - new Date(a.archived_at)
			)
			.map(
				(todo) => `
				<div class="bg-white/95 backdrop-blur-sm rounded-xl p-5 max-w-3xl mx-auto">
					<div class="flex items-center justify-between">
						<div class="flex items-center space-x-3">
							<div class="flex-shrink-0">
								<span class="inline-flex items-center justify-center w-10 h-10 rounded-xl ${
									priorityColors[todo.priority].bg
								} ${priorityColors[todo.priority].text}">
									<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
									</svg>
								</span>
							</div>
							<div>
								<h3 class="font-medium text-gray-900">${
									todo.title.length > 30
										? todo.title.substring(0, 30) + '...'
										: todo.title
								}</h3>
								<div class="flex items-center space-x-2 mt-1">
									<span class="text-sm text-gray-500">
										Tamamlanma: ${todo.completed_at}
									</span>
									<span class="text-sm text-gray-500">•</span>
									<span class="text-sm text-gray-500">
										Arşivlenme: ${todo.archived_at}
									</span>
								</div>
							</div>
						</div>
						<div class="flex items-center space-x-3">
							<span class="px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
								${
									todo.original_category === 'todo'
										? 'Yapılacaklar'
										: todo.original_category === 'inprogress'
										? 'Devam Edenler'
										: 'Tamamlananlar'
								}
							</span>
							<button
								class="unarchive-btn p-1.5 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
								title="Arşivden Çıkar"
								data-todo-id="${todo.id}"
							>
								<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
								</svg>
							</button>
						</div>
					</div>
					${
						todo.description
							? `
						<div class="mt-3 text-sm text-gray-600 line-clamp-3 overflow-hidden text-ellipsis">
							${todo.description}
						</div>
					`
							: ''
					}
					${
						todo.tags && todo.tags.length > 0
							? `
						<div class="flex flex-wrap gap-2 mt-3">
							${todo.tags
								.map(
									(tag) => `
								<span class="px-2.5 py-1 text-xs font-medium bg-blue-50 text-blue-600 rounded-full">
									${tag}
								</span>
							`
								)
								.join('')}
						</div>
					`
							: ''
					}
				</div>
			`
			)
			.join('')

		// Event listener'ları ekle
		document.querySelectorAll('.unarchive-btn').forEach((button) => {
			button.addEventListener('click', () => {
				const todoId = parseInt(button.dataset.todoId)
				unarchiveTodo(todoId)
			})
		})
	} catch (error) {
		console.error('Arşivlenmiş görevler yüklenirken hata:', error)
	}
}

// Sayfa yüklendiğinde event listener'ları ekle
document.addEventListener('DOMContentLoaded', () => {
	loadArchivedTodos()

	// Tümünü sil butonu için event listener
	document
		.getElementById('deleteAllArchivedBtn')
		.addEventListener('click', () => {
			openDeleteAllModal()
		})

	// Modal kapatma butonları için event listener
	document
		.querySelectorAll('.close-delete-all-modal')
		.forEach((button) => {
			button.addEventListener('click', () => {
				closeDeleteAllModal()
			})
		})

	// Silme onayı için event listener
	document
		.getElementById('confirmDeleteAll')
		.addEventListener('click', () => {
			deleteAllArchived()
			closeDeleteAllModal()
		})

	// ESC tuşu ile modalı kapatma
	document.addEventListener('keydown', (e) => {
		if (e.key === 'Escape') {
			closeDeleteAllModal()
		}
	})

	// Modal dışına tıklandığında kapatma
	document
		.getElementById('deleteAllModal')
		.addEventListener('click', (e) => {
			if (e.target === e.currentTarget.querySelector('.bg-black')) {
				closeDeleteAllModal()
			}
		})
})
