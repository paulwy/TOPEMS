import React, { useState } from 'react';
import {
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton as MuiIconButton,
  Box,
  Typography,
} from '@mui/material';
import i18n from '@/i18n';
import { HelpCircle, X } from 'lucide-react';

// ============ 类型定义 ============

export interface HelpButtonProps {
  /** 帮助标题 */
  title?: string;
  /** 帮助内容 */
  content: React.ReactNode;
  /** 按钮大小 */
  size?: 'small' | 'medium' | 'large';
  /** 按钮提示文字 */
  tooltip?: string;
  /** 对话框最大宽度 */
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** 是否禁用 */
  disabled?: boolean;
  /** 自定义图标 */
  icon?: React.ReactNode;
}

// ============ HelpButton 组件 ============

export const HelpButton: React.FC<HelpButtonProps> = ({
  title = i18n.t('shared.help_button.k0'),
  content,
  size = 'medium',
  tooltip = i18n.t('shared.help_button.k1'),
  maxWidth = 'sm',
  disabled = false,
  icon,
}) => {
  const [open, setOpen] = useState(false);

  const handleOpen = () => {
    if (!disabled) {
      setOpen(true);
    }
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <>
      <Tooltip title={tooltip}>
        <span>
          <IconButton
            size={size}
            onClick={handleOpen}
            disabled={disabled}
            sx={{
              color: 'text.secondary',
              '&:hover': {
                color: 'primary.main',
              },
            }}
            aria-label={i18n.t('shared.help_button.k2')}
          >
            {icon || <HelpCircle style={{ width: 20, height: 20 }} />}
          </IconButton>
        </span>
      </Tooltip>

      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth={maxWidth}
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: 3,
            },
          },
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            pr: 1,
          }}
        >
          <Typography
            variant='h6'
            component='span'
            sx={{ fontWeight: 600 }}
          >
            {title}
          </Typography>
          <MuiIconButton
            size='small'
            onClick={handleClose}
            sx={{
              color: 'text.secondary',
              '&:hover': {
                color: 'text.primary',
              },
            }}
          >
            <X style={{ width: 20, height: 20 }} />
          </MuiIconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ py: 1 }}>
            {typeof content === 'string' ? (
              <Typography
                variant='body2'
                color='text.secondary'
              >
                {content}
              </Typography>
            ) : (
              content
            )}
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default HelpButton;
