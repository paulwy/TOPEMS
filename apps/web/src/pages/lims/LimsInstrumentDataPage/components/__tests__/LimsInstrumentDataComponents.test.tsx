import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderWithProviders, screen, fireEvent } from '@/__tests__/test-utils';

const i18nMap = vi.hoisted(() => ({
  'pages.toolbar.k0': '搜索...',
  'pages.toolbar.k1': '刷新',
  'pages.toolbar.k2': '新增数据',
  'pages.toolbar.k3': '刷新',
  'pages.toolbar.k4': '新建任务',
  'pages.toolbar.k5': '解析测试',
  'pages.toolbar.k6': '刷新',
  'pages.toolbar.k7': '新建规则',
  'pages.toolbar.k8': '启用',
  'pages.toolbar.k9': '禁用',
  'pages.instrument_data_table.k0': '暂无数据',
  'pages.collection_task_table.k0': '暂无采集任务',
  'pages.parse_rule_table.k0': '暂无解析规则',
  'pages.utils.k0': '待解析',
  'pages.utils.k1': '成功',
  'pages.utils.k2': '失败',
  'pages.utils.k3': '运行中',
  'pages.utils.k4': '已停止',
  'pages.utils.k5': '启用',
  'pages.utils.k6': '禁用',
  'pages.utils.k7': '手动触发',
  'pages.utils.k8': '定时采集',
  'pages.utils.k9': '间隔采集',
  'lims.statistics_cards.k0': '数据总条数',
  'lims.statistics_cards.k1': '今日采集',
  'lims.statistics_cards.k2': '采集任务',
  'lims.statistics_cards.k3': '解析规则',
  'lims.instrument_data_table.k0': '数据编号',
  'lims.instrument_data_table.k1': '仪器',
  'lims.instrument_data_table.k2': '批次号',
  'lims.instrument_data_table.k3': '协议',
  'lims.instrument_data_table.k4': '状态',
  'lims.instrument_data_table.k5': '质量分',
  'lims.instrument_data_table.k6': '采集时间',
  'lims.instrument_data_table.k7': '操作',
  'lims.instrument_data_table.k8': '查看详情',
  'lims.instrument_data_table.k9': '查看',
  'lims.instrument_data_table.k10': '重新解析',
  'lims.instrument_data_table.k11': '刷新',
  'lims.instrument_data_table.k12': '删除',
  'lims.instrument_data_table.k13': '删除',
  'lims.collection_task_table.k0': '任务编号',
  'lims.collection_task_table.k1': '任务名称',
  'lims.collection_task_table.k2': '仪器',
  'lims.collection_task_table.k3': '协议',
  'lims.collection_task_table.k4': '采集方式',
  'lims.collection_task_table.k5': '状态',
  'lims.collection_task_table.k6': '上次运行',
  'lims.collection_task_table.k7': '操作',
  'lims.collection_task_table.k8': '立即采集',
  'lims.collection_task_table.k9': '执行',
  'lims.collection_task_table.k10': '编辑',
  'lims.collection_task_table.k11': '编辑',
  'lims.collection_task_table.k12': '删除',
  'lims.collection_task_table.k13': '删除',
  'lims.parse_rule_table.k0': '规则编号',
  'lims.parse_rule_table.k1': '规则名称',
  'lims.parse_rule_table.k2': '协议',
  'lims.parse_rule_table.k3': '仪器类型',
  'lims.parse_rule_table.k4': '版本',
  'lims.parse_rule_table.k5': '状态',
  'lims.parse_rule_table.k6': '创建时间',
  'lims.parse_rule_table.k7': '操作',
  'lims.parse_rule_table.k8': '编辑',
  'lims.parse_rule_table.k9': '编辑',
  'lims.parse_rule_table.k10': '删除',
  'lims.parse_rule_table.k11': '删除',
} as Record<string, string>));

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

import StatisticsCards from '../StatisticsCards';
import Toolbar from '../Toolbar';
import InstrumentDataTable from '../InstrumentDataTable';
import CollectionTaskTable from '../CollectionTaskTable';
import ParseRuleTable from '../ParseRuleTable';

const statistics = {
  total_data_count: 128,
  today_count: 12,
  total_tasks: 6,
  total_rules: 4,
};

const toolbarHandlers = {
  onSearchChange: vi.fn(),
  onStatusFilterChange: vi.fn(),
  onRefetchData: vi.fn(),
  onRefetchTasks: vi.fn(),
  onRefetchRules: vi.fn(),
  onCreateData: vi.fn(),
  onCreateTask: vi.fn(),
  onCreateRule: vi.fn(),
  onShowParseTest: vi.fn(),
};

const tableHandlers = {
  onPageChange: vi.fn(),
  onRowsPerPageChange: vi.fn(),
  onViewDetail: vi.fn(),
  onParse: vi.fn(),
  onDelete: vi.fn(),
};

const taskHandlers = {
  onPageChange: vi.fn(),
  onRowsPerPageChange: vi.fn(),
  onTrigger: vi.fn(),
  onEdit: vi.fn(),
  onDelete: vi.fn(),
};

const ruleHandlers = {
  onPageChange: vi.fn(),
  onRowsPerPageChange: vi.fn(),
  onEdit: vi.fn(),
  onDelete: vi.fn(),
};

const dataItem = {
  id: 'data-1',
  data_no: 'DAT-001',
  instrument_name: '高效液相色谱仪',
  batch_no: 'BATCH-2026',
  protocol: 'TCP',
  status: 'pending',
  quality_score: 98,
  collected_at: '2026-08-11 10:00',
};

const taskItem = {
  id: 'task-1',
  task_no: 'TASK-001',
  task_name: '自动采集任务',
  instrument_name: '气相色谱仪',
  protocol: 'MODBUS',
  collection_mode: 'scheduled',
  status: 'active',
  last_run_at: '2026-08-11 09:00',
};

const ruleItem = {
  id: 'rule-1',
  rule_no: 'RULE-001',
  rule_name: '色谱数据解析规则',
  protocol: 'TCP',
  instrument_type: '色谱仪',
  version: 3,
  status: 'inactive',
  created_at: '2026-08-10 18:00',
};

describe('LimsInstrumentData components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('StatisticsCards', () => {
    it('renders all statistic labels', () => {
      renderWithProviders(<StatisticsCards statistics={statistics} />);

      expect(screen.getByText('数据总条数')).toBeInTheDocument();
      expect(screen.getByText('今日采集')).toBeInTheDocument();
      expect(screen.getByText('采集任务')).toBeInTheDocument();
      expect(screen.getByText('解析规则')).toBeInTheDocument();
    });

    it('renders statistic values', () => {
      renderWithProviders(<StatisticsCards statistics={statistics} />);

      expect(screen.getByText('128')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
      expect(screen.getByText('6')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument();
    });
  });

  describe('Toolbar', () => {
    it('updates the search keyword', () => {
      renderWithProviders(
        <Toolbar
          activeTab={0}
          searchKeyword=''
          statusFilter=''
          {...toolbarHandlers}
        />
      );

      fireEvent.change(screen.getByPlaceholderText('搜索...'), {
        target: { value: 'DAT-001' },
      });

      expect(toolbarHandlers.onSearchChange).toHaveBeenCalledWith('DAT-001');
    });

    it('shows data actions on the data tab', () => {
      renderWithProviders(
        <Toolbar
          activeTab={0}
          searchKeyword=''
          statusFilter=''
          {...toolbarHandlers}
        />
      );

      fireEvent.click(screen.getAllByRole('button', { name: '刷新' })[0]);
      fireEvent.click(screen.getByRole('button', { name: '新增数据' }));

      expect(toolbarHandlers.onRefetchData).toHaveBeenCalledTimes(1);
      expect(toolbarHandlers.onCreateData).toHaveBeenCalledTimes(1);
    });

    it('shows task actions on the task tab', () => {
      renderWithProviders(
        <Toolbar
          activeTab={1}
          searchKeyword=''
          statusFilter=''
          {...toolbarHandlers}
        />
      );

      fireEvent.click(screen.getAllByRole('button', { name: '刷新' })[0]);
      fireEvent.click(screen.getByRole('button', { name: '新建任务' }));

      expect(toolbarHandlers.onRefetchTasks).toHaveBeenCalledTimes(1);
      expect(toolbarHandlers.onCreateTask).toHaveBeenCalledTimes(1);
    });

    it('shows parse test and rule actions on the rule tab', () => {
      renderWithProviders(
        <Toolbar
          activeTab={2}
          searchKeyword=''
          statusFilter=''
          {...toolbarHandlers}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: '解析测试' }));
      fireEvent.click(screen.getAllByRole('button', { name: '刷新' })[0]);
      fireEvent.click(screen.getByRole('button', { name: '新建规则' }));

      expect(toolbarHandlers.onShowParseTest).toHaveBeenCalledTimes(1);
      expect(toolbarHandlers.onRefetchRules).toHaveBeenCalledTimes(1);
      expect(toolbarHandlers.onCreateRule).toHaveBeenCalledTimes(1);
    });
  });

  describe('InstrumentDataTable', () => {
    it('renders loading state', () => {
      const { container } = renderWithProviders(
        <InstrumentDataTable
          loading
          dataList={[]}
          totalCount={0}
          page={0}
          rowsPerPage={10}
          {...tableHandlers}
        />
      );

      expect(container.querySelector('.MuiLinearProgress-root')).toBeInTheDocument();
    });

    it('renders an empty state', () => {
      renderWithProviders(
        <InstrumentDataTable
          loading={false}
          dataList={[]}
          totalCount={0}
          page={0}
          rowsPerPage={10}
          {...tableHandlers}
        />
      );

      expect(screen.getByText('暂无数据')).toBeInTheDocument();
    });

    it('renders instrument data rows', () => {
      renderWithProviders(
        <InstrumentDataTable
          loading={false}
          dataList={[dataItem]}
          totalCount={1}
          page={0}
          rowsPerPage={10}
          {...tableHandlers}
        />
      );

      expect(screen.getByText('DAT-001')).toBeInTheDocument();
      expect(screen.getByText('高效液相色谱仪')).toBeInTheDocument();
      expect(screen.getByText('BATCH-2026')).toBeInTheDocument();
      expect(screen.getByText('TCP')).toBeInTheDocument();
      expect(screen.getByText('待解析')).toBeInTheDocument();
      expect(screen.getByText('98%')).toBeInTheDocument();
    });

    it('calls row action handlers', () => {
      renderWithProviders(
        <InstrumentDataTable
          loading={false}
          dataList={[dataItem]}
          totalCount={1}
          page={0}
          rowsPerPage={10}
          {...tableHandlers}
        />
      );

      fireEvent.click(screen.getByLabelText('查看'));
      fireEvent.click(screen.getByLabelText('刷新'));
      fireEvent.click(screen.getByLabelText('删除'));

      expect(tableHandlers.onViewDetail).toHaveBeenCalledWith(dataItem);
      expect(tableHandlers.onParse).toHaveBeenCalledWith('data-1');
      expect(tableHandlers.onDelete).toHaveBeenCalledWith('data-1');
    });

    it('hides parse action for successful data', () => {
      renderWithProviders(
        <InstrumentDataTable
          loading={false}
          dataList={[{ ...dataItem, status: 'success' }]}
          totalCount={1}
          page={0}
          rowsPerPage={10}
          {...tableHandlers}
        />
      );

      expect(screen.queryByLabelText('刷新')).not.toBeInTheDocument();
      expect(screen.getByText('成功')).toBeInTheDocument();
    });
  });

  describe('CollectionTaskTable', () => {
    it('renders loading state', () => {
      const { container } = renderWithProviders(
        <CollectionTaskTable
          loading
          tasks={[]}
          totalCount={0}
          page={0}
          rowsPerPage={10}
          {...taskHandlers}
        />
      );

      expect(container.querySelector('.MuiLinearProgress-root')).toBeInTheDocument();
    });

    it('renders empty task state', () => {
      renderWithProviders(
        <CollectionTaskTable
          loading={false}
          tasks={[]}
          totalCount={0}
          page={0}
          rowsPerPage={10}
          {...taskHandlers}
        />
      );

      expect(screen.getByText('暂无采集任务')).toBeInTheDocument();
    });

    it('renders collection task rows', () => {
      renderWithProviders(
        <CollectionTaskTable
          loading={false}
          tasks={[taskItem]}
          totalCount={1}
          page={0}
          rowsPerPage={10}
          {...taskHandlers}
        />
      );

      expect(screen.getByText('TASK-001')).toBeInTheDocument();
      expect(screen.getByText('自动采集任务')).toBeInTheDocument();
      expect(screen.getByText('气相色谱仪')).toBeInTheDocument();
      expect(screen.getByText('MODBUS')).toBeInTheDocument();
      expect(screen.getByText('定时采集')).toBeInTheDocument();
      expect(screen.getByText('启用')).toBeInTheDocument();
    });

    it('calls collection task action handlers', () => {
      renderWithProviders(
        <CollectionTaskTable
          loading={false}
          tasks={[taskItem]}
          totalCount={1}
          page={0}
          rowsPerPage={10}
          {...taskHandlers}
        />
      );

      fireEvent.click(screen.getByLabelText('执行'));
      fireEvent.click(screen.getByLabelText('编辑'));
      fireEvent.click(screen.getByLabelText('删除'));

      expect(taskHandlers.onTrigger).toHaveBeenCalledWith('task-1');
      expect(taskHandlers.onEdit).toHaveBeenCalledWith(taskItem);
      expect(taskHandlers.onDelete).toHaveBeenCalledWith('task-1');
    });
  });

  describe('ParseRuleTable', () => {
    it('renders loading state', () => {
      const { container } = renderWithProviders(
        <ParseRuleTable
          loading
          rules={[]}
          totalCount={0}
          page={0}
          rowsPerPage={10}
          {...ruleHandlers}
        />
      );

      expect(container.querySelector('.MuiLinearProgress-root')).toBeInTheDocument();
    });

    it('renders empty rule state', () => {
      renderWithProviders(
        <ParseRuleTable
          loading={false}
          rules={[]}
          totalCount={0}
          page={0}
          rowsPerPage={10}
          {...ruleHandlers}
        />
      );

      expect(screen.getByText('暂无解析规则')).toBeInTheDocument();
    });

    it('renders parse rule rows', () => {
      renderWithProviders(
        <ParseRuleTable
          loading={false}
          rules={[ruleItem]}
          totalCount={1}
          page={0}
          rowsPerPage={10}
          {...ruleHandlers}
        />
      );

      expect(screen.getByText('RULE-001')).toBeInTheDocument();
      expect(screen.getByText('色谱数据解析规则')).toBeInTheDocument();
      expect(screen.getByText('TCP')).toBeInTheDocument();
      expect(screen.getByText('色谱仪')).toBeInTheDocument();
      expect(screen.getByText('v3')).toBeInTheDocument();
      expect(screen.getByText('禁用')).toBeInTheDocument();
    });

    it('calls parse rule action handlers', () => {
      renderWithProviders(
        <ParseRuleTable
          loading={false}
          rules={[ruleItem]}
          totalCount={1}
          page={0}
          rowsPerPage={10}
          {...ruleHandlers}
        />
      );

      fireEvent.click(screen.getByLabelText('编辑'));
      fireEvent.click(screen.getByLabelText('删除'));

      expect(ruleHandlers.onEdit).toHaveBeenCalledWith(ruleItem);
      expect(ruleHandlers.onDelete).toHaveBeenCalledWith('rule-1');
    });
  });
});
