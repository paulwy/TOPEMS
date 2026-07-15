import * as BarcodeScanner from 'expo-barcode-scanner';

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
    const { status } = await BarcodeScanner.requestPermissionsAsync();
    this.hasPermission = status === 'granted';
    return this.hasPermission;
  }

  static hasCameraPermission(): boolean {
    return this.hasPermission;
  }

  static async getBarcodeTypes(): Promise<string[]> {
    return Object.values(BarcodeScanner.Constants.BarCodeType);
  }

  static isQRCode(type: string): boolean {
    return type === BarcodeScanner.Constants.BarCodeType.qr;
  }

  static isBarcode(type: string): boolean {
    const barcodes = [
      BarcodeScanner.Constants.BarCodeType.code128,
      BarcodeScanner.Constants.BarCodeType.code39,
      BarcodeScanner.Constants.BarCodeType.code93,
      BarcodeScanner.Constants.BarCodeType.ean13,
      BarcodeScanner.Constants.BarCodeType.ean8,
      BarcodeScanner.Constants.BarCodeType.upc_a,
      BarcodeScanner.Constants.BarCodeType.upc_e,
      BarcodeScanner.Constants.BarCodeType.itf14,
      BarcodeScanner.Constants.BarCodeType.pdf417,
      BarcodeScanner.Constants.BarCodeType.aztec,
      BarcodeScanner.Constants.BarCodeType.datamatrix,
      BarcodeScanner.Constants.BarCodeType.interleaved2of5,
      BarcodeScanner.Constants.BarCodeType.codabar,
    ];
    return barcodes.includes(type);
  }

  static getScanTypeName(type: string): string {
    const typeMap: Record<string, string> = {
      [BarcodeScanner.Constants.BarCodeType.qr]: '二维码',
      [BarcodeScanner.Constants.BarCodeType.code128]: 'Code 128',
      [BarcodeScanner.Constants.BarCodeType.code39]: 'Code 39',
      [BarcodeScanner.Constants.BarCodeType.code93]: 'Code 93',
      [BarcodeScanner.Constants.BarCodeType.ean13]: 'EAN-13',
      [BarcodeScanner.Constants.BarCodeType.ean8]: 'EAN-8',
      [BarcodeScanner.Constants.BarCodeType.upc_a]: 'UPC-A',
      [BarcodeScanner.Constants.BarCodeType.upc_e]: 'UPC-E',
      [BarcodeScanner.Constants.BarCodeType.itf14]: 'ITF-14',
      [BarcodeScanner.Constants.BarCodeType.pdf417]: 'PDF417',
      [BarcodeScanner.Constants.BarCodeType.aztec]: 'Aztec',
      [BarcodeScanner.Constants.BarCodeType.datamatrix]: 'Data Matrix',
      [BarcodeScanner.Constants.BarCodeType.interleaved2of5]: '交叉25码',
      [BarcodeScanner.Constants.BarCodeType.codabar]: 'Codabar',
    };
    return typeMap[type] || '未知';
  }

  static getSupportedTypes(): string[] {
    return [
      BarcodeScanner.Constants.BarCodeType.qr,
      BarcodeScanner.Constants.BarCodeType.code128,
      BarcodeScanner.Constants.BarCodeType.code39,
      BarcodeScanner.Constants.BarCodeType.code93,
      BarcodeScanner.Constants.BarCodeType.ean13,
      BarcodeScanner.Constants.BarCodeType.ean8,
      BarcodeScanner.Constants.BarCodeType.upc_a,
      BarcodeScanner.Constants.BarCodeType.upc_e,
      BarcodeScanner.Constants.BarCodeType.itf14,
      BarcodeScanner.Constants.BarCodeType.pdf417,
      BarcodeScanner.Constants.BarCodeType.aztec,
      BarcodeScanner.Constants.BarCodeType.datamatrix,
      BarcodeScanner.Constants.BarCodeType.interleaved2of5,
      BarcodeScanner.Constants.BarCodeType.codabar,
    ];
  }
}
