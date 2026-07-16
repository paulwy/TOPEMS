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
import type { ToolMode } from '../types';

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
        backgroundColor: 'white',
        borderRadius: 2,
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden',
      }}
    >
      <MuiBox sx={{ padding: '12px', borderBottom: '1px solid grey.100' }}>
        <Typography
          variant='caption'
          sx={{ fontWeight: 'medium', color: 'text.secondary' }}
        >
          工具
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
            backgroundColor: toolMode === 'select' ? 'primary.main' : 'white',
            color: toolMode === 'select' ? 'white' : 'grey.700',
            '&:hover': {
              backgroundColor: toolMode === 'select' ? 'primary.dark' : 'grey.50',
            },
            fontSize: '0.75rem',
          }}
          title='选择工具'
        >
          <MuiBox
            sx={{
              width: 16,
              height: 16,
              border: '2px solid grey.700',
              borderRadius: 1,
            }}
          />
          选择
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
            backgroundColor: toolMode === 'measure-distance' ? 'primary.main' : 'white',
            color: toolMode === 'measure-distance' ? 'white' : 'grey.700',
            '&:hover': {
              backgroundColor: toolMode === 'measure-distance' ? 'primary.dark' : 'grey.50',
            },
            fontSize: '0.75rem',
          }}
          title='距离测量'
        >
          <Ruler size={16} />
          测距
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
            backgroundColor: toolMode === 'measure-area' ? 'primary.main' : 'white',
            color: toolMode === 'measure-area' ? 'white' : 'grey.700',
            '&:hover': {
              backgroundColor: toolMode === 'measure-area' ? 'primary.dark' : 'grey.50',
            },
            fontSize: '0.75rem',
          }}
          title='面积测量'
        >
          <Ruler size={16} />
          测面积
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
            backgroundColor: toolMode === 'draw-point' ? 'primary.main' : 'white',
            color: toolMode === 'draw-point' ? 'white' : 'grey.700',
            '&:hover': {
              backgroundColor: toolMode === 'draw-point' ? 'primary.dark' : 'grey.50',
            },
            fontSize: '0.75rem',
          }}
          title='绘制点'
        >
          <Pencil size={16} />
          绘点
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
            backgroundColor: toolMode === 'draw-line' ? 'primary.main' : 'white',
            color: toolMode === 'draw-line' ? 'white' : 'grey.700',
            '&:hover': {
              backgroundColor: toolMode === 'draw-line' ? 'primary.dark' : 'grey.50',
            },
            fontSize: '0.75rem',
          }}
          title='绘制线'
        >
          <Pencil size={16} />
          绘线
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
            backgroundColor: toolMode === 'draw-polygon' ? 'primary.main' : 'white',
            color: toolMode === 'draw-polygon' ? 'white' : 'grey.700',
            '&:hover': {
              backgroundColor: toolMode === 'draw-polygon' ? 'primary.dark' : 'grey.50',
            },
            fontSize: '0.75rem',
          }}
          title='绘制多边形'
        >
          <Pencil size={16} />
          绘多边形
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
              fontSize: '0.75rem',
            }}
            title='清除测量'
          >
            <Eraser size={16} />
            清除
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
              fontSize: '0.75rem',
            }}
            title='清除所有绘制'
          >
            <Trash2 size={16} />
            清除绘制
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
              fontSize: '0.75rem',
            }}
            title='完成绘制 (Enter)'
          >
            完成绘制
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
            backgroundColor: showTrackPanel ? 'secondary.main' : 'white',
            color: showTrackPanel ? 'white' : 'grey.700',
            '&:hover': {
              backgroundColor: showTrackPanel ? 'secondary.dark' : 'grey.50',
            },
            fontSize: '0.75rem',
          }}
          title='设备轨迹追踪'
        >
          <PlayCircle size={16} />
          轨迹追踪
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
            fontSize: '0.75rem',
          }}
          title='导出GeoJSON'
        >
          <Download size={16} />
          导出GeoJSON
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
            fontSize: '0.75rem',
          }}
          title='导出绘制图形'
        >
          <FileJson size={16} />
          导出绘制图形
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
            backgroundColor: mapType === 'amap' ? 'primary.main' : 'white',
            color: mapType === 'amap' ? 'white' : 'grey.700',
            '&:hover': {
              backgroundColor: mapType === 'amap' ? 'primary.dark' : 'grey.50',
            },
            fontSize: '0.75rem',
          }}
          title='切换地图'
        >
          <Globe size={16} />
          {mapType === 'osm' ? '切换高德' : '切换OSM'}
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
            backgroundColor: showHeatmap ? 'error.main' : 'white',
            color: showHeatmap ? 'white' : 'grey.700',
            '&:hover': {
              backgroundColor: showHeatmap ? 'error.dark' : 'grey.50',
            },
            fontSize: '0.75rem',
          }}
          title='热力图'
        >
          <Thermometer size={16} />
          热力图
        </Button>
        {showHeatmap && (
          <MuiBox
            sx={{
              padding: '4px 8px',
              display: 'flex',
              flexDirection: 'column',
              gap: 0.5,
            }}
          >
            <Button
              fullWidth
              onClick={() => setHeatmapMode('density')}
              sx={{
                padding: '6px',
                borderRadius: 1,
                textAlign: 'left',
                backgroundColor: heatmapMode === 'density' ? 'error.lighter' : 'transparent',
                color: heatmapMode === 'density' ? 'error.darker' : 'text.secondary',
                '&:hover': {
                  backgroundColor: heatmapMode === 'density' ? 'error.light' : 'grey.100',
                },
                fontSize: '0.75rem',
              }}
            >
              密度模式
            </Button>
            <Button
              fullWidth
              onClick={() => setHeatmapMode('status')}
              sx={{
                padding: '6px',
                borderRadius: 1,
                textAlign: 'left',
                backgroundColor: heatmapMode === 'status' ? 'error.lighter' : 'transparent',
                color: heatmapMode === 'status' ? 'error.darker' : 'text.secondary',
                '&:hover': {
                  backgroundColor: heatmapMode === 'status' ? 'error.light' : 'grey.100',
                },
                fontSize: '0.75rem',
              }}
            >
              状态模式
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
            backgroundColor: show3DView ? 'primary.main' : 'white',
            color: show3DView ? 'white' : 'grey.700',
            '&:hover': {
              backgroundColor: show3DView ? 'secondary.700' : 'grey.50',
            },
            fontSize: '0.75rem',
          }}
          title='3D视图'
        >
          <Box size={16} />
          3D视图
        </Button>
      </MuiBox>
    </Paper>
  );
};

export default Toolbar;
