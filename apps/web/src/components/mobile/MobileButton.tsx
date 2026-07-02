import React from 'react';
import { Button, type ButtonProps, useTheme } from '@mui/material';

export interface MobileButtonProps extends Omit<ButtonProps, 'size'> {
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
}

export const MobileButton: React.FC<MobileButtonProps> = ({
  size = 'medium',
  fullWidth = false,
  children,
  sx,
  ...props
}) => {
  const theme = useTheme();

  const getHeight = () => {
    switch (size) {
      case 'small':
        return 40;
      case 'large':
        return 52;
      case 'medium':
      default:
        return 48;
    }
  };

  const getFontSize = () => {
    switch (size) {
      case 'small':
        return '0.875rem';
      case 'large':
        return '1rem';
      case 'medium':
      default:
        return '0.9375rem';
    }
  };

  return (
    <Button
      {...props}
      fullWidth={fullWidth}
      sx={{
        height: getHeight(),
        fontSize: getFontSize(),
        fontWeight: 500,
        borderRadius: 3,
        textTransform: 'none',
        minWidth: 88,
        ...sx,
      }}
    >
      {children}
    </Button>
  );
};

export default MobileButton;
