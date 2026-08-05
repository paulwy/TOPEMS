/**
 * V44.0 Track D: BFF 详情页模板组件
 *
 * 功能:
 * - 根据 schema/fieldGroups 自动渲染详情字段
 * - 支持关联数据加载（嵌套查询）
 * - 支持编辑模式切换
 * - 支持缓存 + 预加载
 * - 响应式布局
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  Button,
  IconButton,
  Tooltip,
  Divider,
  Skeleton,
  Tabs,
  Tab,
} from '@mui/material';
import { ArrowLeft, Edit, Delete, RefreshCw, Copy, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useBffCrud from '@/hooks/bff/useBffCrud';
import type { UseBffCrudOptions } from '@/hooks/bff/useBffCrud';
import { useNotificationStore } from '@/store';

// ============ 类型定义 ============

export interface DetailFieldConfig {
  /** 字段名 */
  key: string;
  /** 显示标签 */
  label: string;
  /** 字段类型 */
  type?: 'text' | 'number' | 'date' | 'datetime' | 'badge' | 'status' | 'copy' | 'custom';
  /** 占位值 */
  placeholder?: string;
  /** 是否可复制 */
  copyable?: boolean;
  /** 自定义渲染 */
  render?: (value: unknown, data: Record<string, unknown>) => React.ReactNode;
  /** 状态颜色映射（status 类型） */
  statusColorMap?: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info'>;
  /** 日期格式 */
  dateFormat?: string;
  /** 网格跨度 */
  span?: 1 | 2 | 3 | 4 | 6 | 12;
}

export interface FieldGroup {
  /** 分组标题 */
  title: string;
  /** 分组描述 */
  description?: string;
  /** 字段列表 */
  fields: DetailFieldConfig[];
}

export interface RelatedQuery {
  /** 查询 key */
  key: string;
  /** 标签页名称 */
  label: string;
  /** 图标 */
  icon?: React.ReactNode;
  /** 关联数据渲染 */
  render: (data: unknown) => React.ReactNode;
  /** 是否预加载 */
  preload?: boolean;
  /** 徽标数量 */
  badge?: number;
}

export interface BffDetailPageProps<T = unknown> {
  /** 实体类型 */
  entityType: string;
  /** 服务名 */
  service: string;
  /** 实体 ID */
  entityId?: string;
  /** React Query key */
  queryKey: unknown[];
  /** 页面标题 */
  title?: string;
  /** 页面副标题 */
  subtitle?: string;
  /** 字段分组配置 */
  fieldGroups: FieldGroup[];
  /** 关联数据查询 */
  relatedQueries?: RelatedQuery[];
  /** 返回路径 */
  backPath?: string;
  /** 返回回调 */
  onBack?: () => void;
  /** 编辑回调 */
  onEdit?: (data: T) => void;
  /** 删除回调 */
  onDelete?: (data: T) => void;
  /** 删除成功后跳转路径 */
  deleteRedirectPath?: string;
  /** 自定义操作按钮 */
  actions?: React.ReactNode;
  /** 实体名称（用于通知） */
  entityName?: string;
  /** 头部右侧信息卡片 */
  infoCard?: {
    avatar?: React.ReactNode;
    title?: string;
    subtitle?: React.ReactNode;
    tags?: string[];
    stats?: Array<{ label: string; value: React.ReactNode }>;
  };
  /** 缓存新鲜时间 */
  staleTime?: number;
  /** 是否显示加载骨架 */
  showSkeleton?: boolean;
}

// ============ 辅助组件 ============

function DetailField({
  config,
  value,
  data,
}: {
  config: DetailFieldConfig;
  value: unknown;
  data: Record<string, unknown>;
}) {
  const [copied, setCopied] = useState(false);

  const displayValue = value ?? config.placeholder ?? '-';

  const handleCopy = useCallback(async () => {
    if (value === null || value === undefined) return;
    try {
      await navigator.clipboard.writeText(String(value));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }, [value]);

  let content: React.ReactNode = String(displayValue);

  if (config.render) {
    content = config.render(value, data);
  } else if (config.type === 'status' || config.type === 'badge') {
    const color = config.statusColorMap?.[String(value)] ?? 'default';
    content = (
      <Chip
        label={String(displayValue)}
        size='small'
        color={color}
        variant='outlined'
      />
    );
  } else if (config.type === 'copy') {
    content = (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <span>{String(displayValue)}</span>
        <IconButton
          size='small'
          onClick={handleCopy}
          sx={{ ml: -0.5 }}
        aria-label="确认"
        >
          {copied ? (
            <Check
              size={14}
              color='success'
            />
          ) : (
            <Copy size={14} />
          )}
        </IconButton>
      </Box>
    );
  } else if (config.type === 'date' && value) {
    try {
      const date = new Date(value as string);
      content = date.toLocaleDateString('zh-CN');
    } catch {
      content = String(value);
    }
  } else if (config.type === 'datetime' && value) {
    try {
      const date = new Date(value as string);
      content = date.toLocaleString('zh-CN');
    } catch {
      content = String(value);
    }
  }

  return (
    <Box>
      <Typography
        variant='caption'
        color='text.secondary'
        sx={{ mb: 0.5, display: 'block' }}
      >
        {config.label}
      </Typography>
      <Typography variant='body2'>{content}</Typography>
    </Box>
  );
}

function FieldGroupSection({
  group,
  data,
  loading,
}: {
  group: FieldGroup;
  data: Record<string, unknown>;
  loading: boolean;
}) {
  return (
    <Paper
      elevation={0}
      sx={{ p: 3, border: 1, borderColor: 'divider', borderRadius: 2 }}
    >
      <Box sx={{ mb: 2 }}>
        <Typography
          variant='subtitle1'
          sx={{ fontWeight: 'bold' }}
        >
          {group.title}
        </Typography>
        {group.description && (
          <Typography
            variant='body2'
            color='text.secondary'
          >
            {group.description}
          </Typography>
        )}
      </Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(1, 1fr)',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(12, 1fr)',
          },
          gap: 2,
        }}
      >
        {group.fields.map((field) => {
          const value = data[field.key];
          const span = field.span ?? 3;
          return (
            <Box
              sx={{
                gridColumn: {
                  xs: 'span 1',
                  sm: 'span 1',
                  md: `span ${span * 2}`,
                },
              }}
              key={field.key}
            >
              {loading ? (
                <Box>
                  <Skeleton
                    width={80}
                    height={16}
                    sx={{ mb: 0.5 }}
                  />
                  <Skeleton
                    width={120}
                    height={20}
                  />
                </Box>
              ) : (
                <DetailField
                  config={field}
                  value={value}
                  data={data}
                />
              )}
            </Box>
          );
        })}
      </Box>
    </Paper>
  );
}

// ============ 主组件 ============

function BffDetailPageInner<T extends { id?: string; [key: string]: unknown }>(
  props: BffDetailPageProps<T>
) {
  const {
    entityType,
    service,
    entityId,
    queryKey,
    title,
    subtitle,
    fieldGroups,
    relatedQueries = [],
    backPath,
    onBack,
    onEdit,
    onDelete,
    deleteRedirectPath,
    actions,
    entityName,
    infoCard,
    staleTime,
    showSkeleton = true,
  } = props;

  const navigate = useNavigate();
  const addNotification = useNotificationStore((state) => state.addNotification);

  const [activeTab, setActiveTab] = useState(0);
  const [relatedData, setRelatedData] = useState<Record<string, unknown>>({});
  const [relatedLoading, setRelatedLoading] = useState<Record<string, boolean>>({});

  const crudOptions: UseBffCrudOptions<T> = {
    service,
    entityType,
    queryKey,
    autoFetch: false,
    entityName,
    staleTime,
  };

  const crud = useBffCrud<T>(crudOptions);

  const currentData = crud.listQuery.data?.items[0] ?? null;
  const dataObj = (currentData as Record<string, unknown>) ?? {};

  useEffect(() => {
    if (entityId) {
      crud.get(entityId);
    }
  }, [entityId]);

  const handleBack = useCallback(() => {
    if (onBack) {
      onBack();
    } else if (backPath) {
      navigate(backPath);
    } else {
      navigate(-1);
    }
  }, [onBack, backPath, navigate]);

  const handleEdit = useCallback(() => {
    if (onEdit && currentData) {
      onEdit(currentData);
    }
  }, [onEdit, currentData]);

  const handleDelete = useCallback(async () => {
    if (!entityId || !currentData) return;
    const confirmed = window.confirm(`确定要删除这条${entityName ?? '记录'}吗？`);
    if (!confirmed) return;

    try {
      await crud.delete(entityId);
      if (deleteRedirectPath) {
        navigate(deleteRedirectPath);
      } else if (backPath) {
        navigate(backPath);
      }
    } catch {
      // error handled in crud
    }
  }, [entityId, currentData, crud, entityName, deleteRedirectPath, backPath, navigate]);

  const loadRelated = useCallback(
    async (key: string) => {
      if (relatedLoading[key]) return;
      setRelatedLoading((prev) => ({ ...prev, [key]: true }));
      try {
        const { bffGraphQL } = await import('@/api/bff');
        const queryConfig = relatedQueries.some((q) => q.key === key);
        if (queryConfig) {
          const result = await bffGraphQL(
            `
            query GetRelated${key}($id: String!) {
              ${key}(id: $id) {
                id
              }
            }
          `,
            { id: entityId }
          );
          setRelatedData((prev) => ({ ...prev, [key]: result }));
        }
      } catch (err) {
        addNotification({
          title: '加载失败',
          message: '关联数据加载失败',
          type: 'error',
        });
      } finally {
        setRelatedLoading((prev) => ({ ...prev, [key]: false }));
      }
    },
    [relatedLoading, relatedQueries, entityId, addNotification]
  );

  useEffect(() => {
    relatedQueries.forEach((q) => {
      if (q.preload) {
        loadRelated(q.key);
      }
    });
  }, []);

  const displayTitle = String(title ?? dataObj.name ?? dataObj.title ?? entityName ?? '详情');
  const displaySubtitle = subtitle ?? (dataObj.code as string) ?? '';

  const loading = crud.loading;

  return (
    <Box sx={{ width: '100%' }}>
      {/* 头部 */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          border: 1,
          borderColor: 'divider',
          borderRadius: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <IconButton
            onClick={handleBack}
            size='small'
          aria-label="返回"
          >
            <ArrowLeft size={20} />
          </IconButton>
          <Box sx={{ flex: 1 }}>
            {loading ? (
              <Box>
                <Skeleton
                  width={200}
                  height={28}
                />
                <Skeleton
                  width={150}
                  height={20}
                  sx={{ mt: 1 }}
                />
              </Box>
            ) : (
              <>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 'bold' }}
                >
                  {displayTitle}
                </Typography>
                {displaySubtitle && (
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary' }}
                  >
                    {displaySubtitle}
                  </Typography>
                )}
              </>
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title='刷新'>
              <IconButton
                onClick={() => entityId && crud.get(entityId)}
                size='small'
              aria-label="刷新"
              >
                <RefreshCw size={18} />
              </IconButton>
            </Tooltip>
            {onEdit && (
              <Tooltip title='编辑'>
                <IconButton
                  onClick={handleEdit}
                  size='small'
                aria-label="编辑"
                >
                  <Edit size={18} />
                </IconButton>
              </Tooltip>
            )}
            {onDelete && (
              <Tooltip title='删除'>
                <IconButton
                  onClick={handleDelete}
                  size='small'
                  color='error'
                aria-label="删除"
                >
                  <Delete size={18} />
                </IconButton>
              </Tooltip>
            )}
            {actions}
          </Box>
        </Box>

        {infoCard && (
          <>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
              {infoCard.avatar}
              <Box sx={{ flex: 1, minWidth: 200 }}>
                {infoCard.title && <Typography variant='h6'>{infoCard.title}</Typography>}
                {infoCard.subtitle && (
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    {infoCard.subtitle}
                  </Typography>
                )}
                {infoCard.tags && infoCard.tags.length > 0 && (
                  <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {infoCard.tags.map((tag, i) => (
                      <Chip
                        key={i}
                        label={tag}
                        size='small'
                        variant='outlined'
                      />
                    ))}
                  </Box>
                )}
              </Box>
              {infoCard.stats && (
                <Box sx={{ display: 'flex', gap: 3 }}>
                  {infoCard.stats.map((stat, i) => (
                    <Box
                      key={i}
                      sx={{ textAlign: 'center' }}
                    >
                      <Typography variant='h6'>{stat.value}</Typography>
                      <Typography
                        variant='caption'
                        color='text.secondary'
                      >
                        {stat.label}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          </>
        )}
      </Paper>

      {/* 标签页（关联数据） */}
      {relatedQueries.length > 0 && (
        <Paper
          elevation={0}
          sx={{
            mb: 3,
            border: 1,
            borderColor: 'divider',
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
          >
            <Tab label='基本信息' />
            {relatedQueries.map((q, _i) => {
              const icon = React.isValidElement(q.icon) ? q.icon : undefined;
              return (
                <Tab
                  key={q.key}
                  label={q.label}
                  icon={icon}
                />
              );
            })}
          </Tabs>

          <Box sx={{ p: 0 }}>
            {activeTab === 0 && <Box sx={{ p: 2 }}>{/* 字段分组内容会在下面渲染 */}</Box>}
            {relatedQueries.map((q, i) => (
              <Box
                key={q.key}
                sx={{ p: 2, display: activeTab === i + 1 ? 'block' : 'none' }}
              >
                {relatedLoading[q.key] ? (
                  <Box sx={{ py: 4 }}>
                    <Skeleton
                      variant='rectangular'
                      height={200}
                    />
                  </Box>
                ) : relatedData[q.key] ? (
                  q.render(relatedData[q.key])
                ) : (
                  <Box sx={{ py: 4, textAlign: 'center' }}>
                    <Button
                      variant='outlined'
                      onClick={() => loadRelated(q.key)}
                    >
                      加载数据
                    </Button>
                  </Box>
                )}
              </Box>
            ))}
          </Box>
        </Paper>
      )}

      {/* 字段分组 */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {fieldGroups.map((group, index) => (
          <FieldGroupSection
            key={index}
            group={group}
            data={dataObj}
            loading={loading && showSkeleton}
          />
        ))}
      </Box>
    </Box>
  );
}

export const BffDetailPage = React.memo(BffDetailPageInner) as typeof BffDetailPageInner;

export default BffDetailPage;
