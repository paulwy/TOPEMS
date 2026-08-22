import React, { useState } from 'react';
import { useTheme } from '@mui/material';
import { X, ChevronLeft, ChevronRight, FileText, Columns, Rows3 } from 'lucide-react';
import type { ReportData } from '@/api/report';
import { designTokens, semanticTokens } from '@topems/tokens';
import i18n from '@/i18n';

interface ReportViewerProps {
  report: ReportData;
  onClose: () => void;
}

const ReportViewer: React.FC<ReportViewerProps> = ({ report, onClose }) => {
  const theme = useTheme();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const sortedData = [...report.data].sort((a, b) => {
    if (!sortColumn) return 0;
    const aVal = a[sortColumn];
    const bVal = b[sortColumn];

    if (aVal === undefined || aVal === null) return 1;
    if (bVal === undefined || bVal === null) return -1;

    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    }

    const aStr = String(aVal);
    const bStr = String(bVal);
    return sortDirection === 'asc'
      ? aStr.localeCompare(bStr, 'zh-CN')
      : bStr.localeCompare(aStr, 'zh-CN');
  });

  const totalPages = Math.ceil(sortedData.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentData = sortedData.slice(startIndex, endIndex);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getCellValue = (value: unknown): string => {
    if (value === undefined || value === null) return '-';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'action.active',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: 4,
      }}
    >
      <div
        style={{
          backgroundColor: 'common.white',
          borderRadius: 'lg',
          boxShadow: designTokens.shadows.xl,
          width: '100%',
          maxWidth: '1024px',
          maxHeight: '95vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: 6,
            borderBottom: '1px solid border.default',
            background: `linear-gradient(to right, primary.light, ${designTokens.colors.secondary[50]})`,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
            }}
          >
            <div>
              <h3
                style={{
                  fontSize: '20px',
                  fontWeight: 600,
                  color: 'var(--mui-palette-text-primary)',
                }}
              >
                {report.config.title}
              </h3>
              {report.config.description && (
                <p
                  style={{
                    fontSize: '14px',
                    color: 'grey.600',
                    marginTop: 1,
                  }}
                >
                  {report.config.description}
                </p>
              )}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  marginTop: 3,
                  fontSize: '14px',
                  color: theme.palette.grey[600],
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center' }}>
                  <Rows3 sx={{ width: 16, height: 16, marginRight: 0.5 }} />
                  {i18n.t('components:report_viewer.k3', {
                    v0: report.row_count,
                    v1: ' ',
                    v2: i18n.t('components.report_viewer.k0'),
                  })}
                </span>
                <span style={{ display: 'flex', alignItems: 'center' }}>
                  <Columns sx={{ width: 16, height: 16, marginRight: 0.5 }} />
                  {i18n.t('components:report_viewer.k2', { v0: report.config.columns.length })}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                padding: 2,
                color: 'grey.400',
                borderRadius: 'md',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <X sx={{ width: 20, height: 20 }} />
            </button>
          </div>
        </div>

        {/* Table */}
        <div style={{ flex: 1, overflow: 'auto', padding: 6 }}>
          <div
            style={{
              overflowX: 'auto',
              border: '1px solid border.default',
              borderRadius: 'md',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ backgroundColor: 'var(--mui-palette-grey-50)' }}>
                <tr>
                  <th
                    style={{
                      padding: `${designTokens.spacing.md} ${designTokens.spacing.md}px`,
                      textAlign: 'left',
                      fontSize: '12px',
                      fontWeight: 500,
                      color: theme.palette.grey[600],
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    #
                  </th>
                  {report.config.columns.map((column) => (
                    <th
                      key={column}
                      onClick={() => handleSort(column)}
                      style={{
                        padding: `${designTokens.spacing.md} ${designTokens.spacing.md}px`,
                        textAlign: 'left',
                        fontSize: '12px',
                        fontWeight: 500,
                        color: theme.palette.grey[600],
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                        }}
                      >
                        <span>{column}</span>
                        {sortColumn === column && (
                          <span style={{ color: theme.palette.primary.dark }}>
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody style={{ backgroundColor: 'common.white' }}>
                {currentData.length === 0 ? (
                  <tr>
                    <td
                      colSpan={report.config.columns.length + 1}
                      style={{
                        padding: `${designTokens.spacing['2xl']} 16px`,
                        textAlign: 'center',
                      }}
                    >
                      <FileText
                        sx={{
                          width: 48,
                          height: 48,
                          color: 'grey.400',
                          margin: 'auto',
                          marginBottom: 1.5,
                        }}
                      />
                      <p style={{ color: 'text.muted' }}>{i18n.t('components.report_viewer.k0')}</p>
                    </td>
                  </tr>
                ) : (
                  currentData.map((row, idx) => (
                    <tr
                      key={idx}
                      style={{ transition: 'background-color 0.2s' }}
                    >
                      <td
                        style={{
                          padding: `${designTokens.spacing.md} ${designTokens.spacing.md}px`,
                          fontSize: '14px',
                          color: theme.palette.grey[600],
                        }}
                      >
                        {startIndex + idx + 1}
                      </td>
                      {report.config.columns.map((column) => (
                        <td
                          key={column}
                          style={{
                            padding: `${designTokens.spacing.md} ${designTokens.spacing.md}px`,
                            fontSize: '14px',
                            color: theme.palette.text.primary,
                          }}
                        >
                          {getCellValue(row[column])}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        <div
          style={{
            padding: 4,
            borderTop: '1px solid border.default',
            backgroundColor: 'var(--mui-palette-grey-50)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <span style={{ fontSize: '14px', color: 'grey.600' }}>
                {i18n.t('components.report_viewer.k1')}
              </span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                style={{
                  padding: `${designTokens.spacing.xs} ${designTokens.spacing.sm}px`,
                  border: '1px solid border.default',
                  borderRadius: 'sm',
                  fontSize: '14px',
                }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span style={{ fontSize: '14px', color: 'grey.600' }}>
                {i18n.t('components.report_viewer.k1')}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <span style={{ fontSize: '14px', color: 'grey.600' }}>
                {i18n.t('components:report_viewer.k1', {
                  v0: startIndex + 1,
                  v1: Math.min(endIndex, report.row_count),
                  v2: report.row_count,
                })}
              </span>
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                style={{
                  padding: 2,
                  color: 'grey.600',
                  borderRadius: 'sm',
                  border: 'none',
                  background: 'transparent',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  opacity: currentPage === 1 ? 0.5 : 1,
                }}
              >
                <ChevronLeft sx={{ width: 16, height: 16 }} />
              </button>
              <span style={{ fontSize: '14px', color: 'grey.600' }}>
                {i18n.t('components:report_viewer.k0', { v0: currentPage, v1: totalPages })}
              </span>
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                style={{
                  padding: 2,
                  color: 'grey.600',
                  borderRadius: 'sm',
                  border: 'none',
                  background: 'transparent',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  opacity: currentPage === totalPages ? 0.5 : 1,
                }}
              >
                <ChevronRight sx={{ width: 16, height: 16 }} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportViewer;
