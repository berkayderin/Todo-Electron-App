# Deep-Todo

Electron.js ile geliştirilmiş, modern ve kullanıcı dostu bir Todo (Yapılacaklar Listesi) uygulaması.

![Deep-Todo Logo](src/assets/icon.ico)

## Özellikler

### 💫 Kullanıcı Arayüzü

- Tailwind CSS ile tasarlanmış modern arayüz
- Sürükle-bırak ile todo sıralama
- Duyarlı (responsive) tasarım

### 📝 Todo Yönetimi

- Başlık ve açıklama içeren todo oluşturma
- Todo düzenleme ve silme
- Todo'ları tamamlandı olarak işaretleme
- Bitiş tarihi belirleme
- Otomatik öncelik hesaplama (Düşük, Orta, Yüksek)
- Not ekleme özelliği
- Etiketleme sistemi

### 📁 Veri Yönetimi

- JSON formatında dışa aktarma
- Yedeklenmiş todo'ları içe aktarma
- 24 saatte bir otomatik yedekleme
- Yerel JSON depolama

### 🗑️ Arşiv Sistemi

- Tamamlanan todo'ları otomatik arşivleme
- Arşivlenmiş todo'ları görüntüleme
- Arşivden todo'ları geri yükleme

### 📅 Takvim Özellikleri

- Takvim görünümü
- Bitiş tarihine göre öncelik güncelleme
- Saatlik öncelik kontrolü

### 🔔 Bildirim Sistemi

- Masaüstü bildirimleri
- Özel bildirim ikonları

## Kurulum

1. Projeyi klonlayın:

```bash
git clone https://github.com/berkayderin/Todo-Electron-App.git
cd deep-todo
```

2. Gerekli bağımlılıkları yükleyin:

```bash
npm install
```

3. Uygulamayı başlatın:

```bash
npm start
```

## Geliştirme

- Tailwind CSS'i izlemek için:

```bash
npm run watch
```

- Uygulamayı paketlemek için:

```bash
npm run dist
```

## Teknolojiler

- [Electron.js](https://www.electronjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- Node.js

## Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

## Geliştirici

- **Berkay Derin** - [derinberkay67@gmail.com](mailto:derinberkay67@gmail.com)
