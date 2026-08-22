import { designTokens } from '@topems/tokens';
/**
 * PropertyPanel — 属性面板
 *
 * 编辑选中节点的属性。
 * 根据组件的 propsPanel 配置渲染不同类型的表单控件。
 */

import React from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Divider,
  Alert,
} from '@mui/material';
import type { CanvasNode, PropertyPanelConfig } from './types';
import { getComponentByType } from './types';
import i18n from '@/i18n';

interface PropertyPanelProps {
  node: CanvasNode | null;
  onUpdateProp: (key: string, value: unknown) => void;
  onUpdateLabel: (label: string) => void;
}

export function PropertyPanel({ node, onUpdateProp, onUpdateLabel }: PropertyPanelProps) {
  if (!node) {
    return (
      <Paper
        elevation={1}
        sx={{
          width: 280,
          height: '100%',
          p: 2,
          borderRadius: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography
          variant='body2'
          sx={{ color: 'text.secondary', textAlign: 'center' }}
        >
          {i18n.t('components.property_panel.k0')}
          <br />
          {i18n.t('components.property_panel.k1')}
        </Typography>
      </Paper>
    );
  }

  const comp = getComponentByType(node.type);
  const propsPanel = comp?.propsPanel ?? [];

  const handleChange = (config: PropertyPanelConfig, value: unknown) => {
    onUpdateProp(config.key, value);
    if (config.key === 'label') {
      onUpdateLabel(String(value ?? ''));
    }
  };

  const renderField = (config: PropertyPanelConfig) => {
    const value = node.props[config.key] ?? config.defaultValue ?? '';

    const commonProps = {
      fullWidth: true,
      size: 'small' as const,
      label: config.label,
      helperText: config.description,
    };

    switch (config.type) {
      case 'text':
      case 'textarea':
        return (
          <TextField
            {...commonProps}
            type='text'
            value={String(value)}
            multiline={config.type === 'textarea'}
            rows={config.type === 'textarea' ? 3 : undefined}
            onChange={(e) => handleChange(config, e.target.value)}
            required={config.required}
            size='small'
          />
        );

      case 'number':
        return (
          <TextField
            {...commonProps}
            type='number'
            value={Number(value)}
            onChange={(e) => handleChange(config, Number(e.target.value))}
            required={config.required}
            size='small'
          />
        );

      case 'boolean':
        return (
          <FormControlLabel
            control={
              <Switch
                checked={Boolean(value)}
                onChange={(e) => handleChange(config, e.target.checked)}
                size='small'
              />
            }
            label={config.label}
          />
        );

      case 'select':
        return (
          <FormControl
            fullWidth
            size='small'
          >
            <InputLabel>{config.label}</InputLabel>
            <Select
              value={String(value)}
              label={config.label}
              onChange={(e) => handleChange(config, e.target.value)}
            >
              {config.options?.map((opt) => (
                <MenuItem
                  key={opt.value}
                  value={opt.value}
                >
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );

      case 'color':
        return (
          <TextField
            {...commonProps}
            type='color'
            value={String(value)}
            onChange={(e) => handleChange(config, e.target.value)}
            size='small'
          />
        );

      case 'code':
        return (
          <TextField
            {...commonProps}
            type='text'
            value={String(value)}
            multiline
            rows={4}
            onChange={(e) => handleChange(config, e.target.value)}
            size='small'
            sx={{ fontFamily: 'monospace', fontSize: designTokens.typography.fontSize.scale['0.75rem'] }}
          />
        );

      default:
        return (
          <TextField
            {...commonProps}
            value={String(value)}
            onChange={(e) => handleChange(config, e.target.value)}
            size='small'
          />
        );
    }
  };

  const basicProps = propsPanel.filter((p) => !p.advanced);
  const advancedProps = propsPanel.filter((p) => p.advanced);

  return (
    <Paper
      elevation={1}
      sx={{
        width: 280,
        height: '100%',
        overflow: 'auto',
        p: 2,
        borderRadius: 2,
      }}
    >
      <Typography
        variant='subtitle2'
        sx={{ mb: 1, fontWeight: 600 }}
      >
        {i18n.t('components.property_panel.k2')}
      </Typography>

      <Box sx={{ mb: 2 }}>
        <Typography
          variant='caption'
          sx={{ color: 'text.secondary' }}
        >
          {i18n.t('components.property_panel.k3')}
        </Typography>
        <Typography
          variant='body2'
          sx={{ fontWeight: 500 }}
        >
          {comp?.label ?? node.type}
        </Typography>
      </Box>

      <Divider sx={{ mb: 2 }} />

      {basicProps.length === 0 && advancedProps.length === 0 && (
        <Alert
          severity='info'
          sx={{ mb: 2 }}
        >
          {i18n.t('components.property_panel.k4')}
        </Alert>
      )}

      {basicProps.map((config) => (
        <Box
          key={config.key}
          sx={{ mb: 1.5 }}
        >
          {renderField(config)}
        </Box>
      ))}

      {advancedProps.length > 0 && (
        <>
          <Divider sx={{ my: 2 }} />
          <Typography
            variant='caption'
            sx={{ color: 'text.secondary', mb: 1, display: 'block' }}
          >
            {i18n.t('components.property_panel.k5')}
          </Typography>
          {advancedProps.map((config) => (
            <Box
              key={config.key}
              sx={{ mb: 1.5 }}
            >
              {renderField(config)}
            </Box>
          ))}
        </>
      )}
    </Paper>
  );
}
