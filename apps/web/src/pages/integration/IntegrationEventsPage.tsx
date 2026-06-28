/**
 * 集成事件日志页面
 * 展示所有集成事件的历史记录
 */

import React, { useState, useCallback, useMemo } from 'react';
import { PageContainer } from '@/components/common';
import { RefreshCw, Eye, ArrowRight } from 'lucide-react';
import { Box, Chip, Dialog, DialogTitle, DialogContent, Typography } from '@mui/material';

import { ListPageTemplate, type ColumnDef, type RowAction } from '@/components/templates';
import { useAppStore } from '@/store';
import { integrationApi } from '@/api/integration';
import type { IntegrationEvent } from '@/api/integration';
import { logger } from '@/utils/logger';
import { useNotification } from '@/hooks/useNotification';

// 状态配置
const STATUS_CONFIG: Record<
  string,
  { label: string; color: 'success' | 'warning' | 'error' | 'default' }
> = {
  synced: { label: '已同步', color: 'success' },
  pending: { label: '待处理', color: 'warning' },
  failed: { label: '失败', color: 'error' },
};

const IntegrationEventsPage: React.FC = () => {
  const { error } = useNotification();

  // 数据状态
  const [events, setEvents] = useState<IntegrationEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 0, pageSize: 10 });
  const [searchValue, setSearchValue] = useState('');

  // 筛选状态
  const [statusFilter, setStatusFilter] = useState<string>('');

  // 详情弹窗
  const [selectedEvent, setSelectedEvent] = useState<IntegrationEvent | null>(null);

  // 加载数据
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await integrationApi.listEvents();
      if (res.success && res.data !== undefined) {
        setEvents(res.data);
      }
    } catch (err: unknown) {
      logger.error('Error loading events:', err);
      error('加载事件数据失败');
    } finally {
      setLoading(false);
    }
  }, [error]);

  // 初始加载
  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // 筛选数据
  const filteredData = useMemo(() => {
    let result = events;

    // 状态筛选
    if (statusFilter) {
      result = result.filter((event) => event.status === statusFilter);
    }

    // 搜索筛选
    if (searchValue) {
      const keyword = searchValue.toLowerCase();
      result = result.filter(
        (event) =>
          event.source_system.toLowerCase().includes(keyword) ||
          event.target_system.toLowerCase().includes(keyword) ||
          event.event_type.toLowerCase().includes(keyword)
      );
    }

    return result;
  }, [events, searchValue, statusFilter]);

  // 表格列定义
  const columns: ColumnDef<IntegrationEvent>[] = [
    {
      id: 'sourcetarget',
      label: '集成路径',
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            label={row.source_system.toUpperCase()}
            size='small'
            sx={{ fontWeight: 600 }}
          />
          <ArrowRight
            size={16}
            style={{ color: 'text.disabled' }}
          />
          <Chip
            label={row.target_system.toUpperCase()}
            size='small'
            sx={{ fontWeight: 600 }}
          />
        </Box>
      ),
    },
    {
      id: 'event_type',
      label: '事件类型',
      sortable: true,
      render: (row) => <Box sx={{ fontWeight: 500 }}>{row.event_type}</Box>,
    },
    {
      id: 'source_record_id',
      label: '源记录 ID',
      render: (row) => (
        <Box
          sx={{
            fontSize: '0.75rem',
            color: 'text.secondary',
            fontFamily: 'monospace',
            maxWidth: 150,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
          title={row.source_record_id}
        >
          {row.source_record_id ? `${row.source_record_id.slice(0, 8)}...` : '-'}
        </Box>
      ),
    },
    {
      id: 'status',
      label: '状态',
      sortable: true,
      render: (row) => {
        const config = STATUS_CONFIG[row.status] || STATUS_CONFIG.pending;
        return (
          <Chip
            label={config.label}
            color={config.color}
            size='small'
          />
        );
      },
    },
    {
      id: 'error_message',
      label: '错误信息',
      render: (row) => (
        <Box
          sx={{
            fontSize: '0.75rem',
            color: row.error_message ? 'error.main' : 'text.secondary',
            maxWidth: 200,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={row.error_message}
        >
          {row.error_message || '-'}
        </Box>
      ),
    },
    {
      id: 'created_at',
      label: '创建时间',
      sortable: true,
      render: (row) => (
        <Box sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
          {new Date(row.created_at).toLocaleString('zh-CN')}
        </Box>
      ),
    },
  ];

  // 行操作
  const rowActions: RowAction<IntegrationEvent>[] = [
    {
      label: '查看详情',
      icon: <Eye size={14} />,
      onClick: (row) => setSelectedEvent(row),
    },
  ];

  return (
    <PageContainer
      title='集成事件日志'
      subtitle='查看所有集成事件的历史记录'
    >
      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={filteredData}
        loading={loading}
        pagination={{
          page: pagination.page,
          pageSize: pagination.pageSize,
          total: filteredData.length,
          onPageChange: (page) => setPagination((p) => ({ ...p, page })),
          onPageSizeChange: (pageSize) => setPagination({ page: 0, pageSize }),
        }}
        searchValue={searchValue}
        onSearch={setSearchValue}
        searchable
        searchPlaceholder='搜索事件...'
        filters={[
          {
            id: 'status',
            label: '状态',
            type: 'select',
            value: statusFilter,
            onChange: (value) => setStatusFilter(value || ''),
            options: [
              { label: '全部', value: '' },
              { label: '已同步', value: 'synced' },
              { label: '待处理', value: 'pending' },
              { label: '失败', value: 'failed' },
            ],
          },
        ]}
        rowActions={rowActions}
        onRefresh={loadData}
        emptyMessage='暂无集成事件'
      />

      {/* 详情弹窗 */}
      <Dialog
        open={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>事件详情</DialogTitle>
        <DialogContent>
          {selectedEvent && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    源系统
                  </Typography>
                  <Typography
                    variant='body2'
                    sx={{ fontWeight: 500 }}
                  >
                    {selectedEvent.source_system.toUpperCase()}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    目标系统
                  </Typography>
                  <Typography
                    variant='body2'
                    sx={{ fontWeight: 500 }}
                  >
                    {selectedEvent.target_system.toUpperCase()}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    事件类型
                  </Typography>
                  <Typography
                    variant='body2'
                    sx={{ fontWeight: 500 }}
                  >
                    {selectedEvent.event_type}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    状态
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    {(() => {
                      const config = STATUS_CONFIG[selectedEvent.status] || STATUS_CONFIG.pending;
                      return (
                        <Chip
                          label={config.label}
                          color={config.color}
                          size='small'
                        />
                      );
                    })()}
                  </Box>
                </Box>
              </Box>

              <Box>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  源记录 ID
                </Typography>
                <Typography
                  variant='body2'
                  sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}
                >
                  {selectedEvent.source_record_id || '-'}
                </Typography>
              </Box>

              <Box>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  目标记录 ID
                </Typography>
                <Typography
                  variant='body2'
                  sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}
                >
                  {selectedEvent.target_record_id || '-'}
                </Typography>
              </Box>

              {selectedEvent.error_message && (
                <Box>
                  <Typography
                    variant='caption'
                    color='error.main'
                  >
                    错误信息
                  </Typography>
                  <Typography
                    variant='body2'
                    sx={{ color: 'error.main', wordBreak: 'break-all' }}
                  >
                    {selectedEvent.error_message}
                  </Typography>
                </Box>
              )}

              {selectedEvent.payload && (
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    负载数据
                  </Typography>
                  <Box
                    sx={{
                      mt: 1,
                      p: 2,
                      bgcolor: 'grey.100',
                      borderRadius: 1,
                      fontFamily: 'monospace',
                      fontSize: '0.75rem',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                    }}
                  >
                    {JSON.stringify(selectedEvent.payload, null, 2)}
                  </Box>
                </Box>
              )}

              <Box>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  创建时间
                </Typography>
                <Typography variant='body2'>
                  {new Date(selectedEvent.created_at).toLocaleString('zh-CN')}
                </Typography>
              </Box>

              {selectedEvent.synced_at && (
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    同步时间
                  </Typography>
                  <Typography variant='body2'>
                    {new Date(selectedEvent.synced_at).toLocaleString('zh-CN')}
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
};

export default IntegrationEventsPage;
