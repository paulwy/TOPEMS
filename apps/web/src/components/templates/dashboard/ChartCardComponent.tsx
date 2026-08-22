import { designTokens } from '@topems/tokens';
import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  Skeleton,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import i18n from '@/i18n';
import { MoreVertical, RefreshCw, Download, Maximize, ChevronDown } from 'lucide-react';
import type { ChartCard as ChartCardType } from './types';

export const ChartCardComponent: React.FC<ChartCardType> = ({
  title,
  subtitle,
  chart,
  height = 400,
  actions,
  type,
  onRefresh,
  onDownload,
  onFullscreen,
  loading,
  error,
  variant = 'elevation',
  expandable,
  defaultExpanded = true,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  return (
    <Paper
      variant={variant}
      sx={{
        borderRadius: 3,
        height: expandable && !expanded ? 'auto' : height,
        display: 'flex',
        flexDirection: 'column',
        transition: 'height 0.3s ease',
      }}
    >
      <Box
        sx={{
          p: 2,
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography
              variant='subtitle1'
              sx={{ fontWeight: 600 }}
            >
              {title}
            </Typography>
            {type && (
              <Chip
                label={type}
                size='small'
                sx={{ height: 20, fontSize: designTokens.typography.fontSize.scale['0.65rem'] }}
              />
            )}
          </Box>
          {subtitle && (
            <Typography
              variant='caption'
              color='text.secondary'
            >
              {subtitle}
            </Typography>
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {actions}
          {(onRefresh || onDownload || onFullscreen || expandable) && (
            <>
              {expandable && (
                <IconButton
                  size='small'
                  onClick={() => setExpanded(!expanded)}
                  sx={{
                    transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.3s',
                  }}
                  aria-label={i18n.t('templates.chart_card_component.k0')}
                >
                  <ChevronDown style={{ width: 18, height: 18 }} />
                </IconButton>
              )}
              <IconButton
                size='small'
                onClick={(e) => setAnchorEl(e.currentTarget)}
                aria-label={i18n.t('templates.chart_card_component.k1')}
              >
                <MoreVertical style={{ width: 18, height: 18 }} />
              </IconButton>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => setAnchorEl(null)}
              >
                {onRefresh && (
                  <MenuItem
                    onClick={() => {
                      setAnchorEl(null);
                      onRefresh();
                    }}
                  >
                    <ListItemIcon>
                      <RefreshCw style={{ width: 18, height: 18 }} />
                    </ListItemIcon>
                    <ListItemText>{i18n.t('templates.chart_card_component.k2')}</ListItemText>
                  </MenuItem>
                )}
                {onDownload && (
                  <MenuItem
                    onClick={() => {
                      setAnchorEl(null);
                      onDownload();
                    }}
                  >
                    <ListItemIcon>
                      <Download style={{ width: 18, height: 18 }} />
                    </ListItemIcon>
                    <ListItemText>{i18n.t('templates.chart_card_component.k3')}</ListItemText>
                  </MenuItem>
                )}
                {onFullscreen && (
                  <MenuItem
                    onClick={() => {
                      setAnchorEl(null);
                      onFullscreen();
                    }}
                  >
                    <ListItemIcon>
                      <Maximize style={{ width: 18, height: 18 }} />
                    </ListItemIcon>
                    <ListItemText>{i18n.t('templates.chart_card_component.k4')}</ListItemText>
                  </MenuItem>
                )}
              </Menu>
            </>
          )}
        </Box>
      </Box>
      {(!expandable || expanded) && (
        <Box sx={{ p: 2, flex: 1, overflow: 'hidden' }}>
          {loading ? (
            <Skeleton
              variant='rectangular'
              width='100%'
              height='100%'
            />
          ) : error ? (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: 'error.main',
              }}
            >
              <Typography>{error}</Typography>
            </Box>
          ) : (
            chart
          )}
        </Box>
      )}
    </Paper>
  );
};
