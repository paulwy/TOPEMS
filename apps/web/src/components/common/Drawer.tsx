/**
 * 统一 Drawer 组件
 * 提供统一的抽屉行为和样式
 */
import React from 'react';
import {
  Drawer as MuiDrawer,
  Box,
  IconButton,
  Typography,
  Divider,
} from '@mui/material';
import { X } from 'lucide-react';

// ============ 类型定义 ============

/**
 * Drawer 方向
 */
export type DrawerAnchor = 'left' | 'right' | 'top' | 'bottom';

/**
 * Drawer 变体
 */
export type DrawerVariant = 'temporary' | 'persistent' | 'permanent';

/**
 * Drawer 配置接口
 */
export interface DrawerProps {
  /** 是否打开 */
  open: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 方向 */
  anchor?: DrawerAnchor;
  /** 变体 */
  variant?: DrawerVariant;
  /** 标题 */
  title?: string;
  /** 内容 */
  children?: React.ReactNode;
  /** 宽度（left/right） */
  width?: number | string;
  /** 高度（top/bottom） */
  height?: number | string;
  /** 是否显示关闭按钮 */
  showCloseButton?: boolean;
  /** 是否显示标题 */
  showTitle?: boolean;
  /** 是否显示分隔线 */
  showDivider?: boolean;
  /** 是否可关闭 */
  closable?: boolean;
  /** 点击外部是否关闭 */
  closeOnBackdropClick?: boolean;
  /** 自定义样式 */
  sx?: any;
  /** 抽屉纸样式 */
  paperSx?: any;
  /** 标题区域样式 */
  titleSx?: any;
  /** 内容区域样式 */
  contentSx?: any;
  /** 头部内容 */
  headerContent?: React.ReactNode;
  /** 底部内容 */
  footerContent?: React.ReactNode;
}

// ============ Drawer 组件 ============

/**
 * 统一 Drawer 组件
 * 提供统一的抽屉行为和样式
 *
 * @example
 * ```tsx
 * // 基础用法
 * <Drawer
 *   open={isOpen}
 *   onClose={handleClose}
 *   title="设置"
 * >
 *   <Box sx={{ p: 2 }}>
 *     <Typography>抽屉内容</Typography>
 *   </Box>
 * </Drawer>
 *
 * // 自定义宽度
 * <Drawer
 *   open={isOpen}
 *   onClose={handleClose}
 *   title="侧边栏"
 *   width={400}
 * >
 *   {/* 内容 */}
 * </Drawer>
 *
 * // 底部抽屉
 * <Drawer
 *   open={isOpen}
 *   onClose={handleClose}
 *   anchor="bottom"
 *   height={300}
 * >
 *   {/* 内容 */}
 * </Drawer>
 *
 * // 自定义头部和底部
 * <Drawer
 *   open={isOpen}
 *   onClose={handleClose}
 *   headerContent={<CustomHeader />}
 *   footerContent={<CustomFooter />}
 * >
 *   {/* 内容 */}
 * </Drawer>
 * ```
 */
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
  // 处理关闭
  const handleClose = () => {
    if (closable) {
      onClose();
    }
  };

  // 计算 Paper 样式
  const getPaperSx = () => {
    const baseStyle: any = {
      ...(anchor === 'left' || anchor === 'right' ? { width } : { height }),
      maxWidth: anchor === 'left' || anchor === 'right' ? '90vw' : undefined,
      maxHeight: anchor === 'top' || anchor === 'bottom' ? '90vh' : undefined,
      ...paperSx,
    };

    return baseStyle;
  };

  // 渲染头部
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
                variant="h6"
                sx={{ fontWeight: 600 }}
              >
                {title}
              </Typography>
            )}
            {showCloseButton && closable && (
              <IconButton
                size="small"
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

  // 渲染底部
  const renderFooter = () => {
    if (!footerContent) return null;

    return (
      <>
        {showDivider && <Divider />}
        <Box sx={{ p: 2 }}>
          {footerContent}
        </Box>
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