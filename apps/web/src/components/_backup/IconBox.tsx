import * as React from 'react';
import type { BoxProps } from '@mui/material';
import { Box } from '@mui/material';

export interface IconBoxProps extends BoxProps {
  children: React.ReactNode;
}

export const IconBox: React.FC<IconBoxProps> = ({ children, sx, ...props }) => {
  return (
    <Box
      component='span'
      sx={sx}
      {...props}
    >
      {children}
    </Box>
  );
};
