import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, FileText, Columns, Rows3 } from 'lucide-react';
import type { ReportData } from '@/api/report';

interface ReportViewerProps {
  report: ReportData;
  onClose: () => void;
}

const ReportViewer: React.FC<ReportViewerProps> = ({ report, onClose }) => {
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

  const getCellValue = (value: any): string => {
    if (value === undefined || value === null) return '-';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: '16px',
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
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
            padding: '24px',
            borderBottom: '1px solid border.default',
            background: 'linear-gradient(to right, primary.light, #eef2ff)',
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
              <h3 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--mui-palette-text-primary)' }}>
                {report.config.title}
              </h3>
              {report.config.description && (
                <p
                  style={{
                    fontSize: '14px',
                    color: '#475569',
                    marginTop: '4px',
                  }}
                >
                  {report.config.description}
                </p>
              )}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  marginTop: '12px',
                  fontSize: '14px',
                  color: 'grey.600',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center' }}>
                  <Rows3 sx={{ width: 16, height: 16, marginRight: '4px' }} />共 {report.row_count}{' '}
                  条记录
                </span>
                <span style={{ display: 'flex', alignItems: 'center' }}>
                  <Columns sx={{ width: 16, height: 16, marginRight: '4px' }} />
                  {report.config.columns.length} 列
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                padding: '8px',
                color: '#94a3b8',
                borderRadius: '8px',
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
        <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
          <div
            style={{
              overflowX: 'auto',
              border: '1px solid border.default',
              borderRadius: '8px',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ backgroundColor: 'var(--mui-palette-grey-50)' }}>
                <tr>
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontSize: '12px',
                      fontWeight: 500,
                      color: 'grey.600',
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
                        padding: '12px 16px',
                        textAlign: 'left',
                        fontSize: '12px',
                        fontWeight: 500,
                        color: 'grey.600',
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
                          gap: '4px',
                        }}
                      >
                        <span>{column}</span>
                        {sortColumn === column && (
                          <span style={{ color: 'primary.dark' }}>
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody style={{ backgroundColor: 'white' }}>
                {currentData.length === 0 ? (
                  <tr>
                    <td
                      colSpan={report.config.columns.length + 1}
                      style={{ padding: '48px 16px', textAlign: 'center' }}
                    >
                      <FileText
                        sx={{
                          width: 48,
                          height: 48,
                          color: 'grey.400',
                          margin: 'auto',
                          marginBottom: '12px',
                        }}
                      />
                      <p style={{ color: '#94a3b8' }}>暂无数据</p>
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
                          padding: '12px 16px',
                          fontSize: '14px',
                          color: 'grey.600',
                        }}
                      >
                        {startIndex + idx + 1}
                      </td>
                      {report.config.columns.map((column) => (
                        <td
                          key={column}
                          style={{
                            padding: '12px 16px',
                            fontSize: '14px',
                            color: 'text.primary',
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
            padding: '16px',
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px', color: '#475569' }}>每页显示</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                style={{
                  padding: '4px 8px',
                  border: '1px solid border.default',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span style={{ fontSize: '14px', color: '#475569' }}>条</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px', color: '#475569' }}>
                显示 {startIndex + 1}-{Math.min(endIndex, report.row_count)} 共 {report.row_count}
              </span>
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                style={{
                  padding: '8px',
                  color: '#475569',
                  borderRadius: '6px',
                  border: 'none',
                  background: 'transparent',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  opacity: currentPage === 1 ? 0.5 : 1,
                }}
              >
                <ChevronLeft sx={{ width: 16, height: 16 }} />
              </button>
              <span style={{ fontSize: '14px', color: '#475569' }}>
                第 {currentPage}/{totalPages} 页
              </span>
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                style={{
                  padding: '8px',
                  color: '#475569',
                  borderRadius: '6px',
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
