import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderWithProviders, screen, fireEvent } from '@/__tests__/test-utils';

import EhsHazardControlsSection from '../EhsHazardControlsSection';
import EhsHazardAssessmentsSection from '../EhsHazardAssessmentsSection';
import EhsHazardBasicInfoSection from '../EhsHazardBasicInfoSection';
import EhsHazardControlDialog from '../EhsHazardControlDialog';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { count?: number }) =>
      typeof options?.count === 'number' ? `${key}:${options.count}` : key,
  }),
}));

vi.mock('@/components/ehs', async () => {
  const React = await import('react');
  return {
    EHSStatusBadge: ({ status }: { status: string }) =>
      React.createElement('span', { 'data-testid': `status-${status}` }, status),
    EHSMeasureTypeBadge: ({ type }: { type: string }) =>
      React.createElement('span', { 'data-testid': `measure-${type}` }, type),
    calculateRiskLevel: (severity: string, likelihood: string) => {
      const scoreMap: Record<string, number> = { low: 1, medium: 3, high: 6 };
      const score = Math.max(scoreMap[severity] ?? 3, scoreMap[likelihood] ?? 3);
      return {
        score,
        level: score >= 6 ? 'high' : score >= 3 ? 'medium' : 'low',
        color: 'warning.main',
        bgColor: 'warning.lighter',
      };
    },
  };
});

vi.mock('@/components/common/DataTable', async () => {
  const React = await import('react');
  return {
    DataTable: ({ columns, data }: { columns: any[]; data: any[] }) =>
      React.createElement(
        'table',
        { 'data-testid': 'mock-data-table' },
        React.createElement(
          'thead',
          null,
          React.createElement(
            'tr',
            null,
            columns.map((column) =>
              React.createElement('th', { key: column.id ?? column.accessorKey }, column.header)
            )
          )
        ),
        React.createElement(
          'tbody',
          null,
          data.map((row, rowIndex) =>
            React.createElement(
              'tr',
              { key: row.id ?? rowIndex },
              columns.map((column) => {
                const key = column.id ?? column.accessorKey;
                const value = column.cell
                  ? column.cell({ row: { original: row } })
                  : row[column.accessorKey];
                return React.createElement('td', { key }, value);
              })
            )
          )
        )
      ),
  };
});

const control = {
  id: 'control-1',
  measure_type: 'engineering',
  description: '安装联锁防护装置',
  responsible: '张三',
  deadline: '2026-08-15T00:00:00.000Z',
  status: 'pending',
};

const assessment = {
  id: 'assessment-1',
  assessment_date: '2026-08-10T00:00:00.000Z',
  assessor: '李四',
  severity: 'high',
  likelihood: 'medium',
  recommendations: '增加巡检频次',
};

const hazard = {
  id: 'hazard-1',
  name: '高温蒸汽泄漏',
  category: '设备设施',
  location: '锅炉房',
  severity: 'high',
  exposure: 'medium',
  likelihood: 'low',
  description: '蒸汽管道接口存在泄漏风险',
  status: 'open',
};

const formData = {
  measure_type: 'engineering' as const,
  description: '增加防护罩',
  responsible: '王五',
  deadline: '2026-08-20',
};

describe('EhsHazard components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('EhsHazardControlsSection', () => {
    it('renders empty state and add button', () => {
      const onAddControl = vi.fn();
      renderWithProviders(
        <EhsHazardControlsSection
          controls={[]}
          onAddControl={onAddControl}
          onDeleteControl={vi.fn()}
        />
      );

      expect(screen.getByText('ehs.ehshazarddetailpage.text_2e8dbb')).toBeInTheDocument();
      expect(screen.getByText('ehs.ehs_hazard_detail_page.total_measures:0')).toBeInTheDocument();
      expect(screen.getByText('ehs.ehshazarddetailpage.text_b64d8b')).toBeInTheDocument();

      fireEvent.click(screen.getByText('ehs.ehshazarddetailpage.text_676fd4'));
      expect(onAddControl).toHaveBeenCalledTimes(1);
    });
  });

  describe('EhsHazardAssessmentsSection', () => {
    it('renders empty assessments state', () => {
      renderWithProviders(<EhsHazardAssessmentsSection assessments={[]} />);

      expect(screen.getByText('ehs.ehshazarddetailpage.text_48752c')).toBeInTheDocument();
      expect(screen.getByText('ehs.ehs_hazard_detail_page.total_records:0')).toBeInTheDocument();
      expect(screen.getByText('ehs.ehshazarddetailpage.text_df834d')).toBeInTheDocument();
    });
  });

  describe('EhsHazardBasicInfoSection', () => {
    it('renders hazard basic fields and risk tiles', () => {
      renderWithProviders(<EhsHazardBasicInfoSection hazard={hazard as any} />);

      expect(screen.getAllByText('ehs.ehshazarddetailpage.text_47ba19').length).toBeGreaterThan(0);
      expect(screen.getByText('设备设施')).toBeInTheDocument();
      expect(screen.getByText('锅炉房')).toBeInTheDocument();
      expect(screen.getByText('蒸汽管道接口存在泄漏风险')).toBeInTheDocument();
      expect(screen.getByText('ehs.ehs_hazard_detail_page.high_risk')).toBeInTheDocument();
      expect(screen.getByText('ehs.ehs_hazard_detail_page.text_4296d7')).toBeInTheDocument();
      expect(screen.getByText('ehs.ehs_hazard_detail_page.text_aed1df')).toBeInTheDocument();
      expect(screen.getByText('ehs.ehs_hazard_detail_page.text_19ac67')).toBeInTheDocument();
    });
  });

  describe('EhsHazardControlDialog', () => {
    it('renders nothing when closed', () => {
      renderWithProviders(
        <EhsHazardControlDialog
          open={false}
          controlFormData={formData}
          setControlFormData={vi.fn()}
          onClose={vi.fn()}
          onSave={vi.fn()}
        />
      );

      expect(screen.queryByText('ehs.ehshazarddetailpage.text_676fd4')).not.toBeInTheDocument();
    });
  });
});
