import { Box } from '@mui/material';
import { Button } from '@/components/ui/Button';
import React from 'react';
import { AlertCircle } from 'lucide-react';

export interface ImportPreviewProps {
  data: any[];
  errors: Array<{
    row: number;
    field: string;
    message: string;
    value: string;
  }>;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ImportPreview: React.FC<ImportPreviewProps> = ({
  data,
  errors,
  onConfirm,
  onCancel,
}) => {
  if (data.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', pt: 4, pb: 4 }}>
        <AlertCircle
          style={{
            width: 48,
            height: 48,
            color: '#eab308',
            margin: '0 auto 8px',
          }}
        />
        <p style={{ color: '#475569', margin: 0 }}>没有可预览的数据</p>
      </Box>
    );
  }

  const columns = Object.keys(data[0] || {});

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box
        sx={{
          backgroundColor: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: 2,
          p: 2,
        }}
      >
        <p style={{ fontSize: 14, color: '#1e40af', margin: 0 }}>
          共 {data.length} 条数据，将导入 {data.length - errors.length} 条
          {errors.length > 0 && `，${errors.length} 条有错误`}
        </p>
      </Box>

      <Box
        sx={{
          border: '1px solid #e2e8f0',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <Box sx={{ overflowX: 'auto' }}>
          <table style={{ minWidth: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ backgroundColor: '#f8fafc' }}>
              <tr>
                <th
                  style={{
                    padding: '8px 16px',
                    textAlign: 'left',
                    fontSize: 12,
                    fontWeight: 500,
                    color: '#64748b',
                    textTransform: 'uppercase',
                  }}
                >
                  行号
                </th>
                {columns.map((col) => (
                  <th
                    key={col}
                    style={{
                      padding: '8px 16px',
                      textAlign: 'left',
                      fontSize: 12,
                      fontWeight: 500,
                      color: '#64748b',
                      textTransform: 'uppercase',
                    }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody style={{ backgroundColor: 'white' }}>
              {data.slice(0, 20).map((row, idx) => {
                const rowErrors = errors.filter((e) => e.row === idx + 1);
                return (
                  <tr
                    key={idx}
                    style={rowErrors.length > 0 ? { backgroundColor: '#fef2f2' } : {}}
                  >
                    <td
                      style={{
                        padding: '8px 16px',
                        fontSize: 14,
                        color: '#475569',
                      }}
                    >
                      {idx + 1}
                    </td>
                    {columns.map((col) => (
                      <td
                        key={col}
                        style={{
                          padding: '8px 16px',
                          fontSize: 14,
                          color: '#0f172a',
                        }}
                      >
                        {String(row[col] || '')}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Box>
        {data.length > 20 && (
          <Box
            sx={{
              p: 2,
              backgroundColor: '#f8fafc',
              fontSize: 14,
              color: '#475569',
              textAlign: 'center',
            }}
          >
            ... 还有 {data.length - 20} 行数据
          </Box>
        )}
      </Box>

      {errors.length > 0 && (
        <Box>
          <h4
            style={{
              fontWeight: 500,
              color: '#334155',
              marginBottom: 8,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <AlertCircle
              style={{
                width: 16,
                height: 16,
                marginRight: 4,
                color: '#ef4444',
              }}
            />
            验证错误:
          </h4>
          <Box
            sx={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 2,
              p: 2,
              maxHeight: 240,
              overflowY: 'auto',
            }}
          >
            {errors.slice(0, 20).map((error, idx) => (
              <Box
                key={idx}
                sx={{
                  fontSize: 14,
                  color: '#b91c1c',
                  mb: 1,
                  '&:last-child': { mb: 0 },
                }}
              >
                <span style={{ fontWeight: 500 }}>
                  第{error.row}行 {error.field}:
                </span>{' '}
                {error.message}
              </Box>
            ))}
            {errors.length > 20 && (
              <p style={{ fontSize: 14, color: '#dc2626', marginTop: 8 }}>
                ... 还有 {errors.length - 20} 个错误
              </p>
            )}
          </Box>
        </Box>
      )}

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 1.5,
          pt: 2,
          borderTop: '1px solid #e2e8f0',
        }}
      >
        <Button
          onClick={onCancel}
          sx={{
            padding: '8px 16px',
            color: '#334155',
            backgroundColor: '#f1f5f9',
            borderRadius: 2,
            '&:hover': { backgroundColor: '#e2e8f0' },
            transition: 'colors 0.2s',
          }}
        >
          取消
        </Button>
        <Button
          onClick={onConfirm}
          disabled={errors.length > 0}
          sx={{
            padding: '8px 16px',
            backgroundColor: '#2563eb',
            color: 'white',
            borderRadius: 2,
            '&:hover': { backgroundColor: '#1d4ed8' },
            '&:disabled': { opacity: 0.5, cursor: 'not-allowed' },
            transition: 'colors 0.2s',
          }}
        >
          确认导入
        </Button>
      </Box>
    </Box>
  );
};

export default ImportPreview;
