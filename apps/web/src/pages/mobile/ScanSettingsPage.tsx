import React, { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../../store';
import {
  Barcode,
  Camera,
  Shield,
  Clock,
  Sparkles,
} from 'lucide-react';
import {
  SettingsPageTemplate,
  type SettingSection,
  type SettingValueType,
} from '@/components/templates';

interface ScanSetting {
  key: string;
  label: string;
  value: boolean | string | number;
  description: string;
  type: 'switch' | 'text' | 'select';
  options?: { value: string; label: string }[];
}

const ScanSettingsPage: React.FC = () => {
  const addNotification = useAppStore((state) => state.addNotification);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scanSettings, setScanSettings] = useState<ScanSetting[]>([
    {
      key: 'enabled',
      label: '启用扫码',
      value: true,
      description: '允许使用摄像头扫描条码',
      type: 'switch',
    },
    {
      key: 'auto_scan',
      label: '自动识别',
      value: true,
      description: '识别到条码后自动完成扫描',
      type: 'switch',
    },
    {
      key: 'continuous',
      label: '连续扫描',
      value: false,
      description: '支持连续扫描多个条码',
      type: 'switch',
    },
    {
      key: 'format',
      label: '条码格式',
      value: 'all',
      description: '支持的条码类型',
      type: 'select',
      options: [
        { value: 'all', label: '全部格式' },
        { value: 'code128', label: 'Code 128' },
        { value: 'ean13', label: 'EAN-13' },
        { value: 'qr', label: 'QR Code' },
        { value: 'upc', label: 'UPC' },
      ],
    },
    {
      key: 'timeout',
      label: '超时时间',
      value: '10',
      description: '扫描超时时间（秒）',
      type: 'text',
    },
    {
      key: 'history',
      label: '保存历史',
      value: true,
      description: '保存扫描历史记录',
      type: 'switch',
    },
    {
      key: 'history_limit',
      label: '历史数量',
      value: '50',
      description: '最多保存的历史记录数',
      type: 'text',
    },
  ]);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const stored = localStorage.getItem('scan_settings');
      if (stored) {
        setScanSettings(JSON.parse(stored));
      }
    } catch (err: unknown) {
      console.error('Error loading scan settings:', err);
      addNotification({ title: '加载失败', message: '加载扫描设置失败', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSave = async (data: Record<string, SettingValueType>) => {
    try {
      setSaving(true);
      const updatedSettings = scanSettings.map((s) => ({
        ...s,
        value: data[s.key] !== undefined ? (data[s.key] as boolean | string | number) : s.value,
      }));
      setScanSettings(updatedSettings);
      localStorage.setItem('scan_settings', JSON.stringify(updatedSettings));
      addNotification({ title: '成功', message: '扫描设置保存成功', type: 'success' });
    } catch (err: unknown) {
      console.error('Error saving scan settings:', err);
      addNotification({ title: '失败', message: '保存设置失败', type: 'error' });
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleReset = useCallback(() => {
    setScanSettings([
      {
        key: 'enabled',
        label: '启用扫码',
        value: true,
        description: '允许使用摄像头扫描条码',
        type: 'switch',
      },
      {
        key: 'auto_scan',
        label: '自动识别',
        value: true,
        description: '识别到条码后自动完成扫描',
        type: 'switch',
      },
      {
        key: 'continuous',
        label: '连续扫描',
        value: false,
        description: '支持连续扫描多个条码',
        type: 'switch',
      },
      {
        key: 'format',
        label: '条码格式',
        value: 'all',
        description: '支持的条码类型',
        type: 'select',
        options: [
          { value: 'all', label: '全部格式' },
          { value: 'code128', label: 'Code 128' },
          { value: 'ean13', label: 'EAN-13' },
          { value: 'qr', label: 'QR Code' },
          { value: 'upc', label: 'UPC' },
        ],
      },
      {
        key: 'timeout',
        label: '超时时间',
        value: '10',
        description: '扫描超时时间（秒）',
        type: 'text',
      },
      {
        key: 'history',
        label: '保存历史',
        value: true,
        description: '保存扫描历史记录',
        type: 'switch',
      },
      {
        key: 'history_limit',
        label: '历史数量',
        value: '50',
        description: '最多保存的历史记录数',
        type: 'text',
      },
    ]);
    addNotification({ title: '已重置', message: '扫描设置已恢复默认值', type: 'info' });
  }, [addNotification]);

  const formatSetting = scanSettings.find((s) => s.key === 'format')!;

  const sections: SettingSection[] = [
    {
      id: 'basic',
      title: '基础设置',
      icon: <Barcode style={{ width: 20, height: 20 }} />,
      color: 'primary',
      fields: [
        {
          id: 'enabled',
          label: '启用扫码',
          type: 'switch',
          value: scanSettings.find((s) => s.key === 'enabled')?.value as boolean,
          description: '允许使用摄像头扫描条码',
        },
        {
          id: 'auto_scan',
          label: '自动识别',
          type: 'switch',
          value: scanSettings.find((s) => s.key === 'auto_scan')?.value as boolean,
          description: '识别到条码后自动完成扫描',
        },
        {
          id: 'continuous',
          label: '连续扫描',
          type: 'switch',
          value: scanSettings.find((s) => s.key === 'continuous')?.value as boolean,
          description: '支持连续扫描多个条码',
        },
      ],
    },
    {
      id: 'format',
      title: '格式设置',
      icon: <Sparkles style={{ width: 20, height: 20 }} />,
      color: 'success',
      fields: [
        {
          id: 'format',
          label: '条码格式',
          type: 'select',
          value: formatSetting.value as string,
          description: '支持的条码类型',
          options: formatSetting.options,
        },
      ],
    },
    {
      id: 'timing',
      title: '定时设置',
      icon: <Clock style={{ width: 20, height: 20 }} />,
      color: 'warning',
      fields: [
        {
          id: 'timeout',
          label: '超时时间',
          type: 'text',
          value: scanSettings.find((s) => s.key === 'timeout')?.value as string,
          description: '扫描超时时间（秒）',
        },
      ],
    },
    {
      id: 'history',
      title: '历史记录',
      icon: <Camera style={{ width: 20, height: 20 }} />,
      color: 'info',
      fields: [
        {
          id: 'history',
          label: '保存历史',
          type: 'switch',
          value: scanSettings.find((s) => s.key === 'history')?.value as boolean,
          description: '保存扫描历史记录',
        },
        {
          id: 'history_limit',
          label: '历史数量',
          type: 'text',
          value: scanSettings.find((s) => s.key === 'history_limit')?.value as string,
          description: '最多保存的历史记录数',
        },
      ],
    },
  ];

  return (
    <SettingsPageTemplate
      title='扫码设置'
      subtitle='配置条码扫描的各项参数'
      sections={sections}
      loading={loading}
      saving={saving}
      onSave={handleSave}
      onReset={handleReset}
      saveButtonText='保存设置'
      resetButtonText='重置默认'
    />
  );
};

export default ScanSettingsPage;
