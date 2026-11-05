import { useCallback, useMemo } from 'react';
import i18n from '@/i18n';
import { logger } from '@/utils/logger';
import type { ListPageCrudConfig } from './types';

export type ExportFormat = 'csv' | 'excel' | 'json';
export type ExportScope = 'current' | 'all' | 'selected';

export interface UseListExportOptions<T> {
  exportable?: boolean;
  exportFileName?: string;
  exportFormats?: ExportFormat[];
  exportScopes?: ExportScope[];
  exportTransform?: (row: T) => Record<string, unknown>;
  exportColumns?: string[];
  exportIncludeHeader?: boolean;
  crud?: ListPageCrudConfig<T>;
  title?: string;
  data: T[];
  visibleColumns: Array<{ id: string; label?: string }>;
  effectiveSelectedIds: Array<string | number>;
  getRowId?: (row: T) => string | number;
  exporting: boolean;
  setExporting: (value: boolean) => void;
  setExportAnchorEl: (value: HTMLElement | null) => void;
  setExportComplete: (value: boolean) => void;
}

export interface UseListExportResult {
  resolvedExportable: boolean;
  resolvedExportFileName: string;
  resolvedExportFormats: ExportFormat[];
  resolvedExportScopes: ExportScope[];
  resolvedExportColumns: string[];
  handleExport: (format?: ExportFormat, scope?: ExportScope) => Promise<void>;
}

/**
 * 导出功能：配置解析（props > crud 推断 > 默认值）与 CSV/Excel/JSON 生成下载。
 * 从 ListPageTemplate 原样抽出，保持默认值与边界分支一致。
 */
export function useListExport<T>({
  exportable,
  exportFileName,
  exportFormats,
  exportScopes,
  exportTransform,
  exportColumns,
  exportIncludeHeader,
  crud,
  title,
  data,
  visibleColumns,
  effectiveSelectedIds,
  getRowId,
  exporting,
  setExporting,
  setExportAnchorEl,
  setExportComplete,
}: UseListExportOptions<T>): UseListExportResult {
  // crud 模式下自动推断导出配置
  const resolvedExportable = useMemo(() => {
    if (exportable !== undefined) return exportable;
    if (crud?.exportable) return true;
    return false;
  }, [exportable, crud]);
  const resolvedExportFileName = useMemo(() => {
    if (exportFileName) return exportFileName;
    if (crud?.exportFileName) return crud.exportFileName;
    if (crud?.entityName) return crud.entityName;
    if (title) return title;
    return 'export';
  }, [exportFileName, crud, title]);
  const resolvedExportFormats = useMemo((): ExportFormat[] => {
    if (exportFormats?.length) return exportFormats as ExportFormat[];
    if (crud?.exportFormats?.length) return crud.exportFormats as ExportFormat[];
    return ['csv', 'json'];
  }, [exportFormats, crud]);
  const resolvedExportScopes = useMemo((): ExportScope[] => {
    if (exportScopes?.length) return exportScopes as ExportScope[];
    if (crud?.exportScopes?.length) return crud.exportScopes as ExportScope[];
    return ['current', 'all', 'selected'];
  }, [exportScopes, crud]);
  // 导出列（crud 模式下从 formFields 自动生成）
  const resolvedExportColumns = useMemo(() => {
    if (exportColumns?.length) return exportColumns;
    if (crud?.formFields) {
      return crud.formFields.filter((f) => !f.hideInExport && f.key !== 'id').map((f) => f.key);
    }
    return visibleColumns.map((c) => c.id);
  }, [exportColumns, crud, visibleColumns]);
  // 导出功能
  const handleExport = useCallback(
    async (format: ExportFormat = 'csv', scope: ExportScope = 'current') => {
      if (!resolvedExportable || exporting) return;
      try {
        setExporting(true);
        setExportAnchorEl(null);
        // 确定导出数据范围
        let exportDataRows: T[] = [];
        if (scope === 'selected') {
          exportDataRows = data.filter((row) =>
            effectiveSelectedIds.includes(
              getRowId?.(row) ?? ((row as unknown as Record<string, unknown>).id as string | number)
            )
          );
        } else if (scope === 'current') {
          exportDataRows = data;
        } else {
          exportDataRows = data;
        }
        if (exportDataRows.length === 0) {
          logger.warn(i18n.t('templates.list_page_template.k17'));
          setExporting(false);
          return;
        }
        // 获取导出列的标签和 id
        const exportColDefs = resolvedExportColumns.map((colId) => {
          const col = visibleColumns.find((c) => c.id === colId);
          let label = col?.label || colId;
          if (crud?.formFields) {
            const field = crud.formFields.find((f) => f.key === colId);
            if (field) label = field.label;
          }
          return { id: colId, label };
        });
        const headers = exportColDefs.map((c) => c.label);
        // 转换数据
        const transformedRows = exportDataRows.map((row) => {
          const transformed = exportTransform
            ? exportTransform(row)
            : (row as unknown as Record<string, unknown>);
          const result: Record<string, unknown> = {};
          exportColDefs.forEach(({ id }) => {
            let value = transformed[id];
            // crud 模式下应用 exportFormat
            if (crud?.formFields) {
              const field = crud.formFields.find((f) => f.key === id);
              if (field?.exportFormat) {
                value = field.exportFormat(value, transformed);
              }
            }
            result[id] = value;
          });
          return result;
        });
        let blob: Blob;
        let ext: string;
        if (format === 'json') {
          const jsonContent = JSON.stringify(transformedRows, null, 2);
          blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
          ext = 'json';
        } else {
          // CSV / Excel 格式
          const csvRows = transformedRows.map((row) => {
            return exportColDefs
              .map(({ id }) => {
                const value = row[id];
                if (value === null || value === undefined) return '';
                if (typeof value === 'string') {
                  return `"${value.replace(/"/g, '""')}"`;
                }
                if (typeof value === 'object') {
                  return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
                }
                return String(value);
              })
              .join(',');
          });
          const csvContent = exportIncludeHeader
            ? [headers.join(','), ...csvRows].join('\n')
            : csvRows.join('\n');
          blob = new Blob([`\uFEFF${csvContent}`], {
            type:
              format === 'excel'
                ? 'application/vnd.ms-excel;charset=utf-8;'
                : 'text/csv;charset=utf-8;',
          });
          ext = format === 'excel' ? 'xls' : 'csv';
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const timestamp = new Date().toISOString().split('T')[0];
        link.setAttribute('download', `${resolvedExportFileName}-${timestamp}.${ext}`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setExportComplete(true);
        setTimeout(() => {
          setExportComplete(false);
        }, 2000);
      } catch (error) {
        logger.error(i18n.t('components.list_page_template.k14'), error);
      } finally {
        setExporting(false);
      }
    },
    [
      resolvedExportable,
      data,
      visibleColumns,
      exportTransform,
      exporting,
      resolvedExportFileName,
      resolvedExportColumns,
      exportIncludeHeader,
      crud,
      effectiveSelectedIds,
      getRowId,
      setExporting,
      setExportAnchorEl,
      setExportComplete,
    ]
  );

  return {
    resolvedExportable,
    resolvedExportFileName,
    resolvedExportFormats,
    resolvedExportScopes,
    resolvedExportColumns,
    handleExport,
  };
}
