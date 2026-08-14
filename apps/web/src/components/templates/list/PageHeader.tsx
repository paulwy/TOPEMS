import React from 'react';
import { Box, Breadcrumbs, Button, IconButton, Link, Tooltip, Typography } from '@mui/material';
import { ChevronRight, Download, RefreshCw } from 'lucide-react';
import { BackButton } from '@topems/shared-components';
import { Link as RouterLink } from 'react-router-dom';
import type { BatchAction } from './types';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

export interface PageAction {
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  variant?: 'contained' | 'outlined' | 'text';
}

export interface PrimaryActionButton {
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  gradient?: string;
}

export interface PageHeaderProps<T = any> {
  title?: string;
  subtitle?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  backButton?: {
    href?: string;
    onClick?: () => void;
  };
  primaryActionButton?: PrimaryActionButton;
  actions?: PageAction[];
  onRefresh?: () => void;
  // Export
  exportable?: boolean;
  exporting?: boolean;
  exportComplete?: boolean;
  onOpenExportMenu?: (event: React.MouseEvent<HTMLElement>) => void;
  disabledExport?: boolean;
  // // 批量Action按钮（在 header Medium渲染）
  hasBatchActions?: boolean;
  selectedCount?: number;
  batchActions?: BatchAction<T>[];
  onBatchAction?: (action: BatchAction<T>) => void;
  onClearSelection?: () => void;
}

/**
 * 列表页头部（标题栏、面包屑、操作按钮）
 * 从 ListPageTemplate 中抽离的页面头部 UI
 */
export function PageHeader<T = any>({
  title,
  subtitle,
  breadcrumbs,
  backButton,
  primaryActionButton,
  actions,
  onRefresh,
  exportable,
  exporting,
  exportComplete,
  onOpenExportMenu,
  disabledExport,
  hasBatchActions,
  selectedCount = 0,
  batchActions,
  onBatchAction,
  onClearSelection,
}: PageHeaderProps<T>) {
  const { t } = useTranslation();
  const showActionsBar =
    primaryActionButton || (actions && actions.length > 0) || onRefresh || exportable;

  if (!breadcrumbs && !title && !showActionsBar) return null;

  return (
    <Box
      sx={{
        px: { xs: 2, sm: 3 },
        py: 2,
        borderBottom: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      {/* 面包屑导航 */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumbs
          separator={<ChevronRight size={14} />}
          sx={{ mb: 1 }}
        >
          {breadcrumbs.map((crumb, index) =>
            crumb.href ? (
              <Link
                key={index}
                component={RouterLink}
                to={crumb.href}
                color='inherit'
                underline='hover'
                sx={{ fontSize: '0.875rem' }}
              >
                {crumb.label}
              </Link>
            ) : (
              <Typography
                key={index}
                color='text.primary'
                sx={{ fontSize: '0.875rem' }}
              >
                {crumb.label}
              </Typography>
            )
          )}
        </Breadcrumbs>
      )}

      {/* Title栏 */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {/* 返回按钮 */}
          {backButton && (
            <BackButton
              onClick={backButton.onClick}
              href={backButton.href}
              size='small'
              sx={{ bgcolor: 'action.hover' }}
            />
          )}

          {/* Title和副标题 */}
          <Box>
            {title && (
              <Typography
                variant='h5'
                sx={{ fontWeight: 600, color: 'text.primary' }}
              >
                {title}
              </Typography>
            )}
            {subtitle && (
              <Typography
                variant='body2'
                color='text.secondary'
                sx={{ mt: 0.25 }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>
        </Box>

        {/* Action按钮 */}
        {showActionsBar && (
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {primaryActionButton && (
              <Button
                variant='contained'
                startIcon={primaryActionButton.icon}
                onClick={primaryActionButton.onClick}
                sx={
                  primaryActionButton.gradient
                    ? {
                        background: primaryActionButton.gradient,
                        color: 'common.white',
                        '&:hover': { opacity: 0.9 },
                      }
                    : {}
                }
              >
                {primaryActionButton.label}
              </Button>
            )}
            {/* 刷新按钮 */}
            {onRefresh && (
              <Tooltip title={t('components.components.pageheader.key_694fc5')}>
                <IconButton
                  onClick={onRefresh}
                  size='small'
                  aria-label={i18n.t('templates.page_header.k0')}
                >
                  <RefreshCw size={18} />
                </IconButton>
              </Tooltip>
            )}
            {/* 导出按钮 */}
            {exportable && (
              <Tooltip
                title={
                  exporting
                    ? t('components.pageHeader.4062b25e')
                    : exportComplete
                      ? t('components.pageHeader.105c8a')
                      : t('components.pageHeader.c7f0d5')
                }
              >
                <span>
                  <IconButton
                    onClick={onOpenExportMenu}
                    size='small'
                    disabled={disabledExport}
                    color={exportComplete ? 'primary' : 'inherit'}
                    aria-label={i18n.t('templates.page_header.k1')}
                  >
                    <Download size={18} />
                  </IconButton>
                </span>
              </Tooltip>
            )}
            {/* 自定义操作按钮 */}
            {(actions || []).map((action, index) => (
              <Button
                key={index}
                variant={action.variant || 'contained'}
                size='small'
                startIcon={action.icon}
                onClick={action.onClick}
                sx={{ whiteSpace: 'nowrap' }}
              >
                {action.label}
              </Button>
            ))}
            {/* 批量操作按钮 */}
            {hasBatchActions && selectedCount > 0 && (
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Button
                  variant='outlined'
                  size='small'
                  color='primary'
                  sx={{ whiteSpace: 'nowrap' }}
                >
                  {t('components.components.pageheader.key_f08afd')}
                  {selectedCount} 项
                </Button>
                {(batchActions || []).map((action, index) => (
                  <Button
                    key={index}
                    variant='contained'
                    size='small'
                    startIcon={action.icon}
                    onClick={() => onBatchAction?.(action)}
                    disabled={action.disabled || selectedCount === 0}
                    color={action.color || 'primary'}
                    sx={{ whiteSpace: 'nowrap' }}
                  >
                    {action.label}
                  </Button>
                ))}
                {onClearSelection && (
                  <Button
                    variant='text'
                    size='small'
                    onClick={onClearSelection}
                    sx={{ whiteSpace: 'nowrap' }}
                  >
                    {t('components.components.pageheader.key_76159d')}
                  </Button>
                )}
              </Box>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
}
