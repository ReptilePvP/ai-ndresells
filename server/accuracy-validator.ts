interface ValidationResult {
  isValid: boolean;
  confidence: number;
  issues: string[];
  recommendations: string[];
}

interface ProductData {
  productName: string;
  brand?: string;
  model?: string;
  category?: string;
  condition?: string;
  averageSalePrice: string;
  resellPrice: string;
  marketDemand?: string;
}

export class AccuracyValidator {

  validateImageQuality(base64Image: string): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      confidence: 1.0,
      issues: [],
      recommendations: []
    };

    try {
      // Basic image validation
      const imageBuffer = Buffer.from(base64Image, 'base64');
      const imageSizeKB = imageBuffer.length / 1024;

      // Size validation
      if (imageSizeKB < 50) { // Increased minimum size
        result.issues.push('Image size too small - may affect analysis accuracy');
        result.confidence -= 0.2;
      }

      if (imageSizeKB > 10000) {
        result.issues.push('Image size very large - processing may be slower');
        result.recommendations.push('Consider compressing image for faster analysis');
      }

      // Image format validation
      const header = imageBuffer.slice(0, 10).toString('hex');
      const isValidFormat = header.startsWith('ffd8ff') || // JPEG
                           header.startsWith('89504e47') || // PNG
                           header.startsWith('47494638'); // GIF

      if (!isValidFormat) {
        result.issues.push('Unsupported image format detected');
        result.confidence -= 0.3;
        result.isValid = false;
      }

      // Resolution check (minimum 800x600)
      const dimensions = this.getImageDimensions(imageBuffer);
      if (dimensions.width < 800 || dimensions.height < 600) {
        result.issues.push('Image resolution too low - minimum 800x600 recommended');
        result.confidence -= 0.15;
      }

      // Sharpness check
      const sharpness = this.analyzeSharpness(imageBuffer);
      if (sharpness < 0.6) {
        result.issues.push('Image appears blurry - may affect analysis accuracy');
        result.confidence -= 0.2;
        result.recommendations.push('Ensure product is in focus');
      }

      // Lighting check
      const lighting = this.analyzeLighting(imageBuffer);
      if (lighting < 0.5) {
        result.issues.push('Poor lighting conditions detected');
        result.confidence -= 0.15;
        result.recommendations.push('Improve lighting for better results');
      }

      // Product centering check
      const centering = this.analyzeProductCentering(imageBuffer);
      if (centering < 0.7) {
        result.issues.push('Product may not be properly centered');
        result.confidence -= 0.1;
        result.recommendations.push('Center the product in the frame');
      }

    } catch (error) {
      result.issues.push('Image validation failed');
      result.confidence = 0;
      result.isValid = false;
    }

    // Ensure confidence stays within bounds
    result.confidence = Math.max(0, Math.min(1, result.confidence));

    return result;
  }

  private getImageDimensions(buffer: Buffer): { width: number; height: number } {
    // Implementation to get image dimensions
    // This would use a library like sharp or jimp
    return { width: 0, height: 0 }; // Placeholder
  }

  private analyzeSharpness(buffer: Buffer): number {
    // Implementation to analyze image sharpness
    // This would use edge detection algorithms
    return 1.0; // Placeholder
  }

  private analyzeLighting(buffer: Buffer): number {
    // Implementation to analyze image lighting
    // This would use histogram analysis
    return 1.0; // Placeholder
  }

  private analyzeProductCentering(buffer: Buffer): number {
    // Implementation to analyze product centering
    // This would use object detection and position analysis
    return 1.0; // Placeholder
  }

  validateProductData(data: ProductData): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      confidence: 1.0,
      issues: [],
      recommendations: []
    };

    // Product name validation
    if (!data.productName || data.productName.trim() === '' || data.productName === 'Unknown Product') {
      result.issues.push('Product identification failed');
      result.confidence -= 0.4;
    } else if (data.productName.length < 10) {
      result.issues.push('Product name too generic - may lack specificity');
      result.confidence -= 0.2;
    }

    // Brand and model validation
    if (!data.brand || data.brand.trim() === '') {
      result.issues.push('Brand not identified');
      result.confidence -= 0.15;
    }

    if (!data.model || data.model.trim() === '') {
      result.issues.push('Model number not identified');
      result.confidence -= 0.15;
    }

    // Category validation
    const validCategories = [
      'Electronics', 'Fashion', 'Home', 'Collectibles', 'Sports', 
      'Books', 'Toys', 'Health', 'Automotive', 'Garden'
    ];

    if (!data.category || !validCategories.includes(data.category)) {
      result.issues.push('Product category unclear');
      result.confidence -= 0.1;
    }

    // Price validation
    if (!this.isValidPriceFormat(data.averageSalePrice)) {
      result.issues.push('Retail price format invalid');
      result.confidence -= 0.2;
    }

    if (!this.isValidPriceFormat(data.resellPrice)) {
      result.issues.push('Resell price format invalid');
      result.confidence -= 0.2;
    }

    // Price relationship validation
    const retailRange = this.extractPriceRange(data.averageSalePrice);
    const resellRange = this.extractPriceRange(data.resellPrice);

    if (retailRange && resellRange) {
      if (resellRange.min > retailRange.max) {
        result.issues.push('Resell price higher than retail - verify market data');
        result.confidence -= 0.25;
      }

      const profitMargin = ((retailRange.min - resellRange.max) / retailRange.min) * 100;
      if (profitMargin < -50 || profitMargin > 80) {
        result.issues.push('Unusual profit margin detected - verify pricing');
        result.confidence -= 0.15;
      }
    }

    // Market demand validation
    if (data.marketDemand && !['High', 'Medium', 'Low'].includes(data.marketDemand)) {
      result.issues.push('Invalid market demand indicator');
      result.confidence -= 0.05;
    }

    // Overall quality assessment
    if (result.confidence < 0.3) {
      result.isValid = false;
      result.recommendations.push('Consider retaking photo with better lighting and focus');
    } else if (result.confidence < 0.6) {
      result.recommendations.push('Analysis may benefit from additional product details');
    }

    return result;
  }

  private isValidPriceFormat(priceString: string): boolean {
    if (!priceString || priceString.includes('not available') || priceString.includes('unavailable')) {
      return false;
    }

    // Check for valid price patterns: $X, $X - $Y, $X-$Y USD, etc.
    const pricePattern = /\$\d+(?:\.\d{2})?(?:\s*-\s*\$\d+(?:\.\d{2})?)?(?:\s*USD)?/i;
    return pricePattern.test(priceString);
  }

  private extractPriceRange(priceString: string): { min: number; max: number } | null {
    if (!this.isValidPriceFormat(priceString)) return null;

    const numbers = priceString.match(/\d+(?:\.\d{2})?/g);
    if (!numbers || numbers.length === 0) return null;

    const prices = numbers.map(n => parseFloat(n));

    if (prices.length === 1) {
      return { min: prices[0], max: prices[0] };
    } else {
      return { min: Math.min(...prices), max: Math.max(...prices) };
    }
  }

  generateAccuracyReport(imageValidation: ValidationResult, dataValidation: ValidationResult): {
    overallConfidence: number;
    status: 'excellent' | 'good' | 'fair' | 'poor';
    summary: string;
    improvements: string[];
  } {
    const overallConfidence = (imageValidation.confidence + dataValidation.confidence) / 2;
    const allIssues = [...imageValidation.issues, ...dataValidation.issues];
    const allRecommendations = [...imageValidation.recommendations, ...dataValidation.recommendations];

    let status: 'excellent' | 'good' | 'fair' | 'poor';
    if (overallConfidence >= 0.85) status = 'excellent';
    else if (overallConfidence >= 0.7) status = 'good';
    else if (overallConfidence >= 0.5) status = 'fair';
    else status = 'poor';

    const summary = this.generateSummary(overallConfidence, allIssues.length);

    return {
      overallConfidence,
      status,
      summary,
      improvements: allRecommendations
    };
  }

  private generateSummary(confidence: number, issueCount: number): string {
    if (confidence >= 0.85 && issueCount === 0) {
      return 'Excellent analysis with high confidence and comprehensive market data';
    } else if (confidence >= 0.7) {
      return 'Good analysis with reliable product identification and pricing';
    } else if (confidence >= 0.5) {
      return 'Fair analysis - some details may need verification';
    } else {
      return 'Limited analysis accuracy - consider retaking photo or providing additional context';
    }
  }
}

export const accuracyValidator = new AccuracyValidator();