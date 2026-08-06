import React from 'react';
import { Box as MuiBox, Typography, Paper, IconButton, Chip } from '@mui/material';
import { X } from 'lucide-react';
import type { DevicePoint, StorageLocation } from '../../../../api/gis';
import { designTokens } from '@/theme/tokens';

const ct = designTokens.colors;

interface DetailsPanelProps {
  selectedItem: DevicePoint | StorageLocation;
  onClose: () => void;
}

const formatCoordinate = (value: number) => {
  return value.toFixed(6);
};

const DetailsPanel: React.FC<DetailsPanelProps> = ({ selectedItem, onClose }) => {
  return (
    <Paper
      sx={{
        position: 'absolute',
        bottom: 16,
        left: 16,
        width: '320px',
        backgroundColor: 'common.white',
        borderRadius: 3,
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden',
        border: '1px solid grey.200',
      }}
    >
      <MuiBox
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          background: `linear-gradient(to right, ${ct.info[400]}, ${ct.primary.main})`,
        }}
      >
        <Typography
          variant='h6'
          sx={{ fontWeight: 'semibold', color: 'common.white' }}
        >
          详情信息
        </Typography>
        <IconButton
          onClick={onClose}
          sx={{
            padding: 0.5,
            '&:hover': {
              backgroundColor: 'action.disabledBackground',
            },
            borderRadius: 1,
          }}
          aria-label='关闭'
        >
          <X
            size={20}
            style={{ color: 'common.white' }}
          />
        </IconButton>
      </MuiBox>
      <MuiBox
        sx={{
          padding: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <MuiBox>
          <Typography
            variant='caption'
            sx={{ color: 'text.secondary', marginBottom: 0.5 }}
          >
            名称
          </Typography>
          <Typography
            variant='body1'
            sx={{ fontWeight: 'medium', color: 'text.primary' }}
          >
            {selectedItem.name}
          </Typography>
        </MuiBox>
        {'device_type' in selectedItem && (
          <MuiBox>
            <Typography
              variant='caption'
              sx={{ color: 'text.secondary', marginBottom: 0.5 }}
            >
              设备类型
            </Typography>
            <Typography
              variant='body2'
              sx={{ color: 'grey.700' }}
            >
              {selectedItem.device_type}
            </Typography>
          </MuiBox>
        )}
        {'location_type' in selectedItem && (
          <MuiBox>
            <Typography
              variant='caption'
              sx={{ color: 'text.secondary', marginBottom: 0.5 }}
            >
              位置类型
            </Typography>
            <Typography
              variant='body2'
              sx={{ color: 'grey.700' }}
            >
              {selectedItem.location_type}
            </Typography>
          </MuiBox>
        )}
        {'status' in selectedItem && (
          <MuiBox>
            <Typography
              variant='caption'
              sx={{ color: 'text.secondary', marginBottom: 0.5 }}
            >
              状态
            </Typography>
            <Chip
              label={selectedItem.status}
              size='small'
              sx={{
                backgroundColor:
                  selectedItem.status.toLowerCase().includes('active') ||
                  selectedItem.status.includes('启用')
                    ? ct.success[50]
                    : selectedItem.status.toLowerCase().includes('pending') ||
                        selectedItem.status.includes('待处理')
                      ? ct.warning[100]
                      : ct.error[50],
                color:
                  selectedItem.status.toLowerCase().includes('active') ||
                  selectedItem.status.includes('启用')
                    ? ct.success[800]
                    : selectedItem.status.toLowerCase().includes('pending') ||
                        selectedItem.status.includes('待处理')
                      ? ct.warning[800]
                      : ct.error[800],
                fontWeight: 'medium',
              }}
            />
          </MuiBox>
        )}
        {'capacity' in selectedItem && selectedItem.capacity !== undefined && (
          <MuiBox>
            <Typography
              variant='caption'
              sx={{ color: 'text.secondary', marginBottom: 0.5 }}
            >
              容量
            </Typography>
            <Typography
              variant='body2'
              sx={{ color: 'grey.700' }}
            >
              {selectedItem.capacity}
            </Typography>
          </MuiBox>
        )}
        {'current_usage' in selectedItem && selectedItem.current_usage !== undefined && (
          <MuiBox>
            <Typography
              variant='caption'
              sx={{ color: 'text.secondary', marginBottom: 0.5 }}
            >
              当前用量
            </Typography>
            <Typography
              variant='body2'
              sx={{ color: 'grey.700' }}
            >
              {selectedItem.current_usage}
            </Typography>
          </MuiBox>
        )}
        {'description' in selectedItem && selectedItem.description && (
          <MuiBox>
            <Typography
              variant='caption'
              sx={{ color: 'text.secondary', marginBottom: 0.5 }}
            >
              描述
            </Typography>
            <Typography
              variant='body2'
              sx={{ color: 'text.secondary' }}
            >
              {selectedItem.description}
            </Typography>
          </MuiBox>
        )}
        <MuiBox sx={{ paddingTop: 1, borderTop: '1px solid grey.200' }}>
          <Typography
            variant='caption'
            sx={{ color: 'text.secondary', marginBottom: 0.5 }}
          >
            坐标
          </Typography>
          <Typography
            variant='body2'
            sx={{ color: 'grey.700', fontFamily: 'monospace' }}
          >
            {formatCoordinate(selectedItem.latitude)}, {formatCoordinate(selectedItem.longitude)}
          </Typography>
        </MuiBox>
      </MuiBox>
    </Paper>
  );
};

export default DetailsPanel;
