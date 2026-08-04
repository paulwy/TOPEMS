import React from 'react';
import { FileSpreadsheet, File, FileText } from 'lucide-react';
import type { ReportTypeInfo } from '@/api/report';

export const getModuleColor = (module: string) => {
  const colors: Record<string, 'warning' | 'info' | 'success' | 'error' | 'secondary'> = {
    RS: 'warning',
    LIMS: 'info',
    QMS: 'success',
    EHS: 'error',
    SRM: 'secondary',
    PDM: 'info',
  };
  return colors[module] || 'default';
};

export const getFormatIcon = (format: string) => {
  switch (format) {
    case 'excel':
      return <FileSpreadsheet sx={{ width: 16, height: 16 }} />;
    case 'pdf':
      return <File sx={{ width: 16, height: 16 }} />;
    case 'csv':
      return <FileText sx={{ width: 16, height: 16 }} />;
    default:
      return <FileText sx={{ width: 16, height: 16 }} />;
  }
};

export const getModuleFromReportType = (
  reportType: string,
  reportTypes: ReportTypeInfo[]
): string => {
  const type = reportTypes.find((t) => t.type === reportType);
  return type?.module || 'RS';
};

export const getReportTypeName = (reportType: string, reportTypes: ReportTypeInfo[]): string => {
  const type = reportTypes.find((t) => t.type === reportType);
  return type?.name || reportType;
};
