import { Pinecone } from '@pinecone-database/pinecone';

// Pinecone bağlantısını başlatıyoruz
// PINECONE_API_KEY .env dosyasında tanımlı olmalıdır.
const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY || "YOUR_PINECONE_API_KEY"
});

// Pinecone üzerinde açacağımız Index'in ismi
const indexName = "ulu-ai-knowledge";

/**
 * Gönderilen Chunk(parça) dizisini sayısal vektörlere (Embeddings) çevirip veritabanına kaydeder.
 * Avantajı: Pinecone'un ücretsiz 'multilingual-e5-large' inference sunucusunu kullanır. Ekstra OpenAI hesabına gerek kalmaz.
 */
export async function ingestChunksIntoPinecone(chunks: string[], sourceName: string) {
  const index = pc.Index(indexName);

  // Metinleri sayısal ağırlıklara (vektörlere) çeviren Pinecone Inference API işlemi
  const embeddingsResult = await pc.inference.embed({
    model: "multilingual-e5-large",
    inputs: chunks,
    parameters: { inputType: "passage", truncate: "END" }
  });

  const vectors = (embeddingsResult as any).data.map((embeddingBase: any, i: number) => ({
    id: `${sourceName}-chunk-${i}`,
    values: embeddingBase.values,
    metadata: {
      text: chunks[i],
      source: sourceName,
    }
  }));

  // Pinecone veritabanına yükleme işlemi ("Upsert")
  await index.upsert(vectors); // Type definitions sometimes complain about this, but it works in runtime
  console.log(`Veriler basariyla '${sourceName}' olarak index'lendi: Toplam ${chunks.length} Chunk.`);
}

/**
 * Kullanıcı bir soru sorduğunda, soruyu vektör haline getirip en yakın bilgileri Pinecone'dan bulur.
 */
export async function searchRelevantContext(userQuery: string, limit: number = 3): Promise<string> {
  try {
    const index = pc.Index(indexName);

    // 1. Sorunun kendisini vektöre çevir
    const queryEmbedding = await pc.inference.embed({
      model: "multilingual-e5-large",
      inputs: [userQuery],
      parameters: { inputType: "query", truncate: "END" }
    });

    // 2. Vector DB'de en yakın vektör mesafelerini ara
    const queryResponse = await index.query({
      topK: limit,
      vector: (queryEmbedding as any).data[0].values as number[],
      includeMetadata: true,
    });

    if (!queryResponse.matches || queryResponse.matches.length === 0) {
      return "";
    }

    // 3. Bulunan ilgili 3 chunk'ı tek bir paragrafta birleştir (Sistem Context'i için)
    const contextStrings = queryResponse.matches.map((match: any) => match.metadata.text);
    return contextStrings.join("\n\n---\n\n");
  } catch (error) {
    console.error("Vector Search Error:", error);
    return "";
  }
}
