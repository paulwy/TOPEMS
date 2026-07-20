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
import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { Package, MapPin, CheckCircle, Factory, Truck, Boxes } from 'lucide-react';
import { PageContainer } from '@/components/common/PageContainerV2';
import { DetailPageTemplate, type TabConfig } from '@/components/templates';
import { traceabilityApi } from '@/api/mes';
import type { TraceChain, QualityRecord } from '@/api/mes';
import { designTokens } from '@/theme/tokens';
import { MES_PATHS } from '@/modules/mes/config';

const ct = designTokens.colors;

const TraceabilityDetailPage: React.FC = () => {
  const { t } = useTranslation();
  const { batchNo } = useParams<{ batchNo: string }>();

  const {
    data: traceChain,
    isLoading: chainLoading,
    error: chainError,
  } = useQuery<TraceChain | null>({
    queryKey: batchNo
      ? QUERY_KEYS.MES.TRACEABILITY_CHAIN(batchNo)
      : ['mes', 'traceability', 'chain', 'null'],
    queryFn: async () => {
      if (!batchNo) return null;
      const res = await traceabilityApi.getTraceChain({ type: 'backward', identifier: batchNo });
      if (res.success && res.data) {
        return res.data;
      }
      throw new Error(res.message || t('mes.traceability_detail_page.notifications.load_error.message'));
    },
    enabled: !!batchNo,
  });

  const { data: qualityRecordsData } = useQuery<QualityRecord[]>({
    queryKey: batchNo
      ? QUERY_KEYS.MES.TRACEABILITY_QUALITY_RECORDS(batchNo)
      : ['mes', 'traceability', 'quality-records', 'null'],
    queryFn: async () => {
      if (!batchNo) return [];
      const res = await traceabilityApi.listQualityRecords({ search: batchNo });
      if (res.success && res.data) {
        return res.data.records || [];
      }
      return [];
    },
    enabled: !!batchNo,
  });

  const qualityRecords = qualityRecordsData || [];
  const loading = chainLoading;
  const errorMessage = chainError
    ? (chainError as Error).message || t('mes.traceability_detail_page.notifications.load_error.message')
    : undefined;

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
      raw_material: t('mes.traceability_detail_page.node_type_raw_material'),
      production: t('mes.traceability_detail_page.node_type_production'),
      finished_goods: t('mes.traceability_detail_page.node_type_finished_goods'),
      shipping: t('mes.traceability_detail_page.node_type_shipping'),
      quality: t('mes.traceability_detail_page.node_type_quality'),
      warehouse: t('mes.traceability_detail_page.node_type_warehouse'),
      process: t('mes.traceability_detail_page.node_type_process'),
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
      return <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>{t('mes.traceability_detail_page.no_trace_data')}</Box>;
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
                    <InputLabel sx={{ fontSize: 11, color: 'text.secondary' }}>{t('mes.traceability_detail_page.field_batch_no')}</InputLabel>
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
                    <InputLabel sx={{ fontSize: 11, color: 'text.secondary' }}>{t('mes.traceability_detail_page.field_quantity')}</InputLabel>
                    <Typography variant='body2'>{node.quantity}</Typography>
                  </Box>
                )}
                {node.timestamp && (
                  <Box>
                    <InputLabel sx={{ fontSize: 11, color: 'text.secondary' }}>{t('mes.traceability_detail_page.field_time')}</InputLabel>
                    <Typography variant='body2'>{formatDate(node.timestamp)}</Typography>
                  </Box>
                )}
              </Box>
            </Paper>
          </Box>
        ))}
      </Box>
    );
  }, [traceChain, t]);

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
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>{t('mes.traceability_detail_page.field_batch_no')}</InputLabel>
          <Typography sx={{ fontWeight: 'medium', mt: 0.5, fontFamily: 'monospace' }}>
            {rootNode.batch_no || '-'}
          </Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>{t('mes.traceability_detail_page.field_product_name')}</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{rootNode.name || '-'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>{t('mes.traceability_detail_page.field_product_code')}</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{rootNode.code || '-'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>{t('mes.traceability_detail_page.field_quantity')}</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{rootNode.quantity || '-'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>{t('mes.traceability_detail_page.field_trace_direction')}</InputLabel>
          <Typography sx={{ mt: 0.5 }}>
            {traceChain.direction === 'forward' ? t('mes.traceability_detail_page.direction_forward') : t('mes.traceability_detail_page.direction_backward')}
          </Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>{t('mes.traceability_detail_page.field_node_count')}</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{traceChain.nodes.length}</Typography>
        </Box>
      </Box>
    );
  }, [traceChain, t]);

  // 质检记录内容
  const qualityContent = useMemo(() => {
    if (qualityRecords.length === 0) {
      return (
        <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>{t('mes.traceability_detail_page.no_quality_records')}</Box>
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
                  label={record.status === 'qualified' ? t('mes.traceability_detail_page.result_qualified') : t('mes.traceability_detail_page.result_unqualified')}
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
                  <InputLabel sx={{ fontSize: 11, color: 'text.secondary' }}>{t('mes.traceability_detail_page.field_inspection_quantity')}</InputLabel>
                  <Typography
                    variant='body2'
                    sx={{ fontWeight: 500 }}
                  >
                    {record.quantity}
                  </Typography>
                </Box>
                <Box>
                  <InputLabel sx={{ fontSize: 11, color: 'text.secondary' }}>{t('mes.traceability_detail_page.field_qualified_quantity')}</InputLabel>
                  <Typography
                    variant='body2'
                    sx={{ fontWeight: 500, color: 'success.main' }}
                  >
                    {record.qualified_quantity}
                  </Typography>
                </Box>
                <Box>
                  <InputLabel sx={{ fontSize: 11, color: 'text.secondary' }}>{t('mes.traceability_detail_page.field_unqualified_quantity')}</InputLabel>
                  <Typography
                    variant='body2'
                    sx={{ fontWeight: 500, color: 'error.main' }}
                  >
                    {record.unqualified_quantity}
                  </Typography>
                </Box>
                <Box>
                  <InputLabel sx={{ fontSize: 11, color: 'text.secondary' }}>{t('mes.traceability_detail_page.field_pass_rate')}</InputLabel>
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
                  <InputLabel sx={{ fontSize: 11, color: 'text.secondary' }}>{t('mes.traceability_detail_page.field_inspector')}</InputLabel>
                  <Typography variant='body2'>{record.inspector}</Typography>
                </Box>
              )}
              {record.result && (
                <Box sx={{ mt: 2 }}>
                  <InputLabel sx={{ fontSize: 11, color: 'text.secondary' }}>{t('mes.traceability_detail_page.field_test_result')}</InputLabel>
                  <Typography variant='body2'>{record.result}</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        ))}
      </Box>
    );
  }, [qualityRecords, t]);

  const tabs = useMemo<TabConfig[]>(
    () => [
      { id: 'chain', label: t('mes.traceability_detail_page.tab_chain'), content: traceChainContent || <></> },
      { id: 'batch', label: t('mes.traceability_detail_page.tab_batch_info'), content: batchInfoContent || <></> },
      { id: 'quality', label: t('mes.traceability_detail_page.tab_quality_records'), content: qualityContent || <></> },
    ],
    [t, traceChainContent, batchInfoContent, qualityContent]
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
      tags: [traceChain?.direction === 'forward' ? t('mes.traceability_detail_page.direction_forward') : t('mes.traceability_detail_page.direction_backward')],
      stats: [
        { label: t('mes.traceability_detail_page.field_product_code'), value: rootNode?.code || '-' },
        { label: t('mes.traceability_detail_page.stat_node_count_label'), value: t('mes.traceability_detail_page.stat_node_count', { count: traceChain?.nodes.length || 0 }) },
      ],
    };
  }, [traceChain, t]);

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
        backHref={MES_PATHS.traceability}
        loading={loading}
        error={errorMessage}
        infoCard={infoCard}
        tabs={tabs}
      />
    </PageContainer>
  );
};

export default TraceabilityDetailPage;
