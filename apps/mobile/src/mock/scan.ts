import type { ApiResponse } from '@/types';
import type { BarcodeScanRequest, BarcodeScanResponse, QrCodeScanRequest, QrCodeScanResponse, ScanRecord } from '@/api/scan';

const mockItems = [
  { item_code: 'SKU-001', item_name: '企业版授权许可', item_type: 'software' },
  { item_code: 'SKU-002', item_name: '标准版授权许可', item_type: 'software' },
  { item_code: 'SKU-003', item_name: '专业版授权许可', item_type: 'software' },
  { item_code: 'INV-001', item_name: 'A4打印纸', item_type: 'stationery' },
  { item_code: 'INV-002', item_name: '黑色签字笔', item_type: 'stationery' },
  { item_code: 'WM-001', item_name: '仓库A-货架1', item_type: 'warehouse' },
  { item_code: 'WM-002', item_name: '仓库B-货架2', item_type: 'warehouse' },
];

const mockScanHistory: ScanRecord[] = [
  { id: '1', scan_type: 'barcode', scan_data: 'SKU-001', result_data: mockItems[0], location_lat: 31.2304, location_lng: 121.4737, created_at: '2024-01-15T10:30:00Z' },
  { id: '2', scan_type: 'qrcode', scan_data: 'https://topems.cn/inv/WM-001', result_data: mockItems[5], location_lat: 31.2304, location_lng: 121.4737, created_at: '2024-01-15T11:15:00Z' },
  { id: '3', scan_type: 'barcode', scan_data: 'INV-001', result_data: mockItems[3], location_lat: 31.2304, location_lng: 121.4737, created_at: '2024-01-14T09:00:00Z' },
  { id: '4', scan_type: 'qrcode', scan_data: 'https://topems.cn/task/TSK-001', result_data: { task_id: 'TSK-001', task_name: '月度盘点' }, location_lat: 31.2304, location_lng: 121.4737, created_at: '2024-01-14T14:30:00Z' },
  { id: '5', scan_type: 'barcode', scan_data: 'SKU-002', result_data: mockItems[1], location_lat: 31.2304, location_lng: 121.4737, created_at: '2024-01-13T16:00:00Z' },
];

export function mockScanBarcode(request: BarcodeScanRequest): ApiResponse<BarcodeScanResponse> {
  const matchedItem = mockItems.find(item => 
    item.item_code === request.barcode || 
    request.barcode.includes(item.item_code)
  );

  return {
    success: true,
    data: {
      barcode: request.barcode,
      decoded_data: `扫描成功: ${request.barcode}`,
      scan_type: request.scan_type || 'barcode',
      matched_item: matchedItem,
      timestamp: new Date().toISOString(),
    },
  };
}

export function mockScanQrcode(request: QrCodeScanRequest): ApiResponse<QrCodeScanResponse> {
  let decodedText = request.qr_data;
  let dataType = 'text';
  let decodedUrl: string | undefined;

  if (request.qr_data.startsWith('http://') || request.qr_data.startsWith('https://')) {
    decodedUrl = request.qr_data;
    dataType = 'url';
    
    const matchedItem = mockItems.find(item => 
      request.qr_data.includes(item.item_code)
    );
    if (matchedItem) {
      decodedText = `匹配到物品: ${matchedItem.item_name}`;
    }
  } else {
    const matchedItem = mockItems.find(item => 
      request.qr_data.includes(item.item_code)
    );
    if (matchedItem) {
      decodedText = `匹配到物品: ${matchedItem.item_name}`;
      dataType = 'product';
    }
  }

  return {
    success: true,
    data: {
      qr_data: request.qr_data,
      decoded_url: decodedUrl,
      decoded_text: decodedText,
      data_type: dataType,
      timestamp: new Date().toISOString(),
    },
  };
}

export function mockGetScanHistory(params?: { page?: number; pageSize?: number; scan_type?: string }): ApiResponse<{ items: ScanRecord[]; total: number }> {
  let filtered = [...mockScanHistory];
  
  if (params?.scan_type) {
    filtered = filtered.filter(record => record.scan_type === params.scan_type);
  }
  
  const page = params?.page || 1;
  const pageSize = params?.pageSize || 10;
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  
  return {
    success: true,
    data: {
      items: filtered.slice(start, end),
      total: filtered.length,
    },
  };
}

export function mockGetScanById(id: string): ApiResponse<ScanRecord> {
  const record = mockScanHistory.find(r => r.id === id);
  if (record) {
    return { success: true, data: record };
  }
  return { success: false, message: '记录不存在', data: {} as ScanRecord };
}

export function mockDeleteScanRecord(_id: string): ApiResponse<void> {
  return { success: true, data: undefined as any };
}

export function mockGetSupportedBarcodeTypes(): ApiResponse<Array<{ code: string; name: string; description: string }>> {
  return {
    success: true,
    data: [
      { code: 'qr', name: '二维码', description: 'QR Code 二维码' },
      { code: 'code128', name: 'Code 128', description: 'Code 128 条形码' },
      { code: 'code39', name: 'Code 39', description: 'Code 39 条形码' },
      { code: 'ean13', name: 'EAN-13', description: '13位欧洲商品条码' },
      { code: 'ean8', name: 'EAN-8', description: '8位欧洲商品条码' },
      { code: 'upc_a', name: 'UPC-A', description: '12位美国商品条码' },
      { code: 'upc_e', name: 'UPC-E', description: '8位美国商品条码' },
      { code: 'itf14', name: 'ITF-14', description: '14位国际贸易条码' },
      { code: 'pdf417', name: 'PDF417', description: 'PDF417 堆叠式条码' },
      { code: 'aztec', name: 'Aztec', description: 'Aztec 二维条码' },
      { code: 'datamatrix', name: 'Data Matrix', description: 'Data Matrix 二维条码' },
    ],
  };
}