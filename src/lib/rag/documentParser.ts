import fs from "fs";
const pdfParse = require("pdf-parse");
import * as xlsx from "xlsx";

/**
 * Textleri belirli bir token/karakter boyutuna göre "Chunk"lara böler.
 * "Overlap" (kesişim) mantığı sayesinde cümle kısımları kaybolmaz.
 */
export function chunkText(text: string, chunkSize: number = 800, chunkOverlap: number = 200): string[] {
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.slice(i, i + chunkSize));
    i += chunkSize - chunkOverlap;
  }
  return chunks;
}

/**
 * PDF dosyasını okuyup ham metne çevirir.
 */
export async function parsePDF(filePath: string): Promise<string> {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);
  // Temizleme işlemleri: Gereksiz satır boşluklarını kaldır
  return data.text.replace(/\n/g, " ").replace(/\s{2,}/g, " ");
}

/**
 * Excel dosyasındaki tüm Sheet (Sayfaları) okuyup JSON veya metne döker.
 * Ders programları için çok etkilidir.
 */
export function parseExcel(filePath: string): string {
  const workbook = xlsx.readFile(filePath);
  let combinedText = "";

  workbook.SheetNames.forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    // Tabloyu CSV tarzı bir string dizisine çeviriyoruz
    const sheetCsv = xlsx.utils.sheet_to_csv(sheet);
    combinedText += `\n--- Sayfa: ${sheetName} ---\n${sheetCsv}`;
  });

  return combinedText.replace(/\n\s*\n/g, "\n");
}
