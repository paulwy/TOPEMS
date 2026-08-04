import React from 'react';
import { Box as MuiBox, Typography, Paper, Button, useTheme } from '@mui/material';
import { Layers, ChevronUp, ChevronDown, MapPin, Navigation, Info, Pencil } from 'lucide-react';
import LayerToggle from './LayerToggle';
import type { VisibleLayers } from '../types';
import { designTokens } from '@/theme/tokens';

const ct = designTokens.colors;

interface LayerPanelProps {
  showLayerPanel: boolean;
  setShowLayerPanel: (show: boolean) => void;
  visibleLayers: VisibleLayers;
  toggleLayer: (layer: 'devices' | 'pipelines' | 'storage') => void;
  drawFeaturesLength: number;
}

const LayerPanel: React.FC<LayerPanelProps> = ({
  showLayerPanel,
  setShowLayerPanel,
  visibleLayers,
  toggleLayer,
  drawFeaturesLength,
}) => {
  const theme = useTheme();

  return (
    <Paper
      sx={{
        position: 'absolute',
        top: 16,
        right: 16,
        backgroundColor: 'common.white',
        borderRadius: 2,
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden',
      }}
    >
      <Button
        fullWidth
        onClick={() => setShowLayerPanel(!showLayerPanel)}
        sx={{
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          '&:hover': {
            backgroundColor: 'grey.50',
          },
        }}
      >
        <MuiBox sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Layers
            size={20}
            style={{ color: 'var(--mui-palette-text-secondary)' }}
          />
          <Typography
            variant='body2'
            sx={{ fontWeight: 'medium', color: 'grey.700' }}
          >
            图层
          </Typography>
        </MuiBox>
        {showLayerPanel ? (
          <ChevronUp
            size={16}
            style={{ color: theme.palette.text.secondary }}
          />
        ) : (
          <ChevronDown
            size={16}
            style={{ color: theme.palette.text.secondary }}
          />
        )}
      </Button>
      {showLayerPanel && (
        <MuiBox
          sx={{
            padding: 1.5,
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            borderTop: '1px solid grey.200',
          }}
        >
          <LayerToggle
            label='设备点位'
            icon={<MapPin size={16} />}
            checked={visibleLayers.devices}
            onChange={() => toggleLayer('devices')}
            color={ct.success.main}
          />
          <LayerToggle
            label='管线'
            icon={<Navigation size={16} />}
            checked={visibleLayers.pipelines}
            onChange={() => toggleLayer('pipelines')}
            color={ct.secondary[400]}
          />
          <LayerToggle
            label='仓储位置'
            icon={<Info size={16} />}
            checked={visibleLayers.storage}
            onChange={() => toggleLayer('storage')}
            color='warning.main'
          />
          {drawFeaturesLength > 0 && (
            <MuiBox
              sx={{
                borderTop: '1px solid grey.200',
                paddingTop: 1,
                marginTop: 1,
              }}
            >
              <LayerToggle
                label='绘制图形'
                icon={<Pencil size={16} />}
                checked={true}
                onChange={() => {}}
                color='error.main'
              />
            </MuiBox>
          )}
        </MuiBox>
      )}
    </Paper>
  );
};

export default LayerPanel;
