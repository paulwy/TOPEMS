import React from 'react';
import { Box, Stack, Typography, type SxProps, type Theme } from '@mui/material';

export interface MobileFormField {
  key: string;
  label: string;
  required?: boolean;
  render: (value: unknown, onChange: (val: unknown) => void) => React.ReactNode;
}

export interface MobileFormProps {
  fields: MobileFormField[];
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  title?: string;
  description?: string;
  submitButton?: React.ReactNode;
  sx?: SxProps<Theme>;
}

export function MobileForm({
  fields,
  values,
  onChange,
  title,
  description,
  submitButton,
  sx,
}: MobileFormProps) {
  return (
    <Box sx={sx}>
      {title && (
        <Typography variant="h6" sx={{ mb: 0.5 }}>
          {title}
        </Typography>
      )}
      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {description}
        </Typography>
      )}
      <Stack spacing={2.5}>
        {fields.map((field) => (
          <Box key={field.key}>
            <Box
              sx={{
                mb: 0.5,
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
              }}
            >
              <Typography component="span" variant="body2" sx={{ fontWeight: 500 }}>
                {field.label}
              </Typography>
              {field.required && (
                <Typography variant="body2" color="error.main">
                  *
                </Typography>
              )}
            </Box>
            {field.render(values[field.key], (val) =>
              onChange(field.key, val),
            )}
          </Box>
        ))}
      </Stack>
      {submitButton && <Box sx={{ mt: 3 }}>{submitButton}</Box>}
    </Box>
  );
}

export default MobileForm;
