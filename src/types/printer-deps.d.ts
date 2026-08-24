declare module "bidi-js" {
  type EmbeddingResult = unknown;
  interface BidiApi {
    getEmbeddingLevels(text: string): EmbeddingResult;
    getReorderedString(text: string, embeddingLevels: EmbeddingResult): string;
  }
  export default function bidiFactory(): BidiApi;
}

declare module "arabic-persian-reshaper" {
  export const ArabicShaper: {
    convertArabic(text: string): string;
  };
  export const PersianShaper: {
    convertArabic(text: string): string;
  };
}
