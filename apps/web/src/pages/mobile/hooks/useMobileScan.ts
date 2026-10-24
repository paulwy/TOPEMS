export interface ScanHistoryItem {
  id: string;
  content: string;
  type: 'barcode' | 'qrcode';
  format: string;
  time: string;
  relatedData?: {
    type: string;
    name: string;
    code: string;
  };
}
