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
import i18n from '@/i18n';
import { Table, BarChart3, LayoutGrid } from 'lucide-react';
import type {
  LayoutConfig,
  LayoutType,
  ChartType,
  ReportChartConfig,
  ReportDesignerState,
  SelectedField,
} from '../types';

interface LayoutPanelProps {
  layout: LayoutConfig;
  selectedFields: SelectedField[];
  handleLayoutChange: (type: LayoutType) => void;
  setState: React.Dispatch<React.SetStateAction<ReportDesignerState>>;
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
        {i18n.t('components.layout_panel.k0')}
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Button
          variant={layout.type === 'table' ? 'contained' : 'outlined'}
          onClick={() => handleLayoutChange('table')}
          sx={{ borderRadius: 1 }}
        >
          <Table sx={{ width: 16, height: 16, mr: 1 }} />
          {i18n.t('components.layout_panel.k1')}
        </Button>
        <Button
          variant={layout.type === 'chart' ? 'contained' : 'outlined'}
          onClick={() => handleLayoutChange('chart')}
          sx={{ borderRadius: 1 }}
        >
          <BarChart3 sx={{ width: 16, height: 16, mr: 1 }} />
          {i18n.t('components.layout_panel.k2')}
        </Button>
        <Button
          variant={layout.type === 'card' ? 'contained' : 'outlined'}
          onClick={() => handleLayoutChange('card')}
          sx={{ borderRadius: 1 }}
        >
          <LayoutGrid sx={{ width: 16, height: 16, mr: 1 }} />
          {i18n.t('components.layout_panel.k3')}
        </Button>
      </Box>

      {layout.type === 'chart' && (
        <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography
            variant='body2'
            sx={{ fontWeight: 500, mb: 2 }}
          >
            {i18n.t('components.layout_panel.k4')}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl>
              <InputLabel size='small'>{i18n.t('components.layout_panel.k0')}</InputLabel>
              <Select
                size='small'
                value={layout.chart?.type || 'bar'}
                label={i18n.t('components.layout_panel.k1')}
                onChange={(e) =>
                  setState((prev: ReportDesignerState) => ({
                    ...prev,
                    layout: {
                      ...prev.layout,
                      chart: { ...prev.layout.chart!, type: e.target.value as ChartType },
                    },
                  }))
                }
              >
                <MenuItem value='line'>{i18n.t('components.layout_panel.k2')}</MenuItem>
                <MenuItem value='bar'>{i18n.t('components.layout_panel.k3')}</MenuItem>
                <MenuItem value='pie'>{i18n.t('components.layout_panel.k4')}</MenuItem>
                <MenuItem value='area'>{i18n.t('components.layout_panel.k5')}</MenuItem>
                <MenuItem value='scatter'>{i18n.t('components.layout_panel.k6')}</MenuItem>
              </Select>
            </FormControl>
            <FormControl>
              <InputLabel size='small'>X轴字段</InputLabel>
              <Select
                size='small'
                value={layout.chart?.xAxisField || ''}
                label={i18n.t('components.layout_panel.x_5')}
                onChange={(e) =>
                  setState((prev: ReportDesignerState) => ({
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
                label={i18n.t('components.layout_panel.y_6')}
                onChange={(e) =>
                  setState((prev: ReportDesignerState) => ({
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
                      setState((prev: ReportDesignerState) => ({
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
                label={i18n.t('components.layout_panel.k7')}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={layout.chart?.showGrid}
                    onChange={(e) =>
                      setState((prev: ReportDesignerState) => ({
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
                label={i18n.t('components.layout_panel.k8')}
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
            {i18n.t('components.layout_panel.k7')}
          </Typography>
          <FormControl>
            <InputLabel size='small'>{i18n.t('components.layout_panel.k9')}</InputLabel>
            <Select
              size='small'
              value={layout.columns}
              label={i18n.t('components.layout_panel.k10')}
              onChange={(e) =>
                setState((prev: ReportDesignerState) => ({
                  ...prev,
                  layout: { ...prev.layout, columns: e.target.value as number },
                }))
              }
            >
              <MenuItem value={1}>{i18n.t('components.layout_panel.k11')}</MenuItem>
              <MenuItem value={2}>{i18n.t('components.layout_panel.k12')}</MenuItem>
              <MenuItem value={3}>{i18n.t('components.layout_panel.k13')}</MenuItem>
              <MenuItem value={4}>{i18n.t('components.layout_panel.k14')}</MenuItem>
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
                setState((prev: ReportDesignerState) => ({
                  ...prev,
                  layout: { ...prev.layout, showHeader: e.target.checked },
                }))
              }
            />
          }
          label={i18n.t('components.layout_panel.k15')}
        />
        <FormControlLabel
          control={
            <Switch
              checked={layout.showFooter}
              onChange={(e) =>
                setState((prev: ReportDesignerState) => ({
                  ...prev,
                  layout: { ...prev.layout, showFooter: e.target.checked },
                }))
              }
            />
          }
          label={i18n.t('components.layout_panel.k16')}
        />
        <FormControlLabel
          control={
            <Switch
              checked={layout.pagination}
              onChange={(e) =>
                setState((prev: ReportDesignerState) => ({
                  ...prev,
                  layout: { ...prev.layout, pagination: e.target.checked },
                }))
              }
            />
          }
          label={i18n.t('components.layout_panel.k17')}
        />
      </Box>

      {layout.pagination && (
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel size='small'>{i18n.t('components.layout_panel.k18')}</InputLabel>
          <Select
            size='small'
            value={layout.pageSize}
            label={i18n.t('components.layout_panel.k19')}
            onChange={(e) =>
              setState((prev: ReportDesignerState) => ({
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
