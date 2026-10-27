import React from 'react';
import { Box, Typography } from '@mui/material';
import { BackButton } from '@topems/shared-components';

interface ListPageHeaderProps {
  backButton?: {
    onClick?: () => void;
    href?: string;
  };
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
}

/**
 * ListPage 标题栏（返回按钮 + 标题 + 副标题）
 * 从 ListPageTemplate 抽出，保持 API 兼容
 */
export const ListPageHeader: React.FC<ListPageHeaderProps> = ({
  backButton,
  title,
  subtitle,
}) => {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
      {/* 返回按钮 */}
      {backButton && (
        <BackButton
          onClick={backButton.onClick}
          href={backButton.href}
          size="small"
          sx={{ bgcolor: 'action.hover' }}
        />
      )}

      {/* 标题和副标题 */}
      <Box>
        {title && (
          <Typography variant="h5" sx={{ fontWeight: 600, color: 'text.primary' }}>
            {title}
          </Typography>
        )}
        {subtitle && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
    </Box>
  );
};
