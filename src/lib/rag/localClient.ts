import rawDataset from '../../../kombine_veri_seti.json';
import manualCampus from '../../../kampus_manuel_bilgiler.json';
import fs from 'fs';
import path from 'path';

type DatasetRow = { kaynak_belge: string; icerik: string };

type ExamRow = {
  DERS_KODU: string;
  DERS_ADI: string;
  AKTS: string;
  Z_S: string;
  DONEM: string;
  BOLUM: string;
  OGRETIM_UYESI: string;
  TARIH: string;
  SAAT: string;
};

const dataset: DatasetRow[] = [
  ...(manualCampus as DatasetRow[]),
  ...(rawDataset as DatasetRow[]),
];

// CSV sınav programını parse et
let examData: ExamRow[] = [];
try {
  const csvPath = path.join(process.cwd(), 'sinav_programi.csv');
  if (fs.existsSync(csvPath)) {
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.trim().split('\n');
    const headers = lines[0].split(',');
    for (let i = 1; i < lines.length; i++) {
      const values: string[] = [];
      let current = '';
      let inQuotes = false;
      for (const char of lines[i]) {
        if (char === '"') { inQuotes = !inQuotes; continue; }
        if (char === ',' && !inQuotes) { values.push(current.trim()); current = ''; continue; }
        current += char;
      }
      values.push(current.trim());
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => { row[h.trim()] = values[idx] || ''; });
      examData.push(row as unknown as ExamRow);
    }
  }
} catch { /* ignore */ }

/**
 * Sınav programından yapılandırılmış sorgu
 */
function searchExamSchedule(query: string): string {
  if (examData.length === 0) return "";

  const q = query.toLowerCase();

  // Bölüm tespiti
  let bolum: string | null = null;
  if (/\bybs\b|yönetim bilişim/i.test(q)) bolum = "YBS";
  else if (/\buti\b|\butİ\b|uluslararası ticaret/i.test(q)) bolum = "UTİ";
  else if (/\bişletme\b/i.test(q)) bolum = "İŞLETME";

  // Dönem tespiti
  let donem: string | null = null;
  const donemMatch = q.match(/(\d)\.\s*(?:dönem|donem|yarıyıl|sınıf)/);
  if (donemMatch) donem = donemMatch[1];

  // Ders adı veya kodu araması
  const dersKeywords = q
    .replace(/vize|sınav|programı?|takvim|ne zaman|hangi gün|tarih|saat/gi, '')
    .replace(/\bybs\b|\buti\b|\butİ\b|işletme|dönem|donem|yarıyıl|sınıf|\d\./gi, '')
    .trim()
    .split(/\s+/)
    .filter(w => w.length > 2);

  let filtered = examData;
  if (bolum) filtered = filtered.filter(r => r.BOLUM === bolum);
  if (donem) filtered = filtered.filter(r => r.DONEM === donem);

  // Ders adı/kodu ile filtreleme
  if (dersKeywords.length > 0) {
    const dersFiltered = filtered.filter(r => {
      const text = `${r.DERS_ADI} ${r.DERS_KODU}`.toLowerCase();
      return dersKeywords.some(k => text.includes(k));
    });
    if (dersFiltered.length > 0) filtered = dersFiltered;
  }

  if (filtered.length === 0) return "";

  // Sonuçları dönem bazında grupla
  const groups: Record<string, ExamRow[]> = {};
  for (const row of filtered) {
    const key = `${row.BOLUM} - ${row.DONEM}. Dönem`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(row);
  }

  let result = `[Kaynak: 2025-2026 Bahar Yarıyılı Arasınav (Vize) Programı${bolum ? ` - ${bolum} Bölümü` : ''}]\n`;
  for (const [group, rows] of Object.entries(groups)) {
    result += `\n${group}:\n`;
    for (const r of rows.sort((a, b) => a.TARIH.localeCompare(b.TARIH) || a.SAAT.localeCompare(b.SAAT))) {
      const tarih = r.TARIH.split('-');
      const gun = `${parseInt(tarih[2])} Nisan 2026`;
      const saat = r.SAAT.replace(':00:00', ':00').replace(':00', ':00');
      const zs = r.Z_S === 'S' ? ' (seçmeli)' : '';
      result += `${gun} saat ${saat} - ${r.DERS_ADI} (${r.DERS_KODU}, ${r.OGRETIM_UYESI}${zs})\n`;
    }
  }

  return result;
}

/**
 * Arama sorgusuna göre yerel JSON veri setinden en benzer içerikleri getirir.
 */
export async function searchLocalDataset(query: string, limit: number = 5): Promise<string> {
  const results: string[] = [];

  // Sınav programı araması (yapılandırılmış)
  const examResult = searchExamSchedule(query);
  if (examResult) results.push(examResult);

  if (!dataset || dataset.length === 0) return results.join("\n\n---\n\n");

  // Sorguyu kelimelere ayır
  const queryWords = query
    .toLowerCase()
    .replace(/[^\w\sğüşıöçĞÜŞİÖÇ]/gi, '')
    .split(/\s+/)
    .filter(w => w.length > 2);

  if (queryWords.length === 0) return results.join("\n\n---\n\n");

  // Her bir içeriği sorgu kelimelerine göre skorla
  const scoredItems = dataset.map(item => {
    let score = 0;
    const content = item.icerik ? String(item.icerik).toLowerCase() : "";
    const source = item.kaynak_belge ? String(item.kaynak_belge).toLowerCase() : "";

    for (const word of queryWords) {
      if (source.includes(word)) {
        score += 3;
      }

      if (content.includes(word)) {
        score += 1;

        const regex = new RegExp(`(?:^|[\\s,.:;])${word}(?:[\\s,.:;]|$)`, 'i');
        if (regex.test(content)) {
          score += 1;
        }
      }
    }

    return { item, score };
  });

  // Sınav verileri zaten CSV'den geliyorsa JSON sınav girdilerini atla
  const skipExam = examResult.length > 0;
  const topItems = scoredItems
    .filter(si => {
      if (si.score <= 0) return false;
      if (skipExam && si.item.kaynak_belge?.includes('Arasınav Programı')) return false;
      return true;
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  for (const si of topItems) {
    results.push(`[Kaynak: ${si.item.kaynak_belge || 'bilinmiyor'}]\n${si.item.icerik}`);
  }

  return results.join("\n\n---\n\n");
}
