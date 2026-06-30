/**
 * Phase 5.2 — 跨模块关联数据卡片
 *
 * 在当前页面中嵌入关联模块的数据摘要卡片。
 * 仅在关联模块已安装时显示，通过 usePluginContext.isPluginInstalled 判断。
 */
import React, { useState } from 'react';
import { Box, Typography, Card, CardContent, Button, Chip, Skeleton, Divider } from '@mui/material';
import { ExternalLink, ChevronRight, TrendingUp, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePlugins } from '@/context/PluginContext';

export interface RelatedModuleItem {
  /** 数据标签 */
  label: string;
  /** 数据值 */
  value: string | number;
  /** 可选的趋势方向 */
  trend?: 'up' | 'down' | 'flat';
  /** 可选的描述 */
  description?: string;
}

export interface RelatedModuleCardProps {
  /** 关联模块 code（如 'finance', 'crm', 'wms'） */
  moduleCode: string;
  /** 模块显示名称 */
  moduleName: string;
  /** 模块图标 */
  moduleIcon?: React.ReactNode;
  /** 数据列表 */
  items: RelatedModuleItem[];
  /** 详情页链接 */
  detailPath: string;
  /** 链接文字（默认"查看详情"） */
  linkText?: string;
  /** 加载状态 */
  loading?: boolean;
  /** 自定义 sx */
  sx?: import('@mui/material/styles').SxProps<import('@mui/material/styles').Theme>;
}

export const RelatedModuleCard: React.FC<RelatedModuleCardProps> = ({
  moduleCode,
  moduleName,
  moduleIcon,
  items,
  detailPath,
  linkText = '查看详情',
  loading = false,
  sx,
}) => {
  const { isPluginInstalled } = usePlugins();
  const navigate = useNavigate();

  // 关联模块未安装时不渲染
  if (!isPluginInstalled(moduleCode)) return null;

  return (
    <Card
      variant='outlined'
      sx={{
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        ...sx,
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        {/* 头部: 模块名 + 链接按钮 */}
        <Box
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {moduleIcon || <ExternalLink sx={{ width: 16, height: 16, color: 'primary.main' }} />}
            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600, fontSize: 13 }}
            >
              关联数据 ({moduleName})
            </Typography>
          </Box>
          <Button
            size='small'
            endIcon={<ArrowRight sx={{ width: 14 }} />}
            onClick={() => navigate(detailPath)}
            sx={{ textTransform: 'none', fontSize: 12 }}
          >
            {linkText}
          </Button>
        </Box>

        <Divider sx={{ mb: 1.5 }} />

        {/* 数据列表 */}
        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {[1, 2, 3].map((i) => (
              <Skeleton
                key={i}
                height={28}
                sx={{ borderRadius: 1 }}
              />
            ))}
          </Box>
        ) : items.length > 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {items.map((item, index) => (
              <Box
                key={index}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  py: 0.5,
                }}
              >
                <Typography
                  variant='body2'
                  color='text.secondary'
                  sx={{ fontSize: 13 }}
                >
                  {item.label}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography
                    variant='body2'
                    sx={{ fontWeight: 600, fontSize: 13 }}
                  >
                    {item.value}
                  </Typography>
                  {item.trend === 'up' && (
                    <TrendingUp sx={{ width: 14, height: 14, color: 'success.main' }} />
                  )}
                </Box>
              </Box>
            ))}
          </Box>
        ) : (
          <Typography
            variant='body2'
            color='text.secondary'
            sx={{ fontSize: 13, textAlign: 'center', py: 1 }}
          >
            暂无关联数据
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default RelatedModuleCard;
