import rawDataset from '../../../kombine_veri_seti.json';
import manualCampus from '../../../kampus_manuel_bilgiler.json';

type DatasetRow = { kaynak_belge: string; icerik: string };

const dataset: DatasetRow[] = [
  ...(manualCampus as DatasetRow[]),
  ...(rawDataset as DatasetRow[]),
];

/**
 * Arama sorgusuna göre yerel JSON veri setinden en benzer içerikleri getirir.
 * Eğer Pinecone API erişimi yoksa bu lokal arama kullanılır.
 */
export async function searchLocalDataset(query: string, limit: number = 5): Promise<string> {
  if (!dataset || dataset.length === 0) return "";

  // Sorguyu kelimelere ayır, gereksiz noktalama işaretlerini at, küçük harfe çevir.
  const queryWords = query
    .toLowerCase()
    .replace(/[^\w\sğüşıöçĞÜŞİÖÇ]/gi, '')
    .split(/\s+/)
    .filter(w => w.length > 2);

  if (queryWords.length === 0) return "";

  // Her bir içeriği sorgu kelimelerine göre skorla
  const scoredItems = dataset.map(item => {
    let score = 0;
    const content = item.icerik ? String(item.icerik).toLowerCase() : "";
    const source = item.kaynak_belge ? String(item.kaynak_belge).toLowerCase() : "";

    for (const word of queryWords) {
      // Kaynak belge adında eşleşme (yüksek bonus)
      if (source.includes(word)) {
        score += 3;
      }

      if (content.includes(word)) {
        score += 1;

        // Ekstra bonus: Eğer tam kelime olarak geçiyorsa
        const regex = new RegExp(`(?:^|[\\s,.:;])${word}(?:[\\s,.:;]|$)`, 'i');
        if (regex.test(content)) {
          score += 1;
        }
      }
    }

    return { item, score };
  });
  
  // Puanı 0'dan büyük olanları sıralayıp 'limit' kadarını al
  const topItems = scoredItems
    .filter(si => si.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
    
  if (topItems.length === 0) return "";
  
  // Bulunan içerikleri metin formatında birleştir
  return topItems.map((si, index) => {
    return `[Kaynak ${index + 1}: ${si.item.kaynak_belge || 'bilinmiyor'}]\n${si.item.icerik}`;
  }).join("\n\n---\n\n");
}
