import {
  Typography,
  Box,
  InputLabel,
  Chip,
  Card,
  CardContent,
  Paper,
  type ChipProps,
} from '@mui/material';
import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Package, MapPin, CheckCircle, Factory, Truck, Boxes } from 'lucide-react';
import { PageContainer } from '@/components/common/PageContainerV2';
import { DetailPageTemplate, type TabConfig } from '@/components/templates';
import { traceabilityApi } from '@/api/mes';
import type { TraceChain, QualityRecord } from '@/api/mes';
import { apiLogger } from '@/utils/logger';
import { designTokens } from '@/theme/tokens';
import { useAppStore } from '@/store';

const ct = designTokens.colors;

const TraceabilityDetailPage: React.FC = () => {
  const { batchNo } = useParams<{ batchNo: string }>();
  const { addNotification } = useAppStore();

  const [traceChain, setTraceChain] = useState<TraceChain | null>(null);
  const [qualityRecords, setQualityRecords] = useState<QualityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (batchNo) {
      loadTraceability(batchNo);
    }
  }, [batchNo]);

  const loadTraceability = async (batch: string) => {
    setLoading(true);
    setErrorMessage(undefined);
    try {
      const [chainRes, qualityRes] = await Promise.all([
        traceabilityApi.getTraceChain({ type: 'backward', identifier: batch }),
        traceabilityApi.listQualityRecords({ search: batch }),
      ]);

      if (chainRes.success && chainRes.data) {
        setTraceChain(chainRes.data);
      } else {
        throw new Error(chainRes.message || '加载追溯信息失败');
      }

      if (qualityRes.success && qualityRes.data) {
        setQualityRecords(qualityRes.data.records || []);
      }
    } catch (err: unknown) {
      apiLogger.error('Failed to load traceability:', err);
      setErrorMessage('加载物料追溯详情失败');
      addNotification({
        type: 'error',
        title: '加载失败',
        message: '无法加载物料追溯详情',
      });
    } finally {
      setLoading(false);
    }
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'raw_material':
        return (
          <Boxes
            size={20}
            color='secondary.600'
          />
        );
      case 'production':
        return (
          <Factory
            size={20}
            color='primary.dark'
          />
        );
      case 'finished_goods':
        return (
          <Package
            size={20}
            color='success.600'
          />
        );
      case 'shipping':
        return (
          <Truck
            size={20}
            color='error.700'
          />
        );
      case 'quality':
        return (
          <CheckCircle
            size={20}
            color={ct.success[600]}
          />
        );
      default:
        return (
          <MapPin
            size={20}
            color='grey.500'
          />
        );
    }
  };

  const getNodeTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      raw_material: '原料',
      production: '生产',
      finished_goods: '成品',
      shipping: '物流',
      quality: '质检',
      warehouse: '仓库',
      process: '工序',
    };
    return typeMap[type] || type;
  };

  const getNodeTypeColor = (type: string): ChipProps['color'] => {
    switch (type) {
      case 'raw_material':
        return 'primary';
      case 'production':
        return 'info';
      case 'finished_goods':
        return 'success';
      case 'shipping':
        return 'error';
      case 'quality':
        return 'warning';
      default:
        return 'default';
    }
  };

  const formatDate = (date: string | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('zh-CN');
  };

  // 追溯链条内容
  const traceChainContent = useMemo(() => {
    if (!traceChain || traceChain.nodes.length === 0) {
      return <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>暂无追溯数据</Box>;
    }

    const sortedNodes = [...traceChain.nodes].sort((a, b) => {
      if (a.timestamp && b.timestamp) {
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      }
      return 0;
    });

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {sortedNodes.map((node, index) => (
          <Box
            key={node.id}
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 2,
            }}
          >
            {/* 时间线连接线 */}
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                width: 40,
              }}
            >
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  bgcolor: 'background.paper',
                  border: '2px solid',
                  borderColor: 'primary.main',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1,
                }}
              >
                {getNodeIcon(node.type)}
              </Box>
              {index < sortedNodes.length - 1 && (
                <Box
                  sx={{
                    width: 2,
                    flex: 1,
                    minHeight: 60,
                    bgcolor: 'divider',
                    my: 1,
                  }}
                />
              )}
            </Box>

            {/* 节点内容 */}
            <Paper
              variant='outlined'
              sx={{
                flex: 1,
                mb: index < sortedNodes.length - 1 ? 2 : 0,
                p: 2,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  mb: 1,
                }}
              >
                <Box>
                  <Typography
                    variant='subtitle2'
                    sx={{ fontWeight: 600 }}
                  >
                    {node.name}
                  </Typography>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    {node.code}
                  </Typography>
                </Box>
                <Chip
                  label={getNodeTypeLabel(node.type)}
                  color={getNodeTypeColor(node.type)}
                  size='small'
                />
              </Box>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  gap: 1,
                  mt: 1,
                }}
              >
                {node.batch_no && (
                  <Box>
                    <InputLabel sx={{ fontSize: 11, color: 'text.secondary' }}>批次号</InputLabel>
                    <Typography
                      variant='body2'
                      sx={{ fontFamily: 'monospace' }}
                    >
                      {node.batch_no}
                    </Typography>
                  </Box>
                )}
                {node.quantity !== undefined && (
                  <Box>
                    <InputLabel sx={{ fontSize: 11, color: 'text.secondary' }}>数量</InputLabel>
                    <Typography variant='body2'>{node.quantity}</Typography>
                  </Box>
                )}
                {node.timestamp && (
                  <Box>
                    <InputLabel sx={{ fontSize: 11, color: 'text.secondary' }}>时间</InputLabel>
                    <Typography variant='body2'>{formatDate(node.timestamp)}</Typography>
                  </Box>
                )}
              </Box>
            </Paper>
          </Box>
        ))}
      </Box>
    );
  }, [traceChain]);

  // 批次基本信息
  const batchInfoContent = useMemo(() => {
    if (!traceChain || traceChain.nodes.length === 0) return null;

    const rootNode = traceChain.nodes.find((n) => n.id === traceChain.root_id);
    if (!rootNode) return null;

    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
          gap: 3,
        }}
      >
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>批次号</InputLabel>
          <Typography sx={{ fontWeight: 'medium', mt: 0.5, fontFamily: 'monospace' }}>
            {rootNode.batch_no || '-'}
          </Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>产品名称</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{rootNode.name || '-'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>产品编码</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{rootNode.code || '-'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>数量</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{rootNode.quantity || '-'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>追溯方向</InputLabel>
          <Typography sx={{ mt: 0.5 }}>
            {traceChain.direction === 'forward' ? '正向追溯' : '反向追溯'}
          </Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>追溯节点数</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{traceChain.nodes.length}</Typography>
        </Box>
      </Box>
    );
  }, [traceChain]);

  // 质检记录内容
  const qualityContent = useMemo(() => {
    if (qualityRecords.length === 0) {
      return (
        <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>暂无质量检验记录</Box>
      );
    }

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {qualityRecords.map((record) => (
          <Card
            key={record.id}
            variant='outlined'
          >
            <CardContent>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  mb: 2,
                }}
              >
                <Box>
                  <Typography
                    variant='subtitle2'
                    sx={{ fontWeight: 600 }}
                  >
                    {record.batch_no}
                  </Typography>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    {record.inspection_type}
                    {record.inspection_time && ` - ${formatDate(record.inspection_time)}`}
                  </Typography>
                </Box>
                <Chip
                  label={record.status === 'qualified' ? '合格' : '不合格'}
                  color={record.status === 'qualified' ? 'success' : 'error'}
                  size='small'
                />
              </Box>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
                  gap: 2,
                }}
              >
                <Box>
                  <InputLabel sx={{ fontSize: 11, color: 'text.secondary' }}>检验数量</InputLabel>
                  <Typography
                    variant='body2'
                    sx={{ fontWeight: 500 }}
                  >
                    {record.quantity}
                  </Typography>
                </Box>
                <Box>
                  <InputLabel sx={{ fontSize: 11, color: 'text.secondary' }}>合格数量</InputLabel>
                  <Typography
                    variant='body2'
                    sx={{ fontWeight: 500, color: 'success.main' }}
                  >
                    {record.qualified_quantity}
                  </Typography>
                </Box>
                <Box>
                  <InputLabel sx={{ fontSize: 11, color: 'text.secondary' }}>不合格数量</InputLabel>
                  <Typography
                    variant='body2'
                    sx={{ fontWeight: 500, color: 'error.main' }}
                  >
                    {record.unqualified_quantity}
                  </Typography>
                </Box>
                <Box>
                  <InputLabel sx={{ fontSize: 11, color: 'text.secondary' }}>合格率</InputLabel>
                  <Typography
                    variant='body2'
                    sx={{ fontWeight: 500 }}
                  >
                    {(record.qualification_rate * 100).toFixed(1)}%
                  </Typography>
                </Box>
              </Box>
              {record.inspector && (
                <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                  <InputLabel sx={{ fontSize: 11, color: 'text.secondary' }}>检验员</InputLabel>
                  <Typography variant='body2'>{record.inspector}</Typography>
                </Box>
              )}
              {record.result && (
                <Box sx={{ mt: 2 }}>
                  <InputLabel sx={{ fontSize: 11, color: 'text.secondary' }}>检验结果</InputLabel>
                  <Typography variant='body2'>{record.result}</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        ))}
      </Box>
    );
  }, [qualityRecords]);

  const tabs = useMemo<TabConfig[]>(
    () => [
      { id: 'chain', label: '追溯链条', content: traceChainContent || <></> },
      { id: 'batch', label: '批次信息', content: batchInfoContent || <></> },
      { id: 'quality', label: '质检记录', content: qualityContent || <></> },
    ],
    [traceChainContent, batchInfoContent, qualityContent]
  );

  const infoCard = useMemo(() => {
    const rootNode = traceChain?.nodes.find((n) => n.id === traceChain.root_id);
    return {
      avatar: (
        <Package
          size={32}
          color='secondary.600'
        />
      ),
      title: rootNode?.name,
      subtitle: rootNode?.batch_no || undefined,
      tags: [traceChain?.direction === 'forward' ? '正向追溯' : '反向追溯'],
      stats: [
        { label: '产品编码', value: rootNode?.code || '-' },
        { label: '追溯节点', value: `${traceChain?.nodes.length || 0} 个` },
      ],
    };
  }, [traceChain]);

  return (
    <PageContainer
      autoTitle
      autoBreadcrumbs
      headerProps={{
        pageIcon: <MapPin style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.secondary.main} 0%, ${ct.secondary[900]} 100%)`,
      }}
    >
      <DetailPageTemplate
        title=''
        subtitle=''
        backHref='/mes/quality-traceability'
        loading={loading}
        error={errorMessage}
        infoCard={infoCard}
        tabs={tabs}
      />
    </PageContainer>
  );
};

export default TraceabilityDetailPage;
