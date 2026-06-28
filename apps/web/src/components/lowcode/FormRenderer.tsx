import React from 'react';
import {
  TextField,
  FormControl,
  FormLabel,
  FormControlLabel,
  RadioGroup,
  Radio,
  Checkbox,
  Switch,
  Button,
  Select,
  MenuItem,
  InputLabel,
  Rating,
  Divider,
  Box,
  Typography,
  Stack,
  Grid,
  Tabs,
  Tab,
  Paper,
} from '@mui/material';
import { DatePicker, TimePicker } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import type { ComponentSchema, FormSchema } from '@/api/lowcode';

interface FormRendererProps {
  schema: FormSchema;
  values?: Record<string, unknown>;
  onChange?: (values: Record<string, unknown>) => void;
  onSubmit?: (values: Record<string, unknown>) => void;
  readOnly?: boolean;
}

const FormRenderer: React.FC<FormRendererProps> = ({
  schema,
  values = {},
  onChange,
  onSubmit,
  readOnly = false,
}) => {
  const [formValues, setFormValues] = React.useState<Record<string, unknown>>(values);

  React.useEffect(() => {
    setFormValues(values);
  }, [values]);

  const handleChange = (name: string, value: unknown) => {
    const newValues = { ...formValues, [name]: value };
    setFormValues(newValues);
    onChange?.(newValues);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit?.(formValues);
  };

  const renderComponent = (component: ComponentSchema): React.ReactNode => {
    const name = component.name || component.id;
    const value = formValues[name] ?? component.defaultValue ?? '';

    switch (component.type) {
      case 'input':
        return (
          <TextField
            fullWidth
            size="small"
            label={component.label}
            placeholder={component.placeholder}
            required={component.required}
            disabled={component.disabled || readOnly}
            value={value as string}
            onChange={(e) => handleChange(name, e.target.value)}
            {...(component.props as Record<string, unknown>)}
          />
        );

      case 'password':
        return (
          <TextField
            fullWidth
            size="small"
            type="password"
            label={component.label}
            placeholder={component.placeholder}
            required={component.required}
            disabled={component.disabled || readOnly}
            value={value as string}
            onChange={(e) => handleChange(name, e.target.value)}
            {...(component.props as Record<string, unknown>)}
          />
        );

      case 'textarea':
        return (
          <TextField
            fullWidth
            size="small"
            multiline
            rows={(component.props?.rows as number) || 4}
            label={component.label}
            placeholder={component.placeholder}
            required={component.required}
            disabled={component.disabled || readOnly}
            value={value as string}
            onChange={(e) => handleChange(name, e.target.value)}
            {...(component.props as Record<string, unknown>)}
          />
        );

      case 'number':
        return (
          <TextField
            fullWidth
            size="small"
            type="number"
            label={component.label}
            placeholder={component.placeholder}
            required={component.required}
            disabled={component.disabled || readOnly}
            value={value as number}
            onChange={(e) => handleChange(name, Number(e.target.value))}
            slotProps={{
              input: {
                min: component.props?.min as number,
                max: component.props?.max as number,
                step: component.props?.step as number,
              } as any,
            }}
            {...(component.props as Record<string, unknown>)}
          />
        );

      case 'select':
        return (
          <FormControl fullWidth size="small" required={component.required}>
            <InputLabel>{component.label}</InputLabel>
            <Select
              value={value as string}
              label={component.label}
              disabled={component.disabled || readOnly}
              multiple={component.props?.multiple as boolean}
              onChange={(e) => handleChange(name, e.target.value)}
            >
              {(component.props?.options as Array<{ label: string; value: string }>)?.map(
                (opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                )
              )}
            </Select>
          </FormControl>
        );

      case 'radio':
        return (
          <FormControl component="fieldset" required={component.required}>
            <FormLabel component="legend">{component.label}</FormLabel>
            <RadioGroup
              value={value as string}
              onChange={(e) => handleChange(name, e.target.value)}
              row={component.props?.direction !== 'vertical'}
            >
              {(component.props?.options as Array<{ label: string; value: string }>)?.map(
                (opt) => (
                  <FormControlLabel
                    key={opt.value}
                    value={opt.value}
                    control={<Radio size="small" />}
                    label={opt.label}
                    disabled={component.disabled || readOnly}
                  />
                )
              )}
            </RadioGroup>
          </FormControl>
        );

      case 'checkbox':
        return (
          <FormControl component="fieldset" required={component.required}>
            <FormLabel component="legend">{component.label}</FormLabel>
            <Box
              sx={{
                display: 'flex',
                flexDirection:
                  component.props?.direction === 'vertical' ? 'column' : 'row',
                flexWrap: 'wrap',
                gap: 1,
              }}
            >
              {(component.props?.options as Array<{ label: string; value: string }>)?.map(
                (opt) => (
                  <FormControlLabel
                    key={opt.value}
                    control={
                      <Checkbox
                        size="small"
                        checked={Array.isArray(value) && value.includes(opt.value)}
                        onChange={(e) => {
                          const current = Array.isArray(value) ? [...value] : [];
                          if (e.target.checked) {
                            current.push(opt.value);
                          } else {
                            const idx = current.indexOf(opt.value);
                            if (idx > -1) current.splice(idx, 1);
                          }
                          handleChange(name, current);
                        }}
                        disabled={component.disabled || readOnly}
                      />
                    }
                    label={opt.label}
                  />
                )
              )}
            </Box>
          </FormControl>
        );

      case 'switch':
        return (
          <FormControlLabel
            control={
              <Switch
                checked={Boolean(value)}
                onChange={(e) => handleChange(name, e.target.checked)}
                disabled={component.disabled || readOnly}
                size="small"
              />
            }
            label={component.label}
          />
        );

      case 'date-picker':
        return (
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              label={component.label}
              value={value as unknown as null}
              onChange={(newValue) => handleChange(name, newValue)}
              disabled={component.disabled || readOnly}
              slotProps={{
                textField: {
                  fullWidth: true,
                  size: 'small',
                  required: component.required,
                },
              }}
            />
          </LocalizationProvider>
        );

      case 'time-picker':
        return (
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <TimePicker
              label={component.label}
              value={value as unknown as null}
              onChange={(newValue) => handleChange(name, newValue)}
              disabled={component.disabled || readOnly}
              slotProps={{
                textField: {
                  fullWidth: true,
                  size: 'small',
                  required: component.required,
                },
              }}
            />
          </LocalizationProvider>
        );

      case 'button':
        return (
          <Button
            variant={component.props?.variant as 'contained' | 'outlined' | 'text'}
            color={component.props?.color as 'primary' | 'secondary' | 'error'}
            size={component.props?.size as 'small' | 'medium' | 'large'}
            onClick={() => onSubmit?.(formValues)}
          >
            {component.props?.text as string}
          </Button>
        );

      case 'rating':
        return (
          <Box>
            <FormLabel>{component.label}</FormLabel>
            <Rating
              value={Number(value) || 0}
              max={Number(component.props?.max) || 5}
              onChange={(_, newValue) => handleChange(name, newValue)}
              readOnly={component.disabled || readOnly}
            />
          </Box>
        );

      case 'divider':
        return (
          <Divider sx={{ my: 2 }}>
            {component.props?.text ? (
              <Typography variant="body2" color="text.secondary">
                {component.props.text as string}
              </Typography>
            ) : null}
          </Divider>
        );

      case 'grid':
        return (
          <Grid
            container
            spacing={(component.props?.gap as number) || 2}
            columns={(component.props?.columns as number) || 2}
          >
            {component.children?.map((child, idx) => (
              <Grid size={{ xs: 12 / ((component.props?.columns as number) || 2) }} key={idx}>
                {renderComponent(child)}
              </Grid>
            ))}
          </Grid>
        );

      case 'group':
        return (
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
              {component.props?.title as string}
            </Typography>
            <Stack spacing={2}>
              {component.children?.map((child, idx) => (
                <React.Fragment key={idx}>{renderComponent(child)}</React.Fragment>
              ))}
            </Stack>
          </Paper>
        );

      case 'tabs':
        return (
          <TabsRenderComponent component={component} renderComponent={renderComponent} />
        );

      case 'image-upload':
        return (
          <Box>
            <FormLabel>{component.label}</FormLabel>
            <Button variant="outlined" component="label" fullWidth sx={{ mt: 1 }}>
              上传图片
              <input type="file" accept="image/*" hidden />
            </Button>
          </Box>
        );

      case 'rich-text':
        return (
          <TextField
            fullWidth
            multiline
            rows={6}
            label={component.label}
            placeholder={component.placeholder}
            required={component.required}
            value={value as string}
            onChange={(e) => handleChange(name, e.target.value)}
          />
        );

      default:
        return (
          <TextField
            fullWidth
            size="small"
            label={component.label || component.type}
            disabled
            value="未知组件类型"
          />
        );
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Stack spacing={2}>
        {schema.components.map((component) => (
          <React.Fragment key={component.id}>
            {renderComponent(component)}
          </React.Fragment>
        ))}
      </Stack>
    </form>
  );
};

const TabsRenderComponent: React.FC<{
  component: ComponentSchema;
  renderComponent: (comp: ComponentSchema) => React.ReactNode;
}> = ({ component, renderComponent }) => {
  const [activeTab, setActiveTab] = React.useState(0);
  const tabs = (component.props?.tabs as Array<{ key: string; label: string }>) || [];

  return (
    <Box>
      <Tabs
        value={activeTab}
        onChange={(_, newValue) => setActiveTab(newValue)}
        variant="scrollable"
      >
        {tabs.map((tab, idx) => (
          <Tab key={tab.key} label={tab.label} />
        ))}
      </Tabs>
      <Box sx={{ p: 2, border: 1, borderTop: 0, borderColor: 'divider', borderRadius: '0 0 4px 4px' }}>
        {component.children?.[activeTab] && renderComponent(component.children[activeTab])}
      </Box>
    </Box>
  );
};

export default FormRenderer;
