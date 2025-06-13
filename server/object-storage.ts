import { Client } from "@replit/object-storage";
import { Upload } from "../shared/schema";

export class ObjectStorageService {
  private client: Client;

  constructor() {
    this.client = new Client();
  }

  async uploadImage(buffer: Buffer, upload: Upload): Promise<string> {
    try {
      const objectName = `uploads/${upload.id}/${upload.filename}`;
      
      const { ok, error } = await this.client.uploadFromBytes(objectName, buffer);
      
      if (!ok) {
        console.error('Failed to upload to Object Storage:', error);
        throw new Error(`Object Storage upload failed: ${error?.message || 'Unknown error'}`);
      }

      console.log(`✓ Image uploaded to Object Storage: ${objectName}`);
      return `https://${process.env.REPL_ID}.repl.app/api/storage/${objectName}`;
    } catch (error) {
      console.error('Object Storage upload error:', error);
      throw error;
    }
  }

  async downloadImage(objectName: string): Promise<Buffer> {
    try {
      const { ok, value, error } = await this.client.downloadAsBytes(objectName);
      
      if (!ok || !value) {
        console.error('Failed to download from Object Storage:', error);
        throw new Error(`Object Storage download failed: ${error?.message || 'Unknown error'}`);
      }

      return value;
    } catch (error) {
      console.error('Object Storage download error:', error);
      throw error;
    }
  }

  async deleteImage(upload: Upload): Promise<void> {
    try {
      const objectName = `uploads/${upload.id}/${upload.filename}`;
      
      const { ok, error } = await this.client.delete(objectName);
      
      if (!ok) {
        console.error('Failed to delete from Object Storage:', error);
        throw new Error(`Object Storage delete failed: ${error?.message || 'Unknown error'}`);
      }

      console.log(`✓ Image deleted from Object Storage: ${objectName}`);
    } catch (error) {
      console.error('Object Storage delete error:', error);
      throw error;
    }
  }

  async imageExists(upload: Upload): Promise<boolean> {
    try {
      const objectName = `uploads/${upload.id}/${upload.filename}`;
      
      const { ok, value, error } = await this.client.exists(objectName);
      
      if (!ok) {
        console.error('Failed to check Object Storage existence:', error);
        return false;
      }

      return value;
    } catch (error) {
      console.error('Object Storage exists check error:', error);
      return false;
    }
  }

  getPublicUrl(upload: Upload): string {
    return `https://${process.env.REPL_ID}.repl.app/api/storage/uploads/${upload.id}/${upload.filename}`;
  }
}

export const objectStorageService = new ObjectStorageService();