import 'dotenv/config'; // .env okuması
import * as fs from 'fs';
import * as path from 'path';
import { parsePDF, parseExcel, chunkText } from '../src/lib/rag/documentParser';
import { ingestChunksIntoPinecone, searchRelevantContext } from '../src/lib/rag/pineconeClient';

/**
 * Bütün sistemi test edeceğimiz dosya.
 * Çalıştırmak için: npx tsx scripts/test-rag.ts
 */

const dataDir = path.join(__dirname, '..', 'data');

async function runIndex() {
  console.log("RAG Test Script Başlıyor...");
  
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
    console.log("Uyarı: 'data' klasörü yoktu, oluşturuldu. Lütfen içine sahte bir .pdf veya .xlsx koyun.");
    return;
  }

  const files = fs.readdirSync(dataDir);
  if (files.length === 0) {
    console.log("Uyarı: 'data' klasörü boş. Lütfen içine PDF veya Excel koyun.");
    return;
  }

  // 1. Veri Hazırlığı
  for (const file of files) {
    const filePath = path.join(dataDir, file);
    let text = "";

    try {
      if (file.endsWith('.pdf')) {
        console.log(`PDF Okunuyor: ${file}`);
        text = await parsePDF(filePath);
      } else if (file.endsWith('.xlsx')) {
        console.log(`Excel Okunuyor: ${file}`);
        text = parseExcel(filePath);
      } else {
        continue; // Desteklenmeyen format
      }

      // 2. Metin Parçalama
      const chunks = chunkText(text, 1000, 200);
      console.log(`Dosya Chunk'lara (parçalara) bölündü. Toplam: ${chunks.length}`);

      // 3. Veritabanına Yazma
      await ingestChunksIntoPinecone(chunks, file);
    } catch (e: any) {
      console.error(`${file} hatalı veya test uyumlu değil: `, e?.message);
    }
  }
}

async function runQueryTest() {
  console.log("\n🚀 Arama testi başlatılıyor: 'YBS ders programı nedir?'");
  const result = await searchRelevantContext("YBS bölüm başkanı kimdir?", 2);
  console.log("\nPinecone'dan Gelen Bağlam (Context):");
  console.log("------------------------------------------------");
  console.log(result || "Hiçbir veri bulunamadı. Lütfen önce veri yükleyin.");
  console.log("------------------------------------------------\n");
}

(async () => {
    // 1- Önce Yükleme Fonksiyonu
    await runIndex();
    
    // 2- Hemen Sonra Arama Testi
    await runQueryTest();
})();
