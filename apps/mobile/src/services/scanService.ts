import * as Camera from 'expo-camera';
import { zh } from '../i18n/zh';

export interface ScanResult {
  type: string;
  data: string;
}

export interface ScanOptions {
  types?: string[];
  autoFocus?: boolean;
  torch?: boolean;
}

export class ScanService {
  private static hasPermission = false;

  static async requestCameraPermission(): Promise<boolean> {
    const { status } = await Camera.Camera.requestCameraPermissionsAsync();
    this.hasPermission = status === 'granted';
    return this.hasPermission;
  }

  static hasCameraPermission(): boolean {
    return this.hasPermission;
  }

  static async getBarcodeTypes(): Promise<string[]> {
    return ScanService.getSupportedTypes();
  }

  static isQRCode(type: string): boolean {
    return type === 'qr';
  }

  static isBarcode(type: string): boolean {
    const barcodes = [
      'code128',
      'code39',
      'code93',
      'ean13',
      'ean8',
      'upc_a',
      'upc_e',
      'itf14',
      'pdf417',
      'aztec',
      'datamatrix',
      'interleaved2of5',
      'codabar',
    ];
    return barcodes.includes(type);
  }

  static getScanTypeName(type: string): string {
    const typeMap: Record<string, string> = {
      qr: zh['scan.qrTypeName'],
      code128: 'Code 128',
      code39: 'Code 39',
      code93: 'Code 93',
      ean13: 'EAN-13',
      ean8: 'EAN-8',
      upc_a: 'UPC-A',
      upc_e: 'UPC-E',
      itf14: 'ITF-14',
      pdf417: 'PDF417',
      aztec: 'Aztec',
      datamatrix: 'Data Matrix',
      interleaved2of5: zh['scan.interleaved25Name'],
      codabar: 'Codabar',
    };
    return typeMap[type] || zh['scan.unknownTypeName'];
  }

  static getSupportedTypes(): string[] {
    return [
      'qr',
      'code128',
      'code39',
      'code93',
      'ean13',
      'ean8',
      'upc_a',
      'upc_e',
      'itf14',
      'pdf417',
      'aztec',
      'datamatrix',
      'interleaved2of5',
      'codabar',
    ];
  }
}
