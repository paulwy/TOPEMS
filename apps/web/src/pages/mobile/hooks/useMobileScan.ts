import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useNotificationStore } from '@/store';
import { MOBILE_PATHS } from '@/modules/mobile/config';

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

export const useMobileScan = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { addNotification } = useNotificationStore();

  const [activeTab, setActiveTab] = useState(0);
  const [flashOn, setFlashOn] = useState(false);
  const [scanning, setScanning] = useState(true);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const [manualInput, setManualInput] = useState('');

  const tabs = useMemo(
    () => [
      t('mobile.scan.title.title'),
      t('mobile.scan.section.history'),
      t('mobile.scan.section.manual'),
    ],
    [t]
  );

  useEffect(() => {
    const history: ScanHistoryItem[] = [
      {
        id: '1',
        content: 'PROD-2024-001234',
        type: 'barcode',
        format: 'Code 128',
        time: '10:30',
        relatedData: {
          type: t('mobile.scan.label.product'),
          name: t('mobile.scan.name.smart_sensor'),
          code: 'PROD-2024-001234',
        },
      },
      {
        id: '2',
        content: 'INV-A3-005678',
        type: 'qrcode',
        format: 'QR Code',
        time: '09:45',
        relatedData: {
          type: t('mobile.scan.label.location'),
          name: 'A3-05-02',
          code: 'INV-A3-005678',
        },
      },
      {
        id: '3',
        content: 'PO-2024-06-0891',
        type: 'barcode',
        format: 'EAN-13',
        time: t('mobile.scan.time.yesterday_1620'),
        relatedData: {
          type: t('mobile.scan.label.purchase_order'),
          name: t('mobile.scan.name.electronic_purchase'),
          code: 'PO-2024-06-0891',
        },
      },
      {
        id: '4',
        content: 'EMP-10086',
        type: 'qrcode',
        format: 'QR Code',
        time: t('mobile.scan.time.yesterday_1415'),
        relatedData: {
          type: t('mobile.scan.label.employee_badge'),
          name: t('mobile.scan.name.zhang_ming'),
          code: 'EMP-10086',
        },
      },
      {
        id: '5',
        content: 'EQ-2024-0042',
        type: 'barcode',
        format: 'Code 39',
        time: t('mobile.scan.time.day_before_1000'),
        relatedData: {
          type: t('mobile.scan.label.equipment'),
          name: t('mobile.scan.name.cnc_center'),
          code: 'EQ-2024-0042',
        },
      },
    ];
    setScanHistory(history);
  }, [t]);

  const simulateScan = useCallback(() => {
    if (!scanning) return;

    const mockResults = [
      { content: 'PROD-2024-009999', format: 'Code 128', type: 'barcode' as const },
      { content: 'https://topems.com/item/12345', format: 'QR Code', type: 'qrcode' as const },
      { content: 'INV-B2-001234', format: 'QR Code', type: 'qrcode' as const },
    ];

    const randomResult = mockResults[Math.floor(Math.random() * mockResults.length)];

    setTimeout(() => {
      if (scanning) {
        setScanResult(randomResult.content);
        setScanning(false);

        const newHistoryItem: ScanHistoryItem = {
          id: Date.now().toString(),
          content: randomResult.content,
          type: randomResult.type,
          format: randomResult.format,
          time: t('mobile.scan.time.just_now'),
          relatedData: {
            type: t('mobile.scan.label.material'),
            name: t('mobile.scan.name.resistor_10k'),
            code: randomResult.content,
          },
        };

        setScanHistory((prev) => [newHistoryItem, ...prev]);
        addNotification({
          title: t('mobile.scan.message.scan_success'),
          message: randomResult.content,
          type: 'success',
        });
      }
    }, 2000);
  }, [scanning, addNotification, t]);

  useEffect(() => {
    if (activeTab === 0 && scanning && !scanResult) {
      const timer = setTimeout(() => {
        simulateScan();
      }, 2000);
      return () => clearTimeout(timer);
    }
    return;
  }, [activeTab, scanning, scanResult, simulateScan]);

  const handleRescan = useCallback(() => {
    setScanResult(null);
    setScanning(true);
  }, []);

  const handleTabChange = useCallback((_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    if (newValue === 0) {
      setScanResult(null);
      setScanning(true);
    }
  }, []);

  const handleBottomTabChange = useCallback(
    (tabId: string) => {
      switch (tabId) {
        case 'home':
          navigate(MOBILE_PATHS.home);
          break;
        case 'tasks':
          navigate(MOBILE_PATHS.tasks);
          break;
        case 'scan':
          break;
        case 'approval':
          navigate(MOBILE_PATHS.approvals);
          break;
        case 'profile':
          navigate(MOBILE_PATHS.settings);
          break;
      }
    },
    [navigate]
  );

  const handleManualSubmit = useCallback(() => {
    if (!manualInput.trim()) return;

    setScanResult(manualInput);
    const newHistoryItem: ScanHistoryItem = {
      id: Date.now().toString(),
      content: manualInput,
      type: 'barcode',
      format: t('mobile.scan.section.manual'),
      time: t('mobile.scan.time.just_now'),
    };
    setScanHistory((prev) => [newHistoryItem, ...prev]);
    setActiveTab(0);
    addNotification({
      title: t('mobile.scan.message.input_success'),
      message: manualInput,
      type: 'success',
    });
  }, [manualInput, addNotification, t]);

  const handleCopyResult = useCallback(() => {
    if (scanResult) {
      navigator.clipboard.writeText(scanResult);
      addNotification({
        title: t('mobile.scan.message.copied'),
        message: t('mobile.scan.message.copied_to_clipboard'),
        type: 'info',
      });
    }
  }, [scanResult, addNotification, t]);

  const handleClearHistory = useCallback(() => {
    setScanHistory([]);
    addNotification({
      title: t('mobile.scan.message.cleared'),
      message: t('mobile.scan.message.history_cleared'),
      type: 'info',
    });
  }, [addNotification, t]);

  const filteredHistory = useMemo(
    () =>
      scanHistory.filter((item) => item.content.toLowerCase().includes(searchQuery.toLowerCase())),
    [scanHistory, searchQuery]
  );

  return {
    activeTab,
    setActiveTab,
    flashOn,
    setFlashOn,
    scanning,
    setScanning,
    scanResult,
    setScanResult,
    scanHistory,
    setScanHistory,
    searchQuery,
    setSearchQuery,
    videoRef,
    manualInput,
    setManualInput,
    tabs,
    handleRescan,
    handleTabChange,
    handleBottomTabChange,
    handleManualSubmit,
    handleCopyResult,
    handleClearHistory,
    filteredHistory,
  };
};
