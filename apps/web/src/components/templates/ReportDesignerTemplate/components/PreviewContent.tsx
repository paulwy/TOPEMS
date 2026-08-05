import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { BarChart3 } from 'lucide-react';
import type { LayoutConfig, SelectedField } from '../types';

interface PreviewContentProps {
  layout: LayoutConfig;
  selectedFields: SelectedField[];
  previewData: Record<string, any>[];
}

export const PreviewContent: React.FC<PreviewContentProps> = ({
  layout,
  selectedFields,
  previewData,
}) => {
  const renderPreviewTable = () => {
    const visibleFields = selectedFields.filter((f) => f.visible);
    if (visibleFields.length === 0) return null;

    return (
      <Paper sx={{ borderRadius: 1, overflow: 'hidden' }}>
        {layout.showHeader && (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: visibleFields.map(() => '1fr').join(' '),
              px: 2,
              py: 1.5,
              bgcolor: 'grey.100',
              fontWeight: 600,
            }}
          >
            {visibleFields.map((field) => (
              <Typography
                key={field.fieldId}
                variant='body2'
                sx={{ color: 'grey.600' }}
              >
                {field.label}
              </Typography>
            ))}
          </Box>
        )}
        <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
          {previewData
            .slice(0, layout.pagination ? layout.pageSize : previewData.length)
            .map((row, idx) => (
              <Box
                key={idx}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: visibleFields.map(() => '1fr').join(' '),
                  px: 2,
                  py: 1.5,
                  borderBottom: idx < previewData.length - 1 ? 1 : 0,
                  borderColor: 'divider',
                  '&:hover': { bgcolor: 'grey.50' },
                }}
              >
                {visibleFields.map((field) => (
                  <Typography
                    key={field.fieldId}
                    variant='body2'
                  >
                    {row[field.fieldName] || '-'}
                  </Typography>
                ))}
              </Box>
            ))}
        </Box>
        {layout.showFooter && (
          <Box sx={{ px: 2, py: 1.5, bgcolor: 'grey.50', textAlign: 'right' }}>
            <Typography
              variant='caption'
              sx={{ color: 'grey.500' }}
            >
              共 {previewData.length} 条记录
            </Typography>
          </Box>
        )}
      </Paper>
    );
  };

  const renderPreviewChart = () => {
    const xField = selectedFields.find((f) => f.fieldId === layout.chart?.xAxisField);
    const yFields = (layout.chart?.yAxisFields || [])
      .map((id) => selectedFields.find((f) => f.fieldId === id))
      .filter(Boolean) as SelectedField[];

    if (!xField || yFields.length === 0) {
      return (
        <Box sx={{ p: 6, textAlign: 'center', bgcolor: 'grey.50', borderRadius: 1 }}>
          <BarChart3 sx={{ width: 48, height: 48, color: 'grey.300', mx: 'auto', mb: 2 }} />
          <Typography
            variant='body1'
            sx={{ color: 'grey.400' }}
          >
            请配置图表字段
          </Typography>
        </Box>
      );
    }

    const chartColors = ['#6366f1', '#f97316', '#10b981', '#ef4444', '#8b5cf6'];

    return (
      <Paper sx={{ p: 3, borderRadius: 1 }}>
        <Box
          sx={{
            height: 300,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-around',
            gap: 1,
          }}
        >
          {previewData.slice(0, 5).map((row, idx) => (
            <Box
              key={idx}
              sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}
            >
              <Typography
                variant='caption'
                sx={{ mb: 1, color: 'grey.600' }}
              >
                {row[xField.fieldName]}
              </Typography>
              <Box
                sx={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: 2,
                  width: '100%',
                  justifyContent: 'center',
                }}
              >
                {yFields.map((yField, yIdx) => {
                  const value = row[yField.fieldName] || 0;
                  const maxValue = Math.max(...previewData.map((r) => r[yField.fieldName] || 0), 1);
                  const height = (value / maxValue) * 100;
                  return (
                    <Box
                      key={yIdx}
                      sx={{
                        width: 20,
                        height: `${height}%`,
                        bgcolor: chartColors[yIdx % chartColors.length],
                        borderRadius: '4px 4px 0 0',
                        minHeight: 10,
                        transition: 'height 0.3s',
                      }}
                    />
                  );
                })}
              </Box>
            </Box>
          ))}
        </Box>
        {layout.chart?.showLegend && yFields.length > 1 && (
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center', gap: 3 }}>
            {yFields.map((yField, idx) => (
              <Box
                key={idx}
                sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    bgcolor: chartColors[idx % chartColors.length],
                    borderRadius: 3,
                  }}
                />
                <Typography variant='caption'>{yField.label}</Typography>
              </Box>
            ))}
          </Box>
        )}
      </Paper>
    );
  };

  const renderPreviewCards = () => {
    const visibleFields = selectedFields.filter((f) => f.visible);
    if (visibleFields.length === 0) return null;

    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: `repeat(${layout.columns}, 1fr)`,
          gap: 2,
        }}
      >
        {previewData
          .slice(0, layout.pagination ? layout.pageSize : previewData.length)
          .map((row, idx) => (
            <Paper
              key={idx}
              sx={{ p: 2, borderRadius: 1 }}
            >
              {visibleFields.map((field) => (
                <Box
                  key={field.fieldId}
                  sx={{ mb: 1 }}
                >
                  <Typography
                    variant='caption'
                    sx={{ color: 'grey.500' }}
                  >
                    {field.label}
                  </Typography>
                  <Typography
                    variant='body2'
                    sx={{ fontWeight: 500 }}
                  >
                    {row[field.fieldName] || '-'}
                  </Typography>
                </Box>
              ))}
            </Paper>
          ))}
      </Box>
    );
  };

  switch (layout.type) {
    case 'chart':
      return renderPreviewChart();
    case 'card':
      return renderPreviewCards();
    default:
      return renderPreviewTable();
  }
};
