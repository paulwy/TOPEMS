import React from 'react';
import { Box as MuiBox, Typography, Paper, Button } from '@mui/material';
import {
  Ruler,
  Pencil,
  Eraser,
  Trash2,
  PlayCircle,
  Download,
  FileJson,
  Globe,
  Thermometer,
  Box,
} from 'lucide-react';
import i18n from '@/i18n';
import type { ToolMode } from '../types';
import { designTokens, semanticTokens } from '@topems/tokens';

interface ToolbarProps {
  toolMode: ToolMode;
  drawFeaturesLength: number;
  currentDrawing: boolean;
  showTrackPanel: boolean;
  showHeatmap: boolean;
  heatmapMode: 'density' | 'status';
  show3DView: boolean;
  mapType: 'osm' | 'amap';
  setTool: (tool: ToolMode) => void;
  clearMeasure: () => void;
  clearDrawings: () => void;
  finishDrawing: () => void;
  setShowTrackPanel: (show: boolean) => void;
  exportGeoJSON: (drawOnly?: boolean) => void;
  handleSetMapType: (type: 'osm' | 'amap') => void;
  setShowHeatmap: (show: boolean) => void;
  setHeatmapMode: (mode: 'density' | 'status') => void;
  setShow3DView: (show: boolean) => void;
}

const Toolbar: React.FC<ToolbarProps> = ({
  toolMode,
  drawFeaturesLength,
  currentDrawing,
  showTrackPanel,
  showHeatmap,
  heatmapMode,
  show3DView,
  mapType,
  setTool,
  clearMeasure,
  clearDrawings,
  finishDrawing,
  setShowTrackPanel,
  exportGeoJSON,
  handleSetMapType,
  setShowHeatmap,
  setHeatmapMode,
  setShow3DView,
}) => {
  return (
    <Paper
      sx={{
        position: 'absolute',
        top: 16,
        left: 16,
        backgroundColor: 'common.white',
        borderRadius: 2,
        boxShadow: designTokens.shadows.md,
        overflow: 'hidden',
      }}
    >
      <MuiBox sx={{ padding: 1.5, borderBottom: '1px solid grey.100' }}>
        <Typography
          variant='caption'
          sx={{ fontWeight: 'medium', color: 'text.secondary' }}
        >
          {i18n.t('components.toolbar.k0')}
        </Typography>
      </MuiBox>
      <MuiBox
        sx={{
          padding: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 0.5,
        }}
      >
        <Button
          fullWidth
          onClick={() => setTool('select')}
          sx={{
            padding: 1,
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            backgroundColor:
              toolMode === 'select' ? 'primary.main' : 'var(--color-primary-foreground)',
            color: toolMode === 'select' ? 'var(--color-primary-foreground)' : 'grey.700',
            '&:hover': {
              backgroundColor: toolMode === 'select' ? 'primary.dark' : 'grey.50',
            },
            fontSize: designTokens.typography.fontSize.scale['0.75rem'],
          }}
          title={i18n.t('components.toolbar.k0')}
        >
          <MuiBox
            sx={{
              width: 16,
              height: 16,
              border: '2px solid grey.700',
              borderRadius: 1,
            }}
          />
          {i18n.t('components.toolbar.k1')}
        </Button>
        <Button
          fullWidth
          onClick={() => setTool('measure-distance')}
          sx={{
            padding: 1,
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            backgroundColor:
              toolMode === 'measure-distance'
                ? 'primary.main'
                : 'var(--color-primary-foreground)',
            color:
              toolMode === 'measure-distance'
                ? 'var(--color-primary-foreground)'
                : 'grey.700',
            '&:hover': {
              backgroundColor: toolMode === 'measure-distance' ? 'primary.dark' : 'grey.50',
            },
            fontSize: designTokens.typography.fontSize.scale['0.75rem'],
          }}
          title={i18n.t('components.toolbar.k1')}
        >
          <Ruler size={16} />
          {i18n.t('components.toolbar.k2')}
        </Button>
        <Button
          fullWidth
          onClick={() => setTool('measure-area')}
          sx={{
            padding: 1,
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            backgroundColor:
              toolMode === 'measure-area'
                ? 'primary.main'
                : 'var(--color-primary-foreground)',
            color:
              toolMode === 'measure-area' ? 'var(--color-primary-foreground)' : 'grey.700',
            '&:hover': {
              backgroundColor: toolMode === 'measure-area' ? 'primary.dark' : 'grey.50',
            },
            fontSize: designTokens.typography.fontSize.scale['0.75rem'],
          }}
          title={i18n.t('components.toolbar.k2')}
        >
          <Ruler size={16} />
          {i18n.t('components.toolbar.k3')}
        </Button>
        <MuiBox sx={{ borderTop: '1px solid grey.100', my: 1 }} />
        <Button
          fullWidth
          onClick={() => setTool('draw-point')}
          sx={{
            padding: 1,
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            backgroundColor:
              toolMode === 'draw-point'
                ? 'primary.main'
                : 'var(--color-primary-foreground)',
            color:
              toolMode === 'draw-point' ? 'var(--color-primary-foreground)' : 'grey.700',
            '&:hover': {
              backgroundColor: toolMode === 'draw-point' ? 'primary.dark' : 'grey.50',
            },
            fontSize: designTokens.typography.fontSize.scale['0.75rem'],
          }}
          title={i18n.t('components.toolbar.k3')}
        >
          <Pencil size={16} />
          {i18n.t('components.toolbar.k4')}
        </Button>
        <Button
          fullWidth
          onClick={() => setTool('draw-line')}
          sx={{
            padding: 1,
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            backgroundColor:
              toolMode === 'draw-line'
                ? 'primary.main'
                : 'var(--color-primary-foreground)',
            color:
              toolMode === 'draw-line' ? 'var(--color-primary-foreground)' : 'grey.700',
            '&:hover': {
              backgroundColor: toolMode === 'draw-line' ? 'primary.dark' : 'grey.50',
            },
            fontSize: designTokens.typography.fontSize.scale['0.75rem'],
          }}
          title={i18n.t('components.toolbar.k4')}
        >
          <Pencil size={16} />
          {i18n.t('components.toolbar.k5')}
        </Button>
        <Button
          fullWidth
          onClick={() => setTool('draw-polygon')}
          sx={{
            padding: 1,
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            backgroundColor:
              toolMode === 'draw-polygon'
                ? 'primary.main'
                : 'var(--color-primary-foreground)',
            color:
              toolMode === 'draw-polygon' ? 'var(--color-primary-foreground)' : 'grey.700',
            '&:hover': {
              backgroundColor: toolMode === 'draw-polygon' ? 'primary.dark' : 'grey.50',
            },
            fontSize: designTokens.typography.fontSize.scale['0.75rem'],
          }}
          title={i18n.t('components.toolbar.k5')}
        >
          <Pencil size={16} />
          {i18n.t('components.toolbar.k6')}
        </Button>
        <MuiBox sx={{ borderTop: '1px solid grey.100', my: 1 }} />
        {(toolMode === 'measure-distance' || toolMode === 'measure-area') && (
          <Button
            fullWidth
            onClick={clearMeasure}
            sx={{
              padding: 1,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              backgroundColor: 'grey.100',
              color: 'grey.700',
              '&:hover': {
                backgroundColor: 'grey.200',
              },
              fontSize: designTokens.typography.fontSize.scale['0.75rem'],
            }}
            title={i18n.t('components.toolbar.k6')}
          >
            <Eraser size={16} />
            {i18n.t('components.toolbar.k7')}
          </Button>
        )}
        {drawFeaturesLength > 0 && (
          <Button
            fullWidth
            onClick={clearDrawings}
            sx={{
              padding: 1,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              backgroundColor: 'error.lighter',
              color: 'error.dark',
              '&:hover': {
                backgroundColor: 'error.light',
              },
              fontSize: designTokens.typography.fontSize.scale['0.75rem'],
            }}
            title={i18n.t('components.toolbar.k7')}
          >
            <Trash2 size={16} />
            {i18n.t('components.toolbar.k8')}
          </Button>
        )}
        {currentDrawing && (
          <Button
            fullWidth
            onClick={finishDrawing}
            sx={{
              padding: 1,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              backgroundColor: 'success.lighter',
              color: 'success.dark',
              '&:hover': {
                backgroundColor: 'success.light',
              },
              fontSize: designTokens.typography.fontSize.scale['0.75rem'],
            }}
            title={i18n.t('components.toolbar.enter_8')}
          >
            {i18n.t('components.toolbar.k9')}
          </Button>
        )}
        <MuiBox sx={{ borderTop: '1px solid grey.100', my: 1 }} />
        <Button
          fullWidth
          onClick={() => {
            setShowTrackPanel(true);
            setTool('select');
          }}
          sx={{
            padding: 1,
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            backgroundColor: showTrackPanel
              ? 'secondary.main'
              : 'var(--color-primary-foreground)',
            color: showTrackPanel ? 'var(--color-primary-foreground)' : 'grey.700',
            '&:hover': {
              backgroundColor: showTrackPanel ? 'secondary.dark' : 'grey.50',
            },
            fontSize: designTokens.typography.fontSize.scale['0.75rem'],
          }}
          title={i18n.t('components.toolbar.k9')}
        >
          <PlayCircle size={16} />
          {i18n.t('components.toolbar.k10')}
        </Button>
        <MuiBox sx={{ borderTop: '1px solid grey.100', my: 1 }} />
        <Button
          fullWidth
          onClick={() => exportGeoJSON()}
          sx={{
            padding: 1,
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            backgroundColor: 'primary.100',
            color: 'primary.dark',
            '&:hover': {
              backgroundColor: 'primary.light',
            },
            fontSize: designTokens.typography.fontSize.scale['0.75rem'],
          }}
          title={i18n.t('components.toolbar.geojson_10')}
        >
          <Download size={16} />
          {i18n.t('components.toolbar.geojson_11')}
        </Button>
        <Button
          fullWidth
          onClick={() => exportGeoJSON(true)}
          sx={{
            padding: 1,
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            backgroundColor: 'secondary.light',
            color: 'primary.main',
            '&:hover': {
              backgroundColor: 'secondary.main',
            },
            fontSize: designTokens.typography.fontSize.scale['0.75rem'],
          }}
          title={i18n.t('components.toolbar.k11')}
        >
          <FileJson size={16} />
          {i18n.t('components.toolbar.k12')}
        </Button>
        <MuiBox sx={{ borderTop: '1px solid grey.100', my: 1 }} />
        <Button
          fullWidth
          onClick={() => handleSetMapType(mapType === 'osm' ? 'amap' : 'osm')}
          sx={{
            padding: 1,
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            backgroundColor:
              mapType === 'amap' ? 'primary.main' : 'var(--color-primary-foreground)',
            color: mapType === 'amap' ? 'var(--color-primary-foreground)' : 'grey.700',
            '&:hover': {
              backgroundColor: mapType === 'amap' ? 'primary.dark' : 'grey.50',
            },
            fontSize: designTokens.typography.fontSize.scale['0.75rem'],
          }}
          title={i18n.t('components.toolbar.k12')}
        >
          <Globe size={16} />
          {mapType === 'osm'
            ? i18n.t('components.toolbar.k14')
            : i18n.t('components.toolbar.osm_13')}
        </Button>
        <MuiBox sx={{ borderTop: '1px solid grey.100', my: 1 }} />
        <Button
          fullWidth
          onClick={() => setShowHeatmap(!showHeatmap)}
          sx={{
            padding: 1,
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            backgroundColor: showHeatmap
              ? 'error.main'
              : 'var(--color-primary-foreground)',
            color: showHeatmap ? 'var(--color-primary-foreground)' : 'grey.700',
            '&:hover': {
              backgroundColor: showHeatmap ? 'error.dark' : 'grey.50',
            },
            fontSize: designTokens.typography.fontSize.scale['0.75rem'],
          }}
          title={i18n.t('components.toolbar.k15')}
        >
          <Thermometer size={16} />
          {i18n.t('components.toolbar.k13')}
        </Button>
        {showHeatmap && (
          <MuiBox
            sx={{
              padding: `${designTokens.spacing.xs}px ${designTokens.spacing.sm}px`,
              display: 'flex',
              flexDirection: 'column',
              gap: 0.5,
            }}
          >
            <Button
              fullWidth
              onClick={() => setHeatmapMode('density')}
              sx={{
                padding: 1.5,
                borderRadius: 1,
                textAlign: 'left',
                backgroundColor: heatmapMode === 'density' ? 'error.lighter' : 'transparent',
                color: heatmapMode === 'density' ? 'error.darker' : 'text.secondary',
                '&:hover': {
                  backgroundColor: heatmapMode === 'density' ? 'error.light' : 'grey.100',
                },
                fontSize: designTokens.typography.fontSize.scale['0.75rem'],
              }}
            >
              {i18n.t('components.toolbar.k14')}
            </Button>
            <Button
              fullWidth
              onClick={() => setHeatmapMode('status')}
              sx={{
                padding: 1.5,
                borderRadius: 1,
                textAlign: 'left',
                backgroundColor: heatmapMode === 'status' ? 'error.lighter' : 'transparent',
                color: heatmapMode === 'status' ? 'error.darker' : 'text.secondary',
                '&:hover': {
                  backgroundColor: heatmapMode === 'status' ? 'error.light' : 'grey.100',
                },
                fontSize: designTokens.typography.fontSize.scale['0.75rem'],
              }}
            >
              {i18n.t('components.toolbar.k15')}
            </Button>
          </MuiBox>
        )}
        <Button
          fullWidth
          onClick={() => {
            setShow3DView(true);
            setTool('select');
          }}
          sx={{
            padding: 1,
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            backgroundColor: show3DView
              ? 'primary.main'
              : 'var(--color-primary-foreground)',
            color: show3DView ? 'var(--color-primary-foreground)' : 'grey.700',
            '&:hover': {
              backgroundColor: show3DView ? 'secondary.700' : 'grey.50',
            },
            fontSize: designTokens.typography.fontSize.scale['0.75rem'],
          }}
          title={i18n.t('components.toolbar.3d_16')}
        >
          <Box size={16} />
          {i18n.t('components.toolbar.3d_17')}
        </Button>
      </MuiBox>
    </Paper>
  );
};

export default Toolbar;
