
import { accuracyValidator } from '../features/analysis';
import { ValidationResult, ProductData } from '@shared/types/analysis';

export class AnalysisService {
  async validateImage(imageData: string): Promise<ValidationResult> {
    return accuracyValidator.validateImageQuality(imageData);
  }

  async validateProductData(data: ProductData): Promise<ValidationResult> {
    return accuracyValidator.validateProductData(data);
  }

  async generateReport(imageValidation: ValidationResult, dataValidation: ValidationResult) {
    return accuracyValidator.generateAccuracyReport(imageValidation, dataValidation);
  }
}

export const analysisService = new AnalysisService();
