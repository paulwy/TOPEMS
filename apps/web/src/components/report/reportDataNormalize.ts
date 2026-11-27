import type { ExportFormat, ReportData, ReportType } from '@/api/report';

/**
 * 报表列表行归一化（2026-11-27）
 *
 * 事故：GET /api/bi/reports 返回的是扁平行
 * `{ id, name, description, report_type, status, template_id, created_by, created_at }`，
 * 没有前端 `ReportData` 期望的 `config` 包装。ReportPage 的过滤直接读
 * `r.config.title` → TypeError，整页落到错误边界（/report/report 白屏）。
 *
 * 这里统一把后端行（或已经是标准结构的行）转成 ReportData，缺字段给安全默认值，
 * 保证列表渲染（title / format / columns）不再依赖后端是否带 config。
 */

const EXPORT_FORMATS: ExportFormat[] = ['excel', 'pdf', 'csv'];
const DEFAULT_REPORT_TYPE: ReportType = 'rs_project_progress';
const DEFAULT_FORMAT: ExportFormat = 'pdf';

const asString = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);

const asFormat = (v: unknown): ExportFormat =>
  EXPORT_FORMATS.includes(v as ExportFormat) ? (v as ExportFormat) : DEFAULT_FORMAT;

const asColumns = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((c): c is string => typeof c === 'string') : [];

const asObject = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};

export function normalizeReportRow(raw: unknown): ReportData {
  const row = asObject(raw);
  const existingConfig = asObject(row.config);

  const config = {
    // 后端扁平行没有 title，用 name 兜底；再退化到 id
    title:
      asString(existingConfig.title) || asString(row.name) || asString(row.title) || asString(row.id),
    report_type: (asString(existingConfig.report_type) ||
      asString(row.report_type) ||
      DEFAULT_REPORT_TYPE) as ReportType,
    format: asFormat(existingConfig.format ?? row.format),
    description: asString(existingConfig.description) || asString(row.description) || undefined,
    columns: asColumns(existingConfig.columns ?? row.columns),
  };

  return {
    id: asString(row.id),
    config,
    template: row.template as ReportData['template'],
    data: Array.isArray(row.data) ? (row.data as Record<string, unknown>[]) : [],
    row_count: typeof row.row_count === 'number' ? row.row_count : 0,
    created_at: asString(row.created_at),
  };
}

export function normalizeReportRows(rows: unknown): ReportData[] {
  if (!Array.isArray(rows)) return [];
  return rows.map(normalizeReportRow);
}
