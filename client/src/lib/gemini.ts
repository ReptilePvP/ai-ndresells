export interface GeminiAnalysis {
  productName: string;
  description: string;
  averageSalePrice: string;
  resellPrice: string;
}

export const analyzeProductImage = async (imageFile: File): Promise<GeminiAnalysis> => {
  // This function is kept for potential client-side usage
  // The actual implementation is on the server side
  throw new Error('This function should not be called directly. Use the /api/analyze endpoint instead.');
};
