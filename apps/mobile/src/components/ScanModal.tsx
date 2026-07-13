import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Modal } from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { X, Camera, Zap, RefreshCw } from 'lucide-react-native';
import { ScanService } from '@/services/scanService';

interface ScanModalProps {
  visible: boolean;
  onClose: () => void;
  onScanSuccess: (type: string, data: string) => void;
  scanType?: 'barcode' | 'qr' | 'all';
}

const ScanModal: React.FC<ScanModalProps> = ({ visible, onClose, onScanSuccess, scanType = 'all' }) => {
  const [hasPermission, setHasPermission] = useState(false);
  const [scanning, setScanning] = useState(true);
  const [torchOn, setTorchOn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<BarCodeScanner>(null);

  useEffect(() => {
    if (visible) {
      requestPermission();
    } else {
      setScanning(false);
      setError(null);
    }
  }, [visible]);

  const requestPermission = async () => {
    const granted = await ScanService.requestCameraPermission();
    setHasPermission(granted);
    if (granted) {
      setScanning(true);
    } else {
      setError('需要相机权限才能使用扫码功能');
    }
  };

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    if (!scanning) return;

    const isQR = ScanService.isQRCode(type);
    const isBar = ScanService.isBarcode(type);

    if (scanType === 'qr' && !isQR) return;
    if (scanType === 'barcode' && !isBar) return;

    setScanning(false);
    onScanSuccess(type, data);
  };

  const handleToggleTorch = () => {
    setTorchOn(!torchOn);
  };

  const handleRetry = () => {
    setError(null);
    requestPermission();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
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
              <TouchableOpacity onPress={handleRetry} style={styles.retryButton}>
                <RefreshCw size={18} color="#fff" />
                <Text style={styles.retryButtonText}>重新获取权限</Text>
              </TouchableOpacity>
            </View>
          ) : !hasPermission ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>正在请求相机权限...</Text>
            </View>
          ) : (
            <>
              <BarCodeScanner
                ref={scannerRef}
                style={styles.scanner}
                onBarCodeScanned={scanning ? handleBarCodeScanned : undefined}
              />

              <View style={styles.scanArea}>
                <View style={styles.scanLine} />
                <View style={styles.cornerTopLeft} />
                <View style={styles.cornerTopRight} />
                <View style={styles.cornerBottomLeft} />
                <View style={styles.cornerBottomRight} />
              </View>

              <View style={styles.hintContainer}>
                <Text style={styles.hintText}>将条码对准扫描框</Text>
                {scanType === 'qr' && <Text style={styles.hintSubText}>仅识别二维码</Text>}
                {scanType === 'barcode' && <Text style={styles.hintSubText}>仅识别条形码</Text>}
              </View>
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
  },
  scanLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#2563eb',
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
    bottom: 120,
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
});

export default ScanModal;
