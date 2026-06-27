import React from 'react';
import { Box, Typography, Collapse, IconButton, Tooltip } from '@mui/material';
import { ChevronDown, Info } from 'lucide-react';

export interface FormFieldGroupProps {
  title: string;
  description?: string;
  tooltip?: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  columns?: number;
  gap?: number;
  required?: boolean;
  sx?: any;
}

export const FormFieldGroup: React.FC<FormFieldGroupProps> = ({
  title,
  description,
  tooltip,
  children,
  collapsible = false,
  defaultExpanded = true,
  columns,
  gap = 2,
  required,
  sx,
}) => {
  const [expanded, setExpanded] = React.useState(defaultExpanded);

  return (
    <Box
      component='fieldset'
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        p: 0,
        m: 0,
        overflow: 'hidden',
        ...sx,
      }}
    >
      <Box
        component='legend'
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 2,
          py: 1.5,
          bgcolor: 'grey.50',
          borderBottom: expanded ? 1 : 0,
          borderColor: 'divider',
          width: '100%',
        }}
      >
        {required && (
          <Typography
            component='span'
            color='error'
            sx={{ fontWeight: 700 }}
          >
            *
          </Typography>
        )}
        <Typography
          variant='subtitle2'
          sx={{ fontWeight: 600, flex: 1 }}
        >
          {title}
        </Typography>
        {description && (
          <Typography
            variant='caption'
            color='text.secondary'
            sx={{ display: { xs: 'none', sm: 'block' } }}
          >
            {description}
          </Typography>
        )}
        {tooltip && (
          <Tooltip title={tooltip}>
            <IconButton size='small'>
              <Info size={16} />
            </IconButton>
          </Tooltip>
        )}
        {collapsible && (
          <IconButton
            size='small'
            onClick={() => setExpanded(!expanded)}
          >
            <ChevronDown
              size={16}
              style={{
                transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                transition: 'transform 0.2s',
              }}
            />
          </IconButton>
        )}
      </Box>
      <Box
        sx={{
          px: 2,
          py: 2,
          display: columns ? 'grid' : 'flex',
          flexDirection: columns ? undefined : 'column',
          gridTemplateColumns: columns ? `repeat(${columns}, 1fr)` : undefined,
          gap,
          ...(collapsible ? { display: expanded ? (columns ? 'grid' : 'flex') : 'none' } : {}),
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default FormFieldGroup;
