import React from 'react';
import { Drawer as MuiDrawer, Box, IconButton, Typography, Divider } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { X } from 'lucide-react';

export type DrawerAnchor = 'left' | 'right' | 'top' | 'bottom';

export type DrawerVariant = 'temporary' | 'persistent' | 'permanent';

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  anchor?: DrawerAnchor;
  variant?: DrawerVariant;
  title?: string;
  children?: React.ReactNode;
  width?: number | string;
  height?: number | string;
  showCloseButton?: boolean;
  showTitle?: boolean;
  showDivider?: boolean;
  closable?: boolean;
  closeOnBackdropClick?: boolean;
  sx?: SxProps<Theme>;
  paperSx?: SxProps<Theme>;
  titleSx?: SxProps<Theme>;
  contentSx?: SxProps<Theme>;
  headerContent?: React.ReactNode;
  footerContent?: React.ReactNode;
}

export const Drawer: React.FC<DrawerProps> = ({
  open,
  onClose,
  anchor = 'right',
  variant = 'temporary',
  title,
  children,
  width = 320,
  height = 'auto',
  showCloseButton = true,
  showTitle = true,
  showDivider = true,
  closable = true,
  closeOnBackdropClick = true,
  sx,
  paperSx,
  titleSx,
  contentSx,
  headerContent,
  footerContent,
}) => {
  const handleClose = () => {
    if (closable) {
      onClose();
    }
  };

  const getPaperSx = () => {
    const baseStyle: { [key: string]: unknown } = {
      ...(anchor === 'left' || anchor === 'right' ? { width } : { height }),
      maxWidth: anchor === 'left' || anchor === 'right' ? '90vw' : undefined,
      maxHeight: anchor === 'top' || anchor === 'bottom' ? '90vh' : undefined,
      ...paperSx,
    };

    return baseStyle;
  };

  const renderHeader = () => {
    if (!title && !headerContent) return null;

    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 2,
          borderBottom: showDivider ? 1 : 0,
          borderColor: 'divider',
          ...titleSx,
        }}
      >
        {headerContent || (
          <>
            {showTitle && title && (
              <Typography
                variant='h6'
                sx={{ fontWeight: 600 }}
              >
                {title}
              </Typography>
            )}
            {showCloseButton && closable && (
              <IconButton
                size='small'
                onClick={handleClose}
                sx={{ ml: 'auto' }}
              >
                <X size={20} />
              </IconButton>
            )}
          </>
        )}
      </Box>
    );
  };

  const renderFooter = () => {
    if (!footerContent) return null;

    return (
      <>
        {showDivider && <Divider />}
        <Box sx={{ p: 2 }}>{footerContent}</Box>
      </>
    );
  };

  return (
    <MuiDrawer
      anchor={anchor}
      open={open}
      onClose={closeOnBackdropClick && closable ? handleClose : undefined}
      variant={variant}
      sx={{
        ...sx,
        '& .MuiDrawer-paper': getPaperSx(),
      }}
    >
      {renderHeader()}
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          ...contentSx,
        }}
      >
        {children}
      </Box>
      {renderFooter()}
    </MuiDrawer>
  );
};

export default Drawer;
