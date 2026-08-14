// modules/MapModule/LayerManager.tsx
import React from 'react';
import { Layers, ChevronDown, ChevronUp, MapPin, Navigation, Info, Pencil } from 'lucide-react';
import { Box, Typography, Paper, Button } from '@mui/material';
import { designTokens, semanticTokens } from '@topems/tokens';

interface LayerToggleProps {
  label: string;
  icon?: React.ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  color: string;
}

const LayerToggle: React.FC<LayerToggleProps> = ({ label, icon: _, checked, onChange, color }) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 2,
      cursor: 'pointer',
      '&:hover': { bgcolor: 'grey.50' },
      px: 2,
      py: 1,
      borderRadius: 1,
    }}
    onClick={() => onChange(!checked)}
  >
    <Box
      sx={{
        width: 12,
        height: 12,
        borderRadius: '50%',
        bgcolor: checked ? color : 'grey.300',
      }}
    />
    <Typography
      variant='body2'
      sx={{ color: 'grey.700' }}
    >
      {label}
    </Typography>
  </Box>
);

interface LayerManagerProps {
  visibleLayers: {
    devices: boolean;
    pipelines: boolean;
    storage: boolean;
  };
  onToggleLayer: (layer: 'devices' | 'pipelines' | 'storage') => void;
  showPanel: boolean;
  onTogglePanel: () => void;
  drawFeaturesLength?: number;
}

const LayerManager: React.FC<LayerManagerProps> = ({
  visibleLayers,
  onToggleLayer,
  showPanel,
  onTogglePanel,
  drawFeaturesLength = 0,
}) => {
  return (
    <Paper
      sx={{
        position: 'absolute',
        top: 16,
        right: 16,
        borderRadius: 2,
        boxShadow: 2,
        overflow: 'hidden',
      }}
    >
      <Button
        onClick={onTogglePanel}
        sx={{
          width: '100%',
          px: 4,
          py: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          '&:hover': { bgcolor: 'grey.50' },
          textTransform: 'none',
          bgcolor: 'transparent',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Layers
            size={20}
            style={{ color: 'var(--mui-palette-text-secondary)' }}
          />
          <Typography
            variant='body2'
            sx={{ fontWeight: 500, color: 'grey.700' }}
          >
            图层
          </Typography>
        </Box>
        {showPanel ? (
          <ChevronUp
            size={16}
            style={{ color: 'text.secondary' }}
          />
        ) : (
          <ChevronDown
            size={16}
            style={{ color: 'text.secondary' }}
          />
        )}
      </Button>
      {showPanel && (
        <Box sx={{ px: 3, py: 3, borderTop: 1, borderColor: 'grey.200' }}>
          <LayerToggle
            label='设备点位'
            icon={<MapPin size={16} />}
            checked={visibleLayers.devices}
            onChange={() => onToggleLayer('devices')}
            color='#00C897'
          />
          <LayerToggle
            label='管线'
            icon={<Navigation size={16} />}
            checked={visibleLayers.pipelines}
            onChange={() => onToggleLayer('pipelines')}
            color={designTokens.colors.secondary.dark}
          />
          <LayerToggle
            label='仓储位置'
            icon={<Info size={16} />}
            checked={visibleLayers.storage}
            onChange={() => onToggleLayer('storage')}
            color='warning.main'
          />
          {drawFeaturesLength > 0 && (
            <Box sx={{ borderTop: 1, borderColor: 'grey.200', pt: 2, mt: 2 }}>
              <LayerToggle
                label='绘制图形'
                icon={<Pencil size={16} />}
                checked={true}
                onChange={() => {}}
                color='error.main'
              />
            </Box>
          )}
        </Box>
      )}
    </Paper>
  );
};

export default LayerManager;
