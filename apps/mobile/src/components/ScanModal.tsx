import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Modal,
  Animated,
  Easing,
  Linking,
  Alert,
} from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';
import {
  X,
  Camera,
  Zap,
  RefreshCw,
  Check,
  RotateCcw,
  Package,
  Hash,
  Box,
  FileText,
  History,
} from 'lucide-react-native';
import { ScanService } from '@/services/scanService';
import { inventoryApi } from '@/api/inventory';
import { productionApi } from '@/api/production';
import { deviceApi } from '@/api/device';
import { storage } from '@/utils/storage';

interface ScanModalProps {
  visible: boolean;
  onClose: () => void;
  onScanSuccess: (
    type: string,
    data: string,
    recognizedType?: string,
    recognizedData?: unknown,
  ) => void;
  scanType?: 'barcode' | 'qr' | 'all';
  mode?: 'single' | 'continuous' | 'inventory' | 'asset' | 'order' | 'auto';
}

interface ScanHistoryItem {
  id: string;
  type: string;
  data: string;
  timestamp: Date;
  recognizedType?: string;
  recognizedName?: string;
}

interface RecognizedResult {
  type: 'inventory' | 'asset' | 'order' | 'unknown';
  name?: string;
  data?: unknown;
}

const ScanModal: React.FC<ScanModalProps> = ({
  visible,
  onClose,
  onScanSuccess,
  scanType = 'all',
  mode = 'single',
}) => {
  const [hasPermission, setHasPermission] = useState(false);
  const [scanning, setScanning] = useState(true);
  const [torchOn, setTorchOn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<{ type: string; data: string } | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([]);
  const [recognizedResult, setRecognizedResult] = useState<RecognizedResult | null>(null);
  const [recognizedText, setRecognizedText] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const scannerRef = useRef<BarCodeScanner>(null);
  const scanLineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      requestPermission();
      loadScanHistory();
    } else {
      setScanning(false);
      setError(null);
      setScanResult(null);
      setRecognizedResult(null);
      setRecognizedText(null);
      setShowHistory(false);
    }
  }, [visible]);

  useEffect(() => {
    if (scanning && hasPermission) {
      Animated.loop(
        Animated.timing(scanLineAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ).start();
    }
    return () => {
      scanLineAnim.stopAnimation();
    };
  }, [scanning, hasPermission, scanLineAnim]);

  const requestPermission = async () => {
    const granted = await ScanService.requestCameraPermission();
    setHasPermission(granted);
    if (granted) {
      setScanning(true);
      setError(null);
    } else {
      setError('需要相机权限才能使用扫码功能');
    }
  };

  const handleOpenSettings = () => {
    Linking.openSettings().catch(() => {
      Alert.alert('提示', '无法打开设置，请手动前往系统设置开启相机权限');
    });
  };

  const loadScanHistory = async () => {
    try {
      const stored = await storage.getScanHistory<ScanHistoryItem[]>();
      if (stored) {
        const history = stored.map((item) => ({
          ...item,
          timestamp: new Date(item.timestamp),
        }));
        setScanHistory(history);
      }
    } catch {
      setScanHistory([]);
    }
  };

  const saveScanHistory = async (item: ScanHistoryItem) => {
    try {
      const newHistory = [item, ...scanHistory].slice(0, 20);
      setScanHistory(newHistory);
      await storage.setScanHistory(newHistory);
    } catch {
      /* ignore */
    }
  };

  const handleAutoRecognition = async (data: string): Promise<RecognizedResult> => {
    const modesToTry: Array<'inventory' | 'asset' | 'order'> =
      mode === 'auto'
        ? ['inventory', 'asset', 'order']
        : mode === 'inventory' || mode === 'asset' || mode === 'order'
          ? [mode]
          : [];

    for (const currentMode of modesToTry) {
      try {
        if (currentMode === 'inventory') {
          const result = await inventoryApi.scanBarcode(data);
          if (result.data) {
            return {
              type: 'inventory',
              name: result.data.name || result.data.code,
              data: result.data,
            };
          }
        } else if (currentMode === 'asset') {
          const result = await deviceApi.getDevices({ pageSize: 100 });
          const devices = result.data.items || [];
          const matched = devices.find((d) => d.deviceToken === data || d.id === data);
          if (matched) {
            return {
              type: 'asset',
              name: matched.deviceModel || matched.id,
              data: matched,
            };
          }
        } else if (currentMode === 'order') {
          const result = await productionApi.getOrders({ pageSize: 100 });
          const orders = result.data.items || [];
          const matched = orders.find((o) => o.code === data || o.id === data);
          if (matched) {
            return {
              type: 'order',
              name: matched.productName || matched.code,
              data: matched,
            };
          }
        }
      } catch {
        /* ignore */
      }
    }
    return { type: 'unknown' };
  };

  const handleBarCodeScanned = useCallback(
    async ({ type, data }: { type: string; data: string }) => {
      if (!scanning) return;

      const isQR = ScanService.isQRCode(type);
      const isBar = ScanService.isBarcode(type);

      if (scanType === 'qr' && !isQR) return;
      if (scanType === 'barcode' && !isBar) return;

      const scanTypeName = ScanService.getScanTypeName(type);
      setScanResult({ type: scanTypeName, data });
      setRecognizedResult(null);
      setRecognizedText(null);

      if (mode === 'auto' || mode === 'inventory' || mode === 'asset' || mode === 'order') {
        setRecognizedText('正在识别...');
        const recognition = await handleAutoRecognition(data);
        setRecognizedResult(recognition);

        if (recognition.type === 'unknown') {
          setRecognizedText('未识别到相关信息');
        } else {
          const typeNames = { inventory: '库存', asset: '资产', order: '订单' };
          setRecognizedText(`识别为${typeNames[recognition.type]}: ${recognition.name}`);
        }
      }

      const historyItem: ScanHistoryItem = {
        id: `${Date.now()}`,
        type: scanTypeName,
        data,
        timestamp: new Date(),
        recognizedType: recognizedResult?.type,
        recognizedName: recognizedResult?.name,
      };
      saveScanHistory(historyItem);

      onScanSuccess(type, data, recognizedResult?.type, recognizedResult?.data);

      if (mode === 'single') {
        setScanning(false);
      }
    },
    [scanning, scanType, mode, onScanSuccess, recognizedResult],
  );

  const handleToggleTorch = () => {
    setTorchOn(!torchOn);
  };

  const handleRetry = () => {
    setError(null);
    setScanResult(null);
    setRecognizedResult(null);
    setRecognizedText(null);
    requestPermission();
  };

  const handleContinueScan = () => {
    setScanResult(null);
    setRecognizedResult(null);
    setRecognizedText(null);
    setScanning(true);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <View style={styles.scannerContainer}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.title}>扫码</Text>
            <TouchableOpacity onPress={handleToggleTorch} style={styles.torchButton}>
              <Zap size={24} color={torchOn ? '#fbbf24' : '#fff'} />
            </TouchableOpacity>
          </View>

          {error ? (
            <View style={styles.errorContainer}>
              <Camera size={48} color="#ef4444" />
              <Text style={styles.errorText}>{error}</Text>
              <View style={styles.errorActions}>
                <TouchableOpacity onPress={handleRetry} style={styles.retryButton}>
                  <RefreshCw size={18} color="#fff" />
                  <Text style={styles.retryButtonText}>重新获取权限</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleOpenSettings} style={styles.settingsButton}>
                  <Text style={styles.settingsButtonText}>前往设置</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : !hasPermission ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>正在请求相机权限...</Text>
            </View>
          ) : scanResult ? (
            <View style={styles.resultContainer}>
              <View style={styles.resultCard}>
                <View style={styles.resultIcon}>
                  {ScanService.isQRCode(scanResult.type) ? (
                    <Hash size={32} color="#2563eb" />
                  ) : (
                    <Package size={32} color="#22c55e" />
                  )}
                </View>
                <Text style={styles.resultType}>{scanResult.type}</Text>
                <Text style={styles.resultData}>{scanResult.data}</Text>
                {recognizedText && (
                  <View style={styles.recognizedContainer}>
                    <View style={styles.recognizedIcon}>
                      {recognizedResult?.type === 'inventory' && (
                        <Package size={16} color="#22c55e" />
                      )}
                      {recognizedResult?.type === 'asset' && <Box size={16} color="#3b82f6" />}
                      {recognizedResult?.type === 'order' && <FileText size={16} color="#f59e0b" />}
                      {recognizedResult?.type === 'unknown' && <Hash size={16} color="#6b7280" />}
                    </View>
                    <Text
                      style={[
                        styles.recognizedText,
                        recognizedResult?.type === 'unknown'
                          ? styles.recognizedUnknown
                          : styles.recognizedSuccess,
                      ]}
                    >
                      {recognizedText}
                    </Text>
                  </View>
                )}
                <View style={styles.resultActions}>
                  <TouchableOpacity onPress={handleContinueScan} style={styles.continueButton}>
                    <RotateCcw size={18} color="#fff" />
                    <Text style={styles.continueButtonText}>继续扫描</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={onClose} style={styles.confirmButton}>
                    <Check size={18} color="#fff" />
                    <Text style={styles.confirmButtonText}>确认</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ) : (
            <>
              <BarCodeScanner
                ref={scannerRef}
                style={styles.scanner}
                onBarCodeScanned={scanning ? handleBarCodeScanned : undefined}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                {...({ torchMode: torchOn ? 'on' : 'off' } as any)}
              />

              <View style={styles.scanArea}>
                <Animated.View
                  style={[
                    styles.scanLine,
                    {
                      top: scanLineAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 200],
                      }),
                    },
                  ]}
                />
                <View style={styles.cornerTopLeft} />
                <View style={styles.cornerTopRight} />
                <View style={styles.cornerBottomLeft} />
                <View style={styles.cornerBottomRight} />
              </View>

              <View style={styles.hintContainer}>
                <Text style={styles.hintText}>将条码对准扫描框</Text>
                {scanType === 'qr' && <Text style={styles.hintSubText}>仅识别二维码</Text>}
                {scanType === 'barcode' && <Text style={styles.hintSubText}>仅识别条形码</Text>}
                {mode === 'continuous' && <Text style={styles.hintSubText}>连续扫描模式</Text>}
                {mode === 'inventory' && <Text style={styles.hintSubText}>库存扫码入库模式</Text>}
                {mode === 'asset' && <Text style={styles.hintSubText}>资产识别模式</Text>}
                {mode === 'order' && <Text style={styles.hintSubText}>订单识别模式</Text>}
                {mode === 'auto' && <Text style={styles.hintSubText}>自动识别模式</Text>}
              </View>

              <TouchableOpacity
                onPress={() => setShowHistory(!showHistory)}
                style={styles.historyToggleButton}
              >
                <History size={18} color="#fff" />
                <Text style={styles.historyToggleText}>
                  {showHistory ? '隐藏' : '显示'}扫描历史
                </Text>
              </TouchableOpacity>

              {showHistory && scanHistory.length > 0 && (
                <View style={styles.historyContainer}>
                  <Text style={styles.historyTitle}>最近扫描记录</Text>
                  <View style={styles.historyList}>
                    {scanHistory.slice(0, 10).map((item, index) => (
                      <View
                        key={item.id}
                        style={[
                          styles.historyItem,
                          index === scanHistory.slice(0, 10).length - 1 && styles.historyItemLast,
                        ]}
                      >
                        <View style={styles.historyItemContent}>
                          <Text style={styles.historyData}>{item.data}</Text>
                          {item.recognizedName && (
                            <Text style={styles.historyRecognized}>{item.recognizedName}</Text>
                          )}
                        </View>
                        <Text style={styles.historyTime}>{formatTime(item.timestamp)}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </>
          )}

          <View style={styles.footer}>
            <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>取消</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  header: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  torchButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanner: {
    width: '100%',
    height: '100%',
  },
  scanArea: {
    position: 'absolute',
    top: '30%',
    left: '15%',
    right: '15%',
    height: 200,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#2563eb',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  cornerTopLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 20,
    height: 20,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#2563eb',
    borderRadius: 4,
  },
  cornerTopRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 20,
    height: 20,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: '#2563eb',
    borderRadius: 4,
  },
  cornerBottomLeft: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 20,
    height: 20,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#2563eb',
    borderRadius: 4,
  },
  cornerBottomRight: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: '#2563eb',
    borderRadius: 4,
  },
  hintContainer: {
    position: 'absolute',
    bottom: 200,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hintText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  hintSubText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 4,
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  cancelButton: {
    paddingHorizontal: 40,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 24,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    marginTop: 16,
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#2563eb',
    borderRadius: 24,
  },
  retryButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#fff',
  },
  resultContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  resultCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  resultIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultType: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  resultData: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 16,
  },
  inventoryResult: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    width: '100%',
  },
  inventorySuccess: {
    color: '#22c55e',
    backgroundColor: '#ecfdf5',
  },
  inventoryError: {
    color: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  resultActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  continueButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#6b7280',
    borderRadius: 12,
  },
  continueButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
    marginLeft: 8,
  },
  confirmButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#2563eb',
    borderRadius: 12,
  },
  confirmButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
    marginLeft: 8,
  },
  historyContainer: {
    position: 'absolute',
    bottom: 160,
    left: 20,
    right: 20,
  },
  historyTitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 8,
  },
  historyList: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 8,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  historyItemLast: {
    borderBottomWidth: 0,
  },
  historyData: {
    fontSize: 14,
    color: '#fff',
    flex: 1,
  },
  historyTime: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginLeft: 12,
  },
  errorActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  settingsButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 24,
  },
  settingsButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  recognizedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    marginBottom: 20,
  },
  recognizedIcon: {
    marginRight: 8,
  },
  recognizedText: {
    fontSize: 14,
    flex: 1,
  },
  recognizedSuccess: {
    color: '#22c55e',
    backgroundColor: '#ecfdf5',
  },
  recognizedUnknown: {
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
  },
  historyToggleButton: {
    position: 'absolute',
    bottom: 180,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
  },
  historyToggleText: {
    fontSize: 14,
    color: '#fff',
    marginLeft: 8,
  },
  historyItemContent: {
    flex: 1,
    flexDirection: 'column',
  },
  historyRecognized: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 2,
  },
});

export default ScanModal;
