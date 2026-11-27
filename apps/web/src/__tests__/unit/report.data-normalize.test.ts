import { describe, it, expect } from 'vitest';
import {
  normalizeReportRow,
  normalizeReportRows,
} from '../../components/report/reportDataNormalize';

/**
 * 报表列表归一化回归护栏（2026-11-27）
 * 事故：后端返回扁平行（无 config），页面读 r.config.title 抛 TypeError → 错误边界。
 */
describe('reportDataNormalize', () => {
  const backendRow = {
    id: '00000000-0000-0000-0000-000000000099',
    name: 'Smoke Report',
    description: null,
    report_type: 'summary',
    status: 'active',
    template_id: null,
    created_by: null,
    created_at: '2026-10-26T06:03:19.745368Z',
  };

  it('扁平行也能补出 config.title（取 name）与默认 format/columns', () => {
    const row = normalizeReportRow(backendRow);
    expect(row.id).toBe(backendRow.id);
    expect(row.config.title).toBe('Smoke Report');
    expect(row.config.format).toBe('pdf');
    expect(row.config.columns).toEqual([]);
    expect(row.created_at).toBe(backendRow.created_at);
  });

  it('保留后端原始 report_type，未知类型不抛错', () => {
    const row = normalizeReportRow(backendRow);
    expect(row.config.report_type).toBe('summary');
  });

  it('已是标准 ReportData 的行原样保留 config', () => {
    const row = normalizeReportRow({
      id: 'x',
      config: { title: 'T', report_type: 'qms_quality_analysis', format: 'excel', columns: ['a'] },
      data: [{ a: 1 }],
      row_count: 1,
    });
    expect(row.config.title).toBe('T');
    expect(row.config.format).toBe('excel');
    expect(row.config.columns).toEqual(['a']);
    expect(row.row_count).toBe(1);
  });

  it('异常输入不抛错', () => {
    expect(() => normalizeReportRow(null)).not.toThrow();
    expect(normalizeReportRows(undefined)).toEqual([]);
    expect(normalizeReportRows('not-an-array')).toEqual([]);
    expect(normalizeReportRow({}).config.title).toBe('');
  });
});
