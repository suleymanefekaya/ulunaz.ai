# Ulunaz.ai

Bursa Uludag Universitesi Inegol Isletme Fakultesi'nin yapay zeka kampus asistani.

Ulunaz (Nazli), Inegol Isletme Fakultesi kampusunun sevilen kopeginden esinlenen bir AI chatbot'tur. Ogrencilere fakulte, dersler, sinav takvimleri, topluluklar, barinma, ulasim ve Inegol sehri hakkinda bilgi verir.

## Ozellikler

- **AI Chatbot** - Gemini 2.0 Flash / DeepSeek destekli akilli asistan
- **RAG Sistemi** - Yerel bilgi tabanindan anahtar kelime tabanli arama
- **Sinav Takvimi** - Isletme, UTI ve YBS bolumlerinin vize programi
- **Topluluk Bilgileri** - UYBiST, iNiT, UATT topluluk detaylari ve yonetim kadrolari
- **Kampus Rehberi** - Barinma (KYK, ilim Yayma Cemiyeti), kantin, sosyal alanlar
- **Inegol Sehir Rehberi** - Gezilecek yerler, kofteciler, parklar, AVM'ler, belediye hizmetleri
- **Ulasim Bilgileri** - Inegol otobus hatlari, Gorukle kampusune metro rotasi
- **Sohbet Gecmisi** - localStorage tabanli sohbet kaydi ve yonetimi
- **Fotograf Destegi** - Ekip fotografini chatbot icinde gosterme

## Teknolojiler

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Google Gemini API / DeepSeek API
- Vercel AI SDK
- Framer Motion

## Kurulum

```bash
# Bagimliliklar
npm install

# .env.local dosyasi olustur
cp .env.example .env.local
# GOOGLE_GENERATIVE_AI_API_KEY="..." ekle

# Gelistirme sunucusu
npm run dev
```

Tarayicida [http://localhost:3000](http://localhost:3000) adresini ac.

## Ekip

**Ulunaz Takimi** - UYBiST AR-GE Komitesi Hackathon Projesi

| Isim | Rol |
|------|-----|
| **Fatmanur Sena Bulbul** | Kaptan |
| **Salih Bugra Bulbul** | Gelistirici |
| **Suleyman Efe Kaya** | Gelistirici |

## Lisans

Bu proje UYBiST AR-GE Komitesi hackathon yarismasi icin gelistirilmistir.
