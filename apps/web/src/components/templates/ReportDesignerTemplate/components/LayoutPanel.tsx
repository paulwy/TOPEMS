import React from 'react';
import {
  Box,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
} from '@mui/material';
import { Table, BarChart3, LayoutGrid } from 'lucide-react';
import type { LayoutConfig, LayoutType, ChartType, ReportChartConfig, SelectedField } from '../types';

interface LayoutPanelProps {
  layout: LayoutConfig;
  selectedFields: SelectedField[];
  handleLayoutChange: (type: LayoutType) => void;
  setState: React.Dispatch<React.SetStateAction<any>>;
}

export const LayoutPanel: React.FC<LayoutPanelProps> = ({
  layout,
  selectedFields,
  handleLayoutChange,
  setState,
}) => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Typography
        variant='subtitle2'
        sx={{ fontWeight: 600, color: 'grey.600' }}
      >
        布局类型
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Button
          variant={layout.type === 'table' ? 'contained' : 'outlined'}
          onClick={() => handleLayoutChange('table')}
          sx={{ borderRadius: 1 }}
        >
          <Table sx={{ width: 16, height: 16, mr: 1 }} />
          表格
        </Button>
        <Button
          variant={layout.type === 'chart' ? 'contained' : 'outlined'}
          onClick={() => handleLayoutChange('chart')}
          sx={{ borderRadius: 1 }}
        >
          <BarChart3 sx={{ width: 16, height: 16, mr: 1 }} />
          图表
        </Button>
        <Button
          variant={layout.type === 'card' ? 'contained' : 'outlined'}
          onClick={() => handleLayoutChange('card')}
          sx={{ borderRadius: 1 }}
        >
          <LayoutGrid sx={{ width: 16, height: 16, mr: 1 }} />
          卡片
        </Button>
      </Box>

      {layout.type === 'chart' && (
        <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography
            variant='body2'
            sx={{ fontWeight: 500, mb: 2 }}
          >
            图表配置
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl>
              <InputLabel size='small'>图表类型</InputLabel>
              <Select
                size='small'
                value={layout.chart?.type || 'bar'}
                label='图表类型'
                onChange={(e) =>
                  setState((prev: any) => ({
                    ...prev,
                    layout: {
                      ...prev.layout,
                      chart: { ...prev.layout.chart!, type: e.target.value as ChartType },
                    },
                  }))
                }
              >
                <MenuItem value='line'>折线图</MenuItem>
                <MenuItem value='bar'>柱状图</MenuItem>
                <MenuItem value='pie'>饼图</MenuItem>
                <MenuItem value='area'>面积图</MenuItem>
                <MenuItem value='scatter'>散点图</MenuItem>
              </Select>
            </FormControl>
            <FormControl>
              <InputLabel size='small'>X轴字段</InputLabel>
              <Select
                size='small'
                value={layout.chart?.xAxisField || ''}
                label='X轴字段'
                onChange={(e) =>
                  setState((prev: any) => ({
                    ...prev,
                    layout: {
                      ...prev.layout,
                      chart: {
                        ...(prev.layout.chart || ({} as ReportChartConfig)),
                        xAxisField: e.target.value,
                      },
                    },
                  }))
                }
              >
                {selectedFields
                  .filter((f) => f.visible)
                  .map((f) => (
                    <MenuItem
                      key={f.fieldId}
                      value={f.fieldId}
                    >
                      {f.label}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
            <FormControl>
              <InputLabel size='small'>Y轴字段</InputLabel>
              <Select
                size='small'
                multiple
                value={layout.chart?.yAxisFields || []}
                label='Y轴字段'
                onChange={(e) =>
                  setState((prev: any) => ({
                    ...prev,
                    layout: {
                      ...prev.layout,
                      chart: {
                        ...(prev.layout.chart || ({} as ReportChartConfig)),
                        yAxisFields: e.target.value as string[],
                      },
                    },
                  }))
                }
              >
                {selectedFields
                  .filter((f) => f.visible && f.type === 'number')
                  .map((f) => (
                    <MenuItem
                      key={f.fieldId}
                      value={f.fieldId}
                    >
                      {f.label}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
            <Box sx={{ display: 'flex', gap: 4 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={layout.chart?.showLegend}
                    onChange={(e) =>
                      setState((prev: any) => ({
                        ...prev,
                        layout: {
                          ...prev.layout,
                          chart: {
                            ...(prev.layout.chart || ({} as ReportChartConfig)),
                            showLegend: e.target.checked,
                          },
                        },
                      }))
                    }
                  />
                }
                label='显示图例'
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={layout.chart?.showGrid}
                    onChange={(e) =>
                      setState((prev: any) => ({
                        ...prev,
                        layout: {
                          ...prev.layout,
                          chart: {
                            ...(prev.layout.chart || ({} as ReportChartConfig)),
                            showGrid: e.target.checked,
                          },
                        },
                      }))
                    }
                  />
                }
                label='显示网格'
              />
            </Box>
          </Box>
        </Box>
      )}

      {layout.type === 'card' && (
        <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography
            variant='body2'
            sx={{ fontWeight: 500, mb: 2 }}
          >
            卡片配置
          </Typography>
          <FormControl>
            <InputLabel size='small'>列数</InputLabel>
            <Select
              size='small'
              value={layout.columns}
              label='列数'
              onChange={(e) =>
                setState((prev: any) => ({
                  ...prev,
                  layout: { ...prev.layout, columns: e.target.value as number },
                }))
              }
            >
              <MenuItem value={1}>单列</MenuItem>
              <MenuItem value={2}>两列</MenuItem>
              <MenuItem value={3}>三列</MenuItem>
              <MenuItem value={4}>四列</MenuItem>
            </Select>
          </FormControl>
        </Box>
      )}

      <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        <FormControlLabel
          control={
            <Switch
              checked={layout.showHeader}
              onChange={(e) =>
                setState((prev: any) => ({
                  ...prev,
                  layout: { ...prev.layout, showHeader: e.target.checked },
                }))
              }
            />
          }
          label='显示表头'
        />
        <FormControlLabel
          control={
            <Switch
              checked={layout.showFooter}
              onChange={(e) =>
                setState((prev: any) => ({
                  ...prev,
                  layout: { ...prev.layout, showFooter: e.target.checked },
                }))
              }
            />
          }
          label='显示表尾'
        />
        <FormControlLabel
          control={
            <Switch
              checked={layout.pagination}
              onChange={(e) =>
                setState((prev: any) => ({
                  ...prev,
                  layout: { ...prev.layout, pagination: e.target.checked },
                }))
              }
            />
          }
          label='分页显示'
        />
      </Box>

      {layout.pagination && (
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel size='small'>每页条数</InputLabel>
          <Select
            size='small'
            value={layout.pageSize}
            label='每页条数'
            onChange={(e) =>
              setState((prev: any) => ({
                ...prev,
                layout: { ...prev.layout, pageSize: e.target.value as number },
              }))
            }
          >
            <MenuItem value={5}>5条/页</MenuItem>
            <MenuItem value={10}>10条/页</MenuItem>
            <MenuItem value={20}>20条/页</MenuItem>
            <MenuItem value={50}>50条/页</MenuItem>
          </Select>
        </FormControl>
      )}
    </Box>
  );
};
