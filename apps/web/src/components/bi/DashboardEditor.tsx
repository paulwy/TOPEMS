import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus,
  Save,
  Undo2,
  Redo2,
  Eye,
  EyeOff,
  Trash2,
  BarChart3,
  PieChart,
  LineChart,
  AreaChart,
  Grid3X3,
  Target,
  Table,
} from 'lucide-react';
import i18n from '@/i18n';
import { BackButton } from '../common';
import {
  Box,
  Typography,
  Button,
  Drawer,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
  Chip,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import type { ChartType, ChartDataPoint } from './ChartLibrary';
import ChartComponent from './ChartLibrary';
import PivotTable from './PivotTable';

export interface DashboardWidget {
  id: string;
  type: 'chart' | 'pivot' | 'metric';
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
  config: {
    chartType?: ChartType;
    data?: ChartDataPoint[];
    xKey?: string;
    yKey?: string;
    yKeys?: string[];
    rows?: string[];
    cols?: string[];
    values?: string[];
    metricValue?: number;
    metricLabel?: string;
    metricPrefix?: string;
    metricSuffix?: string;
    dataSource?: string;
  };
}

export interface DashboardConfig {
  id: string;
  name: string;
  description?: string;
  widgets: DashboardWidget[];
}

const CHART_TYPES: { value: ChartType; label: string; icon: React.ReactNode }[] = [
  { value: 'bar', label: i18n.t('components.dashboard_editor.k0'), icon: <BarChart3 size={20} /> },
  { value: 'line', label: i18n.t('components.dashboard_editor.k1'), icon: <LineChart size={20} /> },
  { value: 'pie', label: i18n.t('components.dashboard_editor.k2'), icon: <PieChart size={20} /> },
  { value: 'area', label: i18n.t('components.dashboard_editor.k3'), icon: <AreaChart size={20} /> },
  { value: 'radar', label: i18n.t('components.dashboard_editor.k4'), icon: <Grid3X3 size={20} /> },
  {
    value: 'scatter',
    label: i18n.t('components.dashboard_editor.k5'),
    icon: <Grid3X3 size={20} />,
  },
  {
    value: 'composed',
    label: i18n.t('components.dashboard_editor.k6'),
    icon: <BarChart3 size={20} />,
  },
  { value: 'gauge', label: i18n.t('components.dashboard_editor.k7'), icon: <Target size={20} /> },
];

const WIDGET_TYPES = [
  {
    value: 'chart',
    label: i18n.t('components.dashboard_editor.k8'),
    icon: <BarChart3 size={24} />,
  },
  { value: 'pivot', label: i18n.t('components.dashboard_editor.k9'), icon: <Table size={24} /> },
  { value: 'metric', label: i18n.t('components.dashboard_editor.k10'), icon: <Target size={24} /> },
];

const generateId = () => `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const sampleChartData: ChartDataPoint[] = [
  { name: i18n.t('components.dashboard_editor.1_0'), value: 400, sales: 300, profit: 100 },
  { name: i18n.t('components.dashboard_editor.2_1'), value: 300, sales: 250, profit: 50 },
  { name: i18n.t('components.dashboard_editor.3_2'), value: 500, sales: 420, profit: 80 },
  { name: i18n.t('components.dashboard_editor.4_3'), value: 600, sales: 500, profit: 100 },
  { name: i18n.t('components.dashboard_editor.5_4'), value: 450, sales: 380, profit: 70 },
  { name: i18n.t('components.dashboard_editor.6_5'), value: 700, sales: 580, profit: 120 },
];

const samplePivotData = [
  {
    region: i18n.t('components.dashboard_editor.k12'),
    category: i18n.t('components.dashboard_editor.k11'),
    sales: 12000,
  },
  {
    region: i18n.t('components.dashboard_editor.k14'),
    category: i18n.t('components.dashboard_editor.k13'),
    sales: 8000,
  },
  {
    region: i18n.t('components.dashboard_editor.k16'),
    category: i18n.t('components.dashboard_editor.k15'),
    sales: 15000,
  },
  {
    region: i18n.t('components.dashboard_editor.k18'),
    category: i18n.t('components.dashboard_editor.k17'),
    sales: 10000,
  },
  {
    region: i18n.t('components.dashboard_editor.k20'),
    category: i18n.t('components.dashboard_editor.k19'),
    sales: 18000,
  },
  {
    region: i18n.t('components.dashboard_editor.k22'),
    category: i18n.t('components.dashboard_editor.k21'),
    sales: 9000,
  },
];

const GRID_COLS = 12;
const GRID_ROWS = 10;
const CELL_WIDTH = 60;
const CELL_HEIGHT = 50;

export const DashboardEditor: React.FC<{
  initialConfig?: DashboardConfig;
  onSave?: (config: DashboardConfig) => void;
  onCancel?: () => void;
}> = ({ initialConfig, onSave, onCancel }) => {
  const [widgets, setWidgets] = useState<DashboardWidget[]>(initialConfig?.widgets || []);
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);
  const theme = useTheme();
  const [dashboardName, setDashboardName] = useState(
    initialConfig?.name || i18n.t('components.dashboard_editor.k23')
  );
  const [dashboardDescription, _setDashboardDescription] = useState(
    initialConfig?.description || ''
  );
  const [showAddWidgetModal, setShowAddWidgetModal] = useState(false);
  const [newWidgetType, setNewWidgetType] = useState<'chart' | 'pivot' | 'metric'>('chart');
  const [newWidgetChartType, setNewWidgetChartType] = useState<ChartType>('bar');
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [history, setHistory] = useState<DashboardWidget[][]>([widgets]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const historyIndexRef = useRef(historyIndex);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizing, setResizing] = useState<string | null>(null);
  const [_resizeDirection, setResizeDirection] = useState<'se' | 'sw' | 'ne' | 'nw'>('se');

  useEffect(() => {
    historyIndexRef.current = historyIndex;
  }, [historyIndex]);

  useEffect(() => {
    if (widgets.length > 0) {
      setHistory((prev) => {
        const newHistory = prev.slice(0, historyIndexRef.current + 1);
        newHistory.push([...widgets]);
        return newHistory.slice(-50);
      });
      setHistoryIndex((prev) => prev + 1);
    }
  }, [widgets]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setWidgets([...history[newIndex]]);
      setHistoryIndex(newIndex);
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setWidgets([...history[newIndex]]);
      setHistoryIndex(newIndex);
    }
  }, [history, historyIndex]);

  const handleMouseDown = (e: React.MouseEvent, widgetId: string) => {
    if (isPreviewMode) return;
    const widget = widgets.find((w) => w.id === widgetId);
    if (!widget) return;

    setDragging(widgetId);
    setSelectedWidgetId(widgetId);
    setDragOffset({
      x: e.clientX - widget.x * CELL_WIDTH,
      y: e.clientY - widget.y * CELL_HEIGHT,
    });

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!dragging) return;

      const x = Math.max(
        0,
        Math.min(GRID_COLS - widget.w, Math.floor((moveEvent.clientX - dragOffset.x) / CELL_WIDTH))
      );
      const y = Math.max(
        0,
        Math.min(GRID_ROWS - widget.h, Math.floor((moveEvent.clientY - dragOffset.y) / CELL_HEIGHT))
      );

      setWidgets((prev) => prev.map((w) => (w.id === dragging ? { ...w, x, y } : w)));
    };

    const handleMouseUp = () => {
      setDragging(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleResizeStart = (
    e: React.MouseEvent,
    widgetId: string,
    direction: 'se' | 'sw' | 'ne' | 'nw'
  ) => {
    e.stopPropagation();
    if (isPreviewMode) return;

    setResizing(widgetId);
    setResizeDirection(direction);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!resizing) return;

      setWidgets((prev) =>
        prev.map((w) => {
          if (w.id !== resizing) return w;

          let newW = w.w;
          let newH = w.h;
          let newX = w.x;
          let newY = w.y;

          const deltaX = Math.round(
            (moveEvent.clientX - (w.x * CELL_WIDTH + w.w * CELL_WIDTH)) / CELL_WIDTH
          );
          const deltaY = Math.round(
            (moveEvent.clientY - (w.y * CELL_HEIGHT + w.h * CELL_HEIGHT)) / CELL_HEIGHT
          );

          switch (direction) {
            case 'se':
              newW = Math.max(1, Math.min(GRID_COLS - w.x, w.w + deltaX));
              newH = Math.max(1, Math.min(GRID_ROWS - w.y, w.h + deltaY));
              break;
            case 'sw':
              newW = Math.max(1, Math.min(w.x + w.w, w.w - deltaX));
              newH = Math.max(1, Math.min(GRID_ROWS - w.y, w.h + deltaY));
              newX = Math.max(0, w.x - deltaX);
              break;
            case 'ne':
              newW = Math.max(1, Math.min(GRID_COLS - w.x, w.w + deltaX));
              newH = Math.max(1, Math.min(w.y + w.h, w.h - deltaY));
              newY = Math.max(0, w.y - deltaY);
              break;
            case 'nw':
              newW = Math.max(1, Math.min(w.x + w.w, w.w - deltaX));
              newH = Math.max(1, Math.min(w.y + w.h, w.h - deltaY));
              newX = Math.max(0, w.x - deltaX);
              newY = Math.max(0, w.y - deltaY);
              break;
          }

          return { ...w, x: newX, y: newY, w: newW, h: newH };
        })
      );
    };

    const handleMouseUp = () => {
      setResizing(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleDeleteWidget = (widgetId: string) => {
    setWidgets((prev) => prev.filter((w) => w.id !== widgetId));
    if (selectedWidgetId === widgetId) {
      setSelectedWidgetId(null);
    }
  };

  const handleAddWidget = () => {
    const findEmptyPosition = () => {
      for (let y = 0; y < GRID_ROWS; y++) {
        for (let x = 0; x < GRID_COLS; x++) {
          const isOccupied = widgets.some(
            (w) => x < w.x + w.w && x + 2 > w.x && y < w.y + w.h && y + 2 > w.y
          );
          if (!isOccupied) {
            return { x, y };
          }
        }
      }
      return { x: 0, y: 0 };
    };

    const { x, y } = findEmptyPosition();

    const newWidget: DashboardWidget = {
      id: generateId(),
      type: newWidgetType,
      title:
        newWidgetType === 'metric'
          ? i18n.t('components.dashboard_editor.k26')
          : newWidgetType === 'pivot'
            ? i18n.t('components.dashboard_editor.k25')
            : i18n.t('components.dashboard_editor.k24'),
      x,
      y,
      w: 2,
      h: 2,
      config:
        newWidgetType === 'chart'
          ? { chartType: newWidgetChartType, data: sampleChartData, xKey: 'name', yKey: 'value' }
          : newWidgetType === 'pivot'
            ? { rows: ['region'], cols: ['category'], values: ['sales'], data: samplePivotData }
            : { metricValue: 0, metricLabel: i18n.t('components.dashboard_editor.k27') },
    };

    setWidgets((prev) => [...prev, newWidget]);
    setShowAddWidgetModal(false);
    setSelectedWidgetId(newWidget.id);
  };

  const handleUpdateWidget = (widgetId: string, updates: Partial<DashboardWidget>) => {
    setWidgets((prev) => prev.map((w) => (w.id === widgetId ? { ...w, ...updates } : w)));
  };

  const handleSave = () => {
    const config: DashboardConfig = {
      id: initialConfig?.id || `dashboard-${Date.now()}`,
      name: dashboardName,
      description: dashboardDescription,
      widgets,
    };
    onSave?.(config);
  };

  const selectedWidget = widgets.find((w) => w.id === selectedWidgetId);

  const renderResizeHandle = (position: string) => (
    <div
      className='resize-handle'
      role='button'
      tabIndex={0}
      style={{
        position: 'absolute',
        width: 12,
        height: 12,
        cursor: `${position}-resize`,
        backgroundColor: theme.palette.primary.light,
        borderRadius: '50%',
        zIndex: 10,
        [position]: -6,
      }}
      onMouseDown={(e) =>
        handleResizeStart(e, selectedWidgetId!, position as 'se' | 'sw' | 'ne' | 'nw')
      }
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
        }
      }}
    />
  );

  return (
    <Box sx={{ display: 'flex', height: '100vh', backgroundColor: 'grey.100' }}>
      <Box sx={{ flex: 1, p: 3, overflow: 'auto' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <BackButton
              variant='text'
              size='small'
              onClick={onCancel}
            />
            <TextField
              value={dashboardName}
              onChange={(e) => setDashboardName(e.target.value)}
              variant='standard'
              sx={{ fontSize: 24, fontWeight: 700, width: 300 }}
              placeholder={i18n.t('components.dashboard_editor.k28')}
            />
            <Typography
              variant='body2'
              sx={{ color: 'text.secondary' }}
            >
              {dashboardDescription || i18n.t('components.dashboard_editor.k29')}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              variant='outlined'
              size='small'
              startIcon={<Undo2 />}
              onClick={undo}
              disabled={historyIndex === 0}
            >
              {i18n.t('components.dashboard_editor.k6')}
            </Button>
            <Button
              variant='outlined'
              size='small'
              startIcon={<Redo2 />}
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
            >
              {i18n.t('components.dashboard_editor.k7')}
            </Button>
            <Button
              variant='outlined'
              size='small'
              startIcon={isPreviewMode ? <EyeOff /> : <Eye />}
              onClick={() => setIsPreviewMode(!isPreviewMode)}
            >
              {isPreviewMode
                ? i18n.t('components.dashboard_editor.k31')
                : i18n.t('components.dashboard_editor.k30')}
            </Button>
            <Button
              variant='contained'
              size='small'
              startIcon={<Plus />}
              onClick={() => setShowAddWidgetModal(true)}
              disabled={isPreviewMode}
            >
              {i18n.t('components.dashboard_editor.k8')}
            </Button>
            <Button
              variant='contained'
              size='small'
              startIcon={<Save />}
              onClick={handleSave}
            >
              {i18n.t('components.dashboard_editor.k9')}
            </Button>
          </Box>
        </Box>

        <Box
          sx={{
            position: 'relative',
            minHeight: GRID_ROWS * CELL_HEIGHT,
            backgroundColor: 'common.white',
            borderRadius: 3,
            boxShadow: 1,
            overflow: 'hidden',
          }}
        >
          <svg
            width='100%'
            height='100%'
            style={{ position: 'absolute', top: 0, left: 0 }}
            className={isPreviewMode ? 'hidden' : ''}
          >
            {Array.from({ length: GRID_COLS }).map((_, i) => (
              <line
                key={`v-${i}`}
                x1={i * CELL_WIDTH}
                y1={0}
                x2={i * CELL_WIDTH}
                y2={GRID_ROWS * CELL_HEIGHT}
                stroke='border.default'
                strokeWidth={i % 3 === 0 ? 1.5 : 0.5}
                strokeDasharray={i % 3 === 0 ? 'none' : '4,4'}
              />
            ))}
            {Array.from({ length: GRID_ROWS }).map((_, i) => (
              <line
                key={`h-${i}`}
                x1={0}
                y1={i * CELL_HEIGHT}
                x2={GRID_COLS * CELL_WIDTH}
                y2={i * CELL_HEIGHT}
                stroke='border.default'
                strokeWidth={i % 2 === 0 ? 1.5 : 0.5}
                strokeDasharray={i % 2 === 0 ? 'none' : '4,4'}
              />
            ))}
          </svg>

          {widgets.map((widget) => (
            <Box
              key={widget.id}
              sx={{
                position: 'absolute',
                left: widget.x * CELL_WIDTH,
                top: widget.y * CELL_HEIGHT,
                width: widget.w * CELL_WIDTH - 8,
                height: widget.h * CELL_HEIGHT - 8,
                margin: 4,
                backgroundColor: 'common.white',
                borderRadius: 1.5,
                boxShadow:
                  selectedWidgetId === widget.id
                    ? `0 0 0 2px primary.light, 0 4px 6px -1px ${alpha(theme.palette.common.black, 0.1)}`
                    : `0 1px 3px 0 ${alpha(theme.palette.common.black, 0.1)}`,
                overflow: 'hidden',
                cursor: isPreviewMode ? 'default' : 'move',
                transition: 'box-shadow 0.2s',
              }}
              onClick={() => !isPreviewMode && setSelectedWidgetId(widget.id)}
              onMouseDown={(e) => handleMouseDown(e, widget.id)}
            >
              {!isPreviewMode && selectedWidgetId === widget.id && (
                <>
                  {renderResizeHandle('bottomRight')}
                  {renderResizeHandle('bottomLeft')}
                  {renderResizeHandle('topRight')}
                  {renderResizeHandle('topLeft')}
                </>
              )}

              <Box sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 1,
                  }}
                >
                  <Typography
                    variant='body1'
                    sx={{ fontWeight: 600, fontSize: 13 }}
                  >
                    {widget.title}
                  </Typography>
                  {!isPreviewMode && (
                    <Button
                      size='small'
                      color='error'
                      sx={{ p: 0, minWidth: 24 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteWidget(widget.id);
                      }}
                    >
                      <Trash2 size={16} />
                    </Button>
                  )}
                </Box>

                {widget.type === 'metric' ? (
                  <Box
                    sx={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Typography
                      variant='h3'
                      sx={{ fontWeight: 700 }}
                    >
                      {widget.config.metricPrefix}
                      {widget.config.metricValue?.toLocaleString()}
                      {widget.config.metricSuffix}
                    </Typography>
                    {widget.config.metricLabel && (
                      <Chip
                        label={widget.config.metricLabel}
                        size='small'
                        sx={{ mt: 1 }}
                      />
                    )}
                  </Box>
                ) : widget.type === 'pivot' ? (
                  <Box sx={{ flex: 1, overflow: 'auto' }}>
                    <PivotTable
                      data={widget.config.data || []}
                      rows={widget.config.rows || []}
                      cols={widget.config.cols || []}
                      values={widget.config.values || []}
                    />
                  </Box>
                ) : (
                  <Box sx={{ flex: 1 }}>
                    <ChartComponent
                      type={widget.config.chartType || 'bar'}
                      data={widget.config.data || []}
                      xKey={widget.config.xKey}
                      yKey={widget.config.yKey}
                      yKeys={widget.config.yKeys}
                      chartHeight={widget.h * CELL_HEIGHT - 80}
                      chartWidth={widget.w * CELL_WIDTH - 32}
                      showLegend={widget.w >= 3}
                      showTooltip={true}
                    />
                  </Box>
                )}
              </Box>
            </Box>
          ))}

          {widgets.length === 0 && (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: 'text.secondary',
              }}
            >
              <Grid3X3
                size={48}
                sx={{ mb: 2 }}
              />
              <Typography variant='body1'>{i18n.t('components.dashboard_editor.k32')}</Typography>
            </Box>
          )}
        </Box>
      </Box>

      {selectedWidget && !isPreviewMode && (
        <Drawer
          anchor='right'
          open={!!selectedWidget}
          onClose={() => setSelectedWidgetId(null)}
          variant='persistent'
          sx={{ width: 320, flexShrink: 0 }}
        >
          <Box sx={{ p: 3, borderBottom: `1px solid ${alpha(theme.palette.common.black, 0.1)}` }}>
            <Typography
              variant='h6'
              sx={{ fontWeight: 600 }}
            >
              {i18n.t('components.dashboard_editor.k10')}
            </Typography>
          </Box>

          <Box sx={{ p: 3, overflow: 'auto' }}>
            <TextField
              label={i18n.t('components.dashboard_editor.k33')}
              fullWidth
              value={selectedWidget.title}
              onChange={(e) => handleUpdateWidget(selectedWidget.id, { title: e.target.value })}
              sx={{ mb: 3 }}
            />

            <Box sx={{ mb: 3 }}>
              <Typography
                variant='body2'
                sx={{ fontWeight: 500, mb: 1.5 }}
              >
                {i18n.t('components.dashboard_editor.k11')}
              </Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <FormControl
                  sx={{ flex: 1 }}
                  size='small'
                >
                  <InputLabel>{i18n.t('components.dashboard_editor.k34')}</InputLabel>
                  <Select
                    value={selectedWidget.w}
                    label={i18n.t('components.dashboard_editor.k35')}
                    onChange={(e) =>
                      handleUpdateWidget(selectedWidget.id, { w: e.target.value as number })
                    }
                  >
                    {Array.from({ length: GRID_COLS }).map((_, i) => (
                      <MenuItem
                        key={i + 1}
                        value={i + 1}
                      >
                        {i + 1} {i18n.t('components.dashboard_editor.k0')}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl
                  sx={{ flex: 1 }}
                  size='small'
                >
                  <InputLabel>{i18n.t('components.dashboard_editor.k36')}</InputLabel>
                  <Select
                    value={selectedWidget.h}
                    label={i18n.t('components.dashboard_editor.k37')}
                    onChange={(e) =>
                      handleUpdateWidget(selectedWidget.id, { h: e.target.value as number })
                    }
                  >
                    {Array.from({ length: GRID_ROWS }).map((_, i) => (
                      <MenuItem
                        key={i + 1}
                        value={i + 1}
                      >
                        {i + 1} {i18n.t('components.dashboard_editor.k1')}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography
                variant='body2'
                sx={{ fontWeight: 500, mb: 1.5 }}
              >
                {i18n.t('components.dashboard_editor.k12')}
              </Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <FormControl
                  sx={{ flex: 1 }}
                  size='small'
                >
                  <InputLabel>X</InputLabel>
                  <Select
                    value={selectedWidget.x}
                    label='X'
                    onChange={(e) =>
                      handleUpdateWidget(selectedWidget.id, { x: e.target.value as number })
                    }
                  >
                    {Array.from({ length: GRID_COLS }).map((_, i) => (
                      <MenuItem
                        key={i}
                        value={i}
                      >
                        {i}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl
                  sx={{ flex: 1 }}
                  size='small'
                >
                  <InputLabel>Y</InputLabel>
                  <Select
                    value={selectedWidget.y}
                    label='Y'
                    onChange={(e) =>
                      handleUpdateWidget(selectedWidget.id, { y: e.target.value as number })
                    }
                  >
                    {Array.from({ length: GRID_ROWS }).map((_, i) => (
                      <MenuItem
                        key={i}
                        value={i}
                      >
                        {i}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </Box>

            {selectedWidget.type === 'chart' && (
              <>
                <Divider sx={{ my: 2 }} />
                <FormControl
                  fullWidth
                  sx={{ mb: 3 }}
                  size='small'
                >
                  <InputLabel>{i18n.t('components.dashboard_editor.k38')}</InputLabel>
                  <Select
                    value={selectedWidget.config.chartType}
                    label={i18n.t('components.dashboard_editor.k39')}
                    onChange={(e) =>
                      handleUpdateWidget(selectedWidget.id, {
                        config: {
                          ...selectedWidget.config,
                          chartType: e.target.value as ChartType,
                        },
                      })
                    }
                  >
                    {CHART_TYPES.map((type) => (
                      <MenuItem
                        key={type.value}
                        value={type.value}
                      >
                        {type.icon}
                        <span style={{ marginLeft: 8 }}>{type.label}</span>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </>
            )}

            {selectedWidget.type === 'metric' && (
              <>
                <Divider sx={{ my: 2 }} />
                <TextField
                  label={i18n.t('components.dashboard_editor.k40')}
                  type='number'
                  fullWidth
                  value={selectedWidget.config.metricValue}
                  onChange={(e) =>
                    handleUpdateWidget(selectedWidget.id, {
                      config: {
                        ...selectedWidget.config,
                        metricValue: parseFloat(e.target.value) || 0,
                      },
                    })
                  }
                  sx={{ mb: 2 }}
                />
                <TextField
                  label={i18n.t('components.dashboard_editor.k41')}
                  fullWidth
                  value={selectedWidget.config.metricPrefix || ''}
                  onChange={(e) =>
                    handleUpdateWidget(selectedWidget.id, {
                      config: { ...selectedWidget.config, metricPrefix: e.target.value },
                    })
                  }
                  placeholder={i18n.t('components.dashboard_editor.k13')}
                  sx={{ mb: 2 }}
                />
                <TextField
                  label={i18n.t('components.dashboard_editor.k42')}
                  fullWidth
                  value={selectedWidget.config.metricSuffix || ''}
                  onChange={(e) =>
                    handleUpdateWidget(selectedWidget.id, {
                      config: { ...selectedWidget.config, metricSuffix: e.target.value },
                    })
                  }
                  placeholder={i18n.t('components.dashboard_editor.k14')}
                  sx={{ mb: 2 }}
                />
                <TextField
                  label={i18n.t('components.dashboard_editor.k43')}
                  fullWidth
                  value={selectedWidget.config.metricLabel || ''}
                  onChange={(e) =>
                    handleUpdateWidget(selectedWidget.id, {
                      config: { ...selectedWidget.config, metricLabel: e.target.value },
                    })
                  }
                  placeholder={i18n.t('components.dashboard_editor.k15')}
                />
              </>
            )}
          </Box>
        </Drawer>
      )}

      <Dialog
        open={showAddWidgetModal}
        onClose={() => setShowAddWidgetModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>{i18n.t('components.dashboard_editor.k44')}</DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <FormControl
            fullWidth
            sx={{ mb: 3 }}
          >
            <InputLabel>{i18n.t('components.dashboard_editor.k45')}</InputLabel>
            <Select
              value={newWidgetType}
              label={i18n.t('components.dashboard_editor.k46')}
              onChange={(e) => setNewWidgetType(e.target.value as 'chart' | 'pivot' | 'metric')}
            >
              {WIDGET_TYPES.map((type) => (
                <MenuItem
                  key={type.value}
                  value={type.value}
                >
                  {type.icon}
                  <span style={{ marginLeft: 8 }}>{type.label}</span>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {newWidgetType === 'chart' && (
            <FormControl
              fullWidth
              sx={{ mb: 3 }}
            >
              <InputLabel>{i18n.t('components.dashboard_editor.k47')}</InputLabel>
              <Select
                value={newWidgetChartType}
                label={i18n.t('components.dashboard_editor.k48')}
                onChange={(e) => setNewWidgetChartType(e.target.value as ChartType)}
              >
                {CHART_TYPES.map((type) => (
                  <MenuItem
                    key={type.value}
                    value={type.value}
                  >
                    {type.icon}
                    <span style={{ marginLeft: 8 }}>{type.label}</span>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddWidgetModal(false)}>
            {i18n.t('components.dashboard_editor.k49')}
          </Button>
          <Button
            variant='contained'
            onClick={handleAddWidget}
          >
            {i18n.t('components.dashboard_editor.k16')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DashboardEditor;
