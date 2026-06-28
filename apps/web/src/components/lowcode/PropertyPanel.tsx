import React from 'react';
import {
  Box,
  Typography,
  TextField,
  Switch,
  FormControl,
  FormControlLabel,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Stack,
  useTheme,
} from '@mui/material';
import type { ComponentSchema, ComponentDefinition } from '@/api/lowcode';

interface PropertyPanelProps {
  selectedComponent: ComponentSchema | null;
  componentDefinition: ComponentDefinition | null;
  onPropertyChange: (path: string, value: unknown) => void;
}

const PropertyPanel: React.FC<PropertyPanelProps> = ({
  selectedComponent,
  componentDefinition,
  onPropertyChange,
}) => {
  const theme = useTheme();

  if (!selectedComponent) {
    return (
      <Box
        sx={{
          width: 300,
          height: '100%',
          bgcolor: 'background.paper',
          borderLeft: 1,
          borderColor: 'divider',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box
          sx={{
            p: 2,
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            属性配置
          </Typography>
        </Box>
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 1,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            请选择一个组件
          </Typography>
        </Box>
      </Box>
    );
  }

  const handleBaseChange = (key: string, value: unknown) => {
    onPropertyChange(key, value);
  };

  const handlePropsChange = (key: string, value: unknown) => {
    onPropertyChange(`props.${key}`, value);
  };

  const renderPropControl = (prop: {
    name: string;
    label: string;
    type: string;
    defaultValue?: unknown;
    options?: Array<{ label: string; value: unknown }>;
    required?: boolean;
  }) => {
    const value = (selectedComponent.props?.[prop.name] ??
      selectedComponent[prop.name as keyof ComponentSchema] ??
      prop.defaultValue) as unknown;

    switch (prop.type) {
      case 'string':
        return (
          <TextField
            fullWidth
            size="small"
            label={prop.label}
            value={String(value || '')}
            onChange={(e) => {
              if (prop.name in selectedComponent) {
                handleBaseChange(prop.name, e.target.value);
              } else {
                handlePropsChange(prop.name, e.target.value);
              }
            }}
            required={prop.required}
          />
        );

      case 'number':
        return (
          <TextField
            fullWidth
            size="small"
            type="number"
            label={prop.label}
            value={Number(value || 0)}
            onChange={(e) => {
              if (prop.name in selectedComponent) {
                handleBaseChange(prop.name, Number(e.target.value));
              } else {
                handlePropsChange(prop.name, Number(e.target.value));
              }
            }}
          />
        );

      case 'boolean':
        return (
          <FormControlLabel
            control={
              <Switch
                checked={Boolean(value)}
                onChange={(e) => {
                  if (prop.name in selectedComponent) {
                    handleBaseChange(prop.name, e.target.checked);
                  } else {
                    handlePropsChange(prop.name, e.target.checked);
                  }
                }}
                size="small"
              />
            }
            label={prop.label}
          />
        );

      case 'select':
        return (
          <FormControl fullWidth size="small">
            <InputLabel>{prop.label}</InputLabel>
            <Select
              value={String(value || '')}
              label={prop.label}
              onChange={(e) => {
                if (prop.name in selectedComponent) {
                  handleBaseChange(prop.name, e.target.value);
                } else {
                  handlePropsChange(prop.name, e.target.value);
                }
              }}
            >
              {prop.options?.map((opt) => (
                <MenuItem key={String(opt.value)} value={opt.value as string}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );

      case 'color':
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" sx={{ minWidth: 80 }}>
              {prop.label}
            </Typography>
            <TextField
              size="small"
              type="color"
              value={String(value || '#ffffff')}
              onChange={(e) => handlePropsChange(prop.name, e.target.value)}
              sx={{ width: 60 }}
              slotProps={{ input: { sx: { p: 0.5, height: 40 } } }}
            />
          </Box>
        );

      default:
        return (
          <TextField
            fullWidth
            size="small"
            label={prop.label}
            value={String(value || '')}
            onChange={(e) => handlePropsChange(prop.name, e.target.value)}
          />
        );
    }
  };

  return (
    <Box
      sx={{
        width: 300,
        height: '100%',
        bgcolor: 'background.paper',
        borderLeft: 1,
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          p: 2,
          borderBottom: 1,
          borderColor: 'divider',
          position: 'sticky',
          top: 0,
          bgcolor: 'background.paper',
          zIndex: 1,
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          属性配置
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {componentDefinition?.name || selectedComponent.type}
        </Typography>
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        <Stack spacing={2}>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
              基础属性
            </Typography>
            <Stack spacing={1.5}>
              <TextField
                fullWidth
                size="small"
                label="组件ID"
                value={selectedComponent.id}
                disabled
              />
              <TextField
                fullWidth
                size="small"
                label="标签"
                value={selectedComponent.label || ''}
                onChange={(e) => handleBaseChange('label', e.target.value)}
              />
              <TextField
                fullWidth
                size="small"
                label="字段名"
                value={selectedComponent.name || ''}
                onChange={(e) => handleBaseChange('name', e.target.value)}
              />
            </Stack>
          </Box>

          <Divider />

          {componentDefinition?.propSchema &&
          componentDefinition.propSchema.length > 0 ? (
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
                组件属性
              </Typography>
              <Stack spacing={1.5}>
                {componentDefinition.propSchema.map((prop) => (
                  <React.Fragment key={prop.name}>
                    {renderPropControl(prop)}
                  </React.Fragment>
                ))}
              </Stack>
            </Box>
          ) : null}

          <Divider />

          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
              样式属性
            </Typography>
            <Stack spacing={1.5}>
              <TextField
                fullWidth
                size="small"
                label="宽度"
                value={(selectedComponent.style?.width as string) || ''}
                placeholder="例如: 100%"
                onChange={(e) =>
                  onPropertyChange('style.width', e.target.value)
                }
              />
              <TextField
                fullWidth
                size="small"
                label="高度"
                value={(selectedComponent.style?.height as string) || ''}
                placeholder="例如: auto"
                onChange={(e) =>
                  onPropertyChange('style.height', e.target.value)
                }
              />
              <TextField
                fullWidth
                size="small"
                label="外边距"
                value={(selectedComponent.style?.margin as string) || ''}
                placeholder="例如: 8px"
                onChange={(e) =>
                  onPropertyChange('style.margin', e.target.value)
                }
              />
              <TextField
                fullWidth
                size="small"
                label="内边距"
                value={(selectedComponent.style?.padding as string) || ''}
                placeholder="例如: 8px"
                onChange={(e) =>
                  onPropertyChange('style.padding', e.target.value)
                }
              />
            </Stack>
          </Box>
        </Stack>
      </Box>
    </Box>
  );
};

export default PropertyPanel;
