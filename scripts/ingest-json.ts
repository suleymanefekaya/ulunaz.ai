import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { chunkText } from '../src/lib/rag/documentParser';
import { ingestChunksIntoPinecone } from '../src/lib/rag/pineconeClient';

/**
 * Kombine JSON veri setini Pinecone'a yükleyen script.
 * Çalıştırmak için: npx tsx scripts/ingest-json.ts
 */

const jsonPath = path.join(__dirname, '..', 'kombine_veri_seti.json');

async function runIndex() {
  console.log("JSON Yükleme Script Başlıyor...");
  
  if (!fs.existsSync(jsonPath)) {
    console.log("Hata: 'kombine_veri_seti.json' dosyası kök dizinde bulunamadı.");
    return;
  }

  const rawData = fs.readFileSync(jsonPath, 'utf8');
  let data: any[];
  try {
    data = JSON.parse(rawData);
  } catch (e) {
    console.error("JSON parse hatası: ", e);
    return;
  }

  console.log(`JSON içinde toplam ${data.length} adet veri bloğu bulundu.`);

  // Bütün icerikleri tek bir metinde birleştirip tekrar parse etmek yerine,
  // Her bir icerik kısmını chunklayıp (veya doğrudan) Pincone'a gönderelim.
  // Ya da içeriği alıp Pinecone'a uygun chunk listesi yapabiliriz.

  // Chunkları kaynak belge adına göre gruplayalım.
  const groupedChunks: { [key: string]: string[] } = {};

  data.forEach((item) => {
    const kaynak = item.kaynak_belge || "genel_veri";
    const icerik = item.icerik;

    if (icerik && typeof icerik === 'string' && icerik.trim().length > 0) {
      // icerik zaten kısa bir parça olabilir ama eğer uzunsa chunkText kullanalım.
      const subChunks = chunkText(icerik, 1000, 200);
      
      if (!groupedChunks[kaynak]) {
        groupedChunks[kaynak] = [];
      }
      groupedChunks[kaynak].push(...subChunks);
    }
  });

  // Şimdi pinecone'a gönderelim.
  for (const fromSource of Object.keys(groupedChunks)) {
    const chunks = groupedChunks[fromSource];
    console.log(`'${fromSource}' için Pinecone'a gönderilecek chunk sayısı: ${chunks.length}`);
    try {
        await ingestChunksIntoPinecone(chunks, fromSource);
        console.log(`'${fromSource}' verileri başarıyla Pinecone'a yüklendi.`);
    } catch (error) {
        console.error(`'${fromSource}' yüklenirken hata oluştu:`, error);
    }
  }

  console.log("Yükleme işlemi tamamlandı!");
}

(async () => {
    await runIndex();
})();
