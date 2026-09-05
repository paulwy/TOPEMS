import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderWithProviders, screen, fireEvent } from '@/__tests__/test-utils';

import { PageHeader } from '../PageHeader';
import { StatsSection } from '../StatsSection';
import { DataTableSection } from '../DataTableSection';

const i18nMap = vi.hoisted(
  () =>
    ({
      'pages.page_header.k0': '厂区空间数字化',
      'pages.page_header.k1': '管理设备点位、管线、仓储位置、现场取证、厂区地图和业务位置',
      'pages.page_header.k2': '导入',
      'pages.page_header.k3': '新建',
      'bi.page_header.k0': '刷新',
      'pages.stats_section.k0': '启用: ',
      'pages.stats_section.k1': '启用: ',
      'pages.stats_section.k2': '启用',
      'pages.stats_section.k3': '总数',
      'bi.gis_page_components__stats_section.equipment': '设备点位',
      'bi.gis_page_components__stats_section.text_09a0d3': '管线管理',
      'bi.gis_page_components__stats_section.text_423a98': '仓储位置',
      'bi.gis_page_components__stats_section.text_3548b7': '现场取证',
      'bi.gis_page_components__stats_section.text_0ab201': '厂区地图',
      'bi.gis_page_components__stats_section.text_71c01c': '业务位置',
      'bi.gis_page_components__stats_section.type': '类型分布',
      'bi.gis_page_components__stats_section.text_87c037': '管线管理',
      'bi.gis_page_components__stats_section.text_0ab201': '厂区地图',
      'bi.gis_page_components__stats_section.text_71c01c': '业务位置',
      'bi.gis_page_components__stats_section.status': '状态统计',
      'bi.gis_page_components__stats_section.active_2': '启用',
      'bi.gis_page_components__stats_section.text_9ed7d3': '停用',
      'bi.data_table_section.k0': '暂无数据',
      'pages.data_table_section.k0': '下载模板',
      'bi.gis_page_components__data_table_section.search_4': '搜索...',
      'bi.gis_page_components__data_table_section.equipment_name': '设备名称',
      'bi.gis_page_components__data_table_section.search': '搜索管线名称...',
      'bi.gis_page_components__data_table_section.location_name': '库位名称',
      'bi.gis_page_components__data_table_section.search_1': '搜索取证标题...',
      'bi.gis_page_components__data_table_section.search_2': '搜索地图名称...',
      'bi.gis_page_components__data_table_section.search_3': '搜索业务位置...',
      'bi.gis_page_components__import_modal.import': '导入',
      'bi.import_modal.k0': '关闭',
      'bi.import_modal.k1': '点击或拖拽文件到此处',
      'bi.import_modal.k2': '关闭',
      'bi.table_utils.k0': '编辑',
      'bi.table_utils.k1': '删除',
      'pages.import_modal.k0': '导入数据',
      'pages.import_modal.csv_1': '选择CSV文件',
      'pages.import_modal.csv_2': '支持CSV格式文件',
      'pages.import_modal.10_3': '文件预览（前10行）',
      'pages.import_modal.k4': '取消',
      'pages.import_modal.k5': '确认导入',
    }) as Record<string, string>
);

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      if (options && typeof options === 'object') {
        let result = i18nMap[key] ?? key;
        for (const [k, v] of Object.entries(options)) {
          result = result.replace(`{{${k}}}`, String(v));
        }
        return result;
      }
      return i18nMap[key] ?? key;
    },
    i18n: { language: 'zh-CN', changeLanguage: vi.fn() },
  }),
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}));

vi.mock('@/i18n', () => ({
  default: {
    t: (key: string, options?: Record<string, unknown>) => {
      if (options && typeof options === 'object') {
        let result = i18nMap[key] ?? key;
        for (const [k, v] of Object.entries(options)) {
          result = result.replace(`{{${k}}}`, String(v));
        }
        return result;
      }
      return i18nMap[key] ?? key;
    },
  },
}));

vi.mock('@/components/bi/MetricCard', async () => {
  const React = await import('react');
  return {
    default: ({
      title,
      value,
      subtitle,
    }: {
      title: string;
      value: string | number;
      subtitle?: string;
    }) =>
      React.createElement(
        'div',
        { 'data-testid': 'metric-card' },
        React.createElement('span', null, title),
        React.createElement('strong', null, value),
        subtitle ? React.createElement('em', null, subtitle) : null
      ),
  };
});

vi.mock('@/components/bi/StatsChart', async () => {
  const React = await import('react');
  return {
    default: ({
      title,
      type,
      data,
    }: {
      title: string;
      type: string;
      data: Array<Record<string, unknown>>;
    }) =>
      React.createElement(
        'div',
        { 'data-testid': `stats-chart-${type}` },
        React.createElement('span', null, title),
        React.createElement('small', null, JSON.stringify(data))
      ),
  };
});

vi.mock('@/components/common/DataTable', async () => {
  const React = await import('react');
  return {
    DataTable: ({
      columns,
      data,
      searchKey,
      searchPlaceholder,
      exportFileName,
    }: {
      columns: any[];
      data: any[];
      searchKey?: string;
      searchPlaceholder?: string;
      exportFileName?: string;
    }) =>
      React.createElement(
        'div',
        {
          'data-testid': 'mock-data-table',
          'data-search-key': searchKey,
          'data-search-placeholder': searchPlaceholder,
          'data-export-file-name': exportFileName,
        },
        React.createElement(
          'div',
          null,
          columns.map((column) =>
            React.createElement('span', { key: column.id ?? column.accessorKey }, column.header)
          )
        ),
        React.createElement(
          'div',
          null,
          data.map((item) =>
            React.createElement('span', { key: item.id }, item.name ?? item.title ?? item.id)
          )
        )
      ),
  };
});

vi.mock('../TableUtils', () => ({
  getDevicePointColumns: () => [{ accessorKey: 'name', header: '设备名称' }],
  getPipelineColumns: () => [{ accessorKey: 'name', header: '管线名称' }],
  getStorageLocationColumns: () => [{ accessorKey: 'name', header: '库位名称' }],
  getEvidenceRecordColumns: () => [{ accessorKey: 'title', header: '取证标题' }],
  getFactoryMapColumns: () => [{ accessorKey: 'name', header: '地图名称' }],
  getBusinessLocationColumns: () => [{ accessorKey: 'business_name', header: '业务位置' }],
}));

const statistics = {
  device_points: 10,
  active_devices: 7,
  pipelines: 5,
  active_pipelines: 3,
  storage_locations: 4,
  evidence_records: 2,
  factory_maps: 1,
  business_locations: 6,
};

const devicePoint = {
  id: 'device-1',
  name: '锅炉温度传感器',
  device_type: 'sensor',
  latitude: 31.2,
  longitude: 121.4,
  status: 'active',
  created_at: '2026-08-11T00:00:00.000Z',
  updated_at: '2026-08-11T00:00:00.000Z',
};

describe('GisPage components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('PageHeader', () => {
    it('renders title and action buttons for non-map tabs', () => {
      renderWithProviders(
        <PageHeader
          activeTab='devicePoints'
          loading={false}
          onRefresh={vi.fn()}
          onCreate={vi.fn()}
          onImport={vi.fn()}
        />
      );

      expect(screen.getByText('厂区空间数字化')).toBeInTheDocument();
      expect(screen.getByText('导入')).toBeInTheDocument();
      expect(screen.getByText('新建')).toBeInTheDocument();
      expect(screen.getByLabelText('刷新')).toBeInTheDocument();
    });
  });

  describe('StatsSection', () => {
    it('renders six metric cards with statistics values', () => {
      renderWithProviders(<StatsSection statistics={statistics} />);

      expect(screen.getAllByTestId('metric-card')).toHaveLength(6);
      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('6')).toBeInTheDocument();
      expect(screen.getByText('启用: 7')).toBeInTheDocument();
      expect(screen.getByText('启用: 3')).toBeInTheDocument();
    });
  });

  describe('DataTableSection', () => {
    const baseProps = {
      activeTab: 'devicePoints' as const,
      loading: false,
      searchTerm: '',
      onSearchChange: vi.fn(),
      filteredData: [devicePoint],
      onDownloadTemplate: vi.fn(),
      onEdit: vi.fn(),
      onDelete: vi.fn(),
    };

    it('renders nothing for map tab', () => {
      const { container } = renderWithProviders(
        <DataTableSection
          {...baseProps}
          activeTab='map'
        />
      );

      expect(container).toBeEmptyDOMElement();
    });
  });
});
