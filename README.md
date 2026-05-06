# Archer App - MERN Stack Archery Tracking System

Bu proje, okçuların antrenman performanslarını takip etmelerini ve antrenörlerin yarışmalar düzenlemesini sağlayan bir mobil uygulama projesidir.

## 🚀 Başlangıç (Takım Arkadaşları İçin)

Projeyi kendi bilgisayarınızda çalıştırmak için aşağıdaki adımları izleyin:

### 1. Ön Hazırlık
- Bilgisayarınızda **Node.js** yüklü olmalıdır.
- **MongoDB Community Server** yüklü ve çalışıyor olmalıdır (veya Docker kullanabilirsiniz).
- Telefonunuzda **Expo Go** uygulaması yüklü olmalıdır.

### 2. Bağımlılıkları Yükleme
Projenin ana dizininde terminali açın:

**Backend için:**
```bash
cd backend
npm install
```

**Frontend için:**
```bash
cd frontend
npm install
```

### 3. IP Adresi Yapılandırması (ÖNEMLİ)
Mobil cihazın sunucuyla konuşabilmesi için sunucunun yerel IP adresini tanımlamanız gerekir:
1. Terminale `ipconfig` (Windows) veya `ifconfig` (Mac/Linux) yazarak yerel IP adresinizi bulun (Örn: 192.168.1.X).
2. `frontend/src/services/api.ts` dosyasını açın.
3. `const API_URL = 'http://VAREL_IP_ADRESINIZ:2000/api';` satırını kendi IP'nizle güncelleyin.

### 4. Çalıştırma
İki ayrı terminal açın:

**Terminal 1 (Backend):**
```bash
cd backend
npm run dev
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npx expo start
```
Expo QR kodunu telefonunuzdaki Expo Go uygulamasıyla taratın.

## 🏗️ Proje Mimarisi

- **Frontend:** React Native (Expo) & TypeScript
- **Backend:** Node.js & Express
- **Veritabanı:** MongoDB (Mongoose)
- **Koleksiyonlar:**
  - `studentdatas`: Öğrencilerin bireysel antrenman kayıtları.
  - `studentprofiles`: Öğretmenlerin sisteme eklediği öğrenciler.
  - `teacherdatas`: Yarışma sonuçları ve detaylı puan tabloları.

## 🐳 Docker Kullanımı (Opsiyonel)
Proje Docker'a hazırdır. Linux sunucularda çalıştırmak için:
```bash
docker-compose up -d
```

---
*Geliştirici Notu: Veritabanı bağlantısı `localhost:27017` üzerinden `archer_app` ismiyle otomatik kurulur.*
