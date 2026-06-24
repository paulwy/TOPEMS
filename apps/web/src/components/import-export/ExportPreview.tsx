import React from 'react';
import { FileText, Download, X } from 'lucide-react';

export interface ExportPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  onDownload: () => void;
  data: any[];
  columns: string[];
  format: string;
  fileName?: string;
  title?: string;
}

export const ExportPreview: React.FC<ExportPreviewProps> = ({
  isOpen,
  onClose,
  onDownload,
  data,
  columns,
  format,
  fileName,
  title = '导出预览',
}) => {
  if (!isOpen) return null;

  const previewData = data.slice(0, 10);
  const getColumnLabel = (col: string) => {
    return col.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
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
        padding: 16,
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: 12,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          width: '100%',
          maxWidth: 896,
          maxHeight: '90vh',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: 24,
            borderBottom: '1px solid border.default',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h3
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: 'grey.900',
              margin: 0,
            }}
          >
            {title}
          </h3>
          <button
            onClick={onClose}
            style={{ color: '#94a3b8' }}
          >
            <X style={{ width: 20, height: 20 }} />
          </button>
        </div>

        <div
          style={{
            padding: 24,
            maxHeight: 'calc(90vh - 180px)',
            overflow: 'auto',
          }}
        >
          <div
            style={{
              backgroundColor: 'success.light',
              border: '1px solid #bbf7d0',
              borderRadius: 8,
              padding: 16,
              marginBottom: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
              <FileText
                style={{
                  width: 20,
                  height: 20,
                  color: 'success.dark',
                  marginRight: 8,
                }}
              />
              <span style={{ fontWeight: 500, color: '#166534' }}>
                {fileName || `export.${format}`}
              </span>
            </div>
            <p style={{ fontSize: 14, color: '#15803d', margin: 0 }}>
              共 {data.length} 条数据，{columns.length} 列
            </p>
          </div>

          <div
            style={{
              border: '1px solid border.default',
              borderRadius: 8,
              overflow: 'hidden',
            }}
          >
            <div style={{ overflowX: 'auto' }}>
              <table style={{ minWidth: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ backgroundColor: 'grey.50' }}>
                  <tr>
                    {columns.map((col) => (
                      <th
                        key={col}
                        style={{
                          padding: '8px 16px',
                          textAlign: 'left',
                          fontSize: 12,
                          fontWeight: 500,
                          color: 'grey.600',
                          textTransform: 'uppercase',
                        }}
                      >
                        {getColumnLabel(col)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody style={{ backgroundColor: 'white' }}>
                  {previewData.map((row, idx) => (
                    <tr key={idx}>
                      {columns.map((col) => (
                        <td
                          key={col}
                          style={{
                            padding: '8px 16px',
                            fontSize: 14,
                            color: 'grey.900',
                          }}
                        >
                          {String(row[col] || '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.length > 10 && (
              <div
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'grey.50',
                  fontSize: 14,
                  color: '#475569',
                  textAlign: 'center',
                }}
              >
                ... 还有 {data.length - 10} 行数据
              </div>
            )}
          </div>
        </div>

        <div
          style={{
            padding: 24,
            borderTop: '1px solid border.default',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 12,
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              color: '#334155',
              backgroundColor: 'grey.100',
              borderRadius: 8,
            }}
          >
            取消
          </button>
          <button
            onClick={onDownload}
            style={{
              padding: '8px 16px',
              backgroundColor: 'success.dark',
              color: 'white',
              borderRadius: 8,
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center' }}>
              <Download style={{ width: 16, height: 16, marginRight: 8 }} />
              下载文件
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportPreview;
