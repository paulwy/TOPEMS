import React, { useMemo, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Search, BarChart3, Gauge } from 'lucide-react';
import {
  Box,
  Button,
  Card,
  Chip,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import { dshEnhancedApi } from '@/api/ai/dshEnhanced';
import { PageContainer } from '@/components/common';
import { useNotificationStore } from '@/store';
import { designTokens } from '@/theme/tokens';

const DshRagPage: React.FC = () => {
  const theme = useTheme();
  const { t } = useTranslation();
  const addNotification = useNotificationStore((s) => s.addNotification);

  const [tab, setTab] = useState(0);
  const [query, setQuery] = useState('');
  const [topK, setTopK] = useState(5);
  const [task, setTask] = useState('');
  const [toolName, setToolName] = useState('');

  const { data: ragStatsResp } = useQuery({
    queryKey: ['dsh-rag-stats'],
    queryFn: () => dshEnhancedApi.getRagStats(),
  });
  const ragStats = ragStatsResp?.data as Record<string, unknown> | undefined;

  const { data: perfResp } = useQuery({
    queryKey: ['dsh-agent-perf'],
    queryFn: () => dshEnhancedApi.getPerformanceMetrics(),
  });
  const perf = perfResp?.data as
    { execution?: Record<string, unknown>; tools?: unknown[]; history_size?: number } | undefined;
  const tools = useMemo(
    () => (Array.isArray(perf?.tools) ? (perf.tools as unknown as Record<string, unknown>[]) : []),
    [perf]
  );

  const { data: toolPerfResp } = useQuery({
    queryKey: ['dsh-agent-tool-perf', toolName],
    queryFn: () => dshEnhancedApi.getToolPerformance(toolName),
    enabled: !!toolName,
  });
  const toolPerf = toolPerfResp?.data as Record<string, unknown> | undefined;

  const { data: retrieveResp } = useQuery({
    queryKey: ['dsh-rag-retrieve', query, topK],
    queryFn: () => dshEnhancedApi.ragRetrieve({ query, top_k: topK }),
    enabled: query.length > 0,
  });
  const retrieve = retrieveResp?.data as
    | {
        documents?: unknown[];
        stats?: Record<string, unknown>;
        context?: string;
        rewritten_query?: string;
      }
    | undefined;
  const documents = useMemo(
    () =>
      Array.isArray(retrieve?.documents)
        ? (retrieve.documents as unknown as Record<string, unknown>[])
        : [],
    [retrieve]
  );

  const { data: multiResp } = useQuery({
    queryKey: ['dsh-multi-agent', task],
    queryFn: () => dshEnhancedApi.multiAgentExecute({ task }),
    enabled: task.length > 0,
  });
  const multi = multiResp?.data as Record<string, unknown> | undefined;

  const resetPerf = useMutation({
    mutationFn: () => dshEnhancedApi.resetPerformanceMetrics(),
    onSuccess: () => {
      addNotification({ type: 'success', message: t('ai.dshRag.k0') });
    },
  });

  const metric = (label: string, value: unknown, color = theme.palette.info[600]) => (
    <Card sx={{ p: 2.5, minWidth: 150, flex: 1 }}>
      <Typography
        variant='body2'
        color='text.secondary'
      >
        {label}
      </Typography>
      <Typography
        variant='h5'
        sx={{ fontWeight: 700, color }}
      >
        {String(value ?? '-')}
      </Typography>
    </Card>
  );

  const tabStyle = { textTransform: 'none', fontWeight: 600 };
  const cellStyle = {
    color: 'text.secondary',
    fontSize: designTokens.typography.fontSize.scale['0.875rem'],
  };
  const emptyRow = (colspan: number) => (
    <TableRow>
      <TableCell
        colSpan={colspan}
        sx={{ textAlign: 'center', color: 'text.secondary' }}
      >
        {t('ai.dshRag.k1')}
      </TableCell>
    </TableRow>
  );

  const renderRetrieve = () => (
    <Stack spacing={2}>
      <Card sx={{ p: 3 }}>
        <Typography
          variant='subtitle2'
          sx={{ mb: 2 }}
        >
          {t('ai.dshRag.k2')}
        </Typography>
        <Stack
          direction='row'
          spacing={2}
          sx={{ alignItems: 'flex-start' }}
        >
          <TextField
            label={t('ai.dshRag.k3')}
            size='small'
            multiline
            minRows={2}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            sx={{ flex: 1 }}
          />
          <TextField
            label={t('ai.dshRag.k4')}
            size='small'
            type='number'
            value={topK}
            onChange={(e) => setTopK(Number(e.target.value))}
            sx={{ width: 110 }}
          />
        </Stack>
        {retrieve && (
          <Box sx={{ mt: 2 }}>
            <Typography
              variant='body2'
              color='text.secondary'
            >
              {t('ai.dshRag.k5')}: {retrieve.rewritten_query}
            </Typography>
          </Box>
        )}
      </Card>
      {retrieve && (
        <Card>
          <Typography
            variant='subtitle2'
            sx={{ p: 2 }}
          >
            {t('ai.dshRag.k6')}
          </Typography>
          <TableContainer>
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell>{t('ai.dshRag.k7')}</TableCell>
                  <TableCell>{t('ai.dshRag.k8')}</TableCell>
                  <TableCell>{t('ai.dshRag.k9')}</TableCell>
                  <TableCell>{t('ai.dshRag.k10')}</TableCell>
                  <TableCell>{t('ai.dshRag.k11')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {documents.length === 0 && emptyRow(5)}
                {documents.map((doc) => (
                  <TableRow key={String(doc.doc_id)}>
                    <TableCell sx={cellStyle}>{String(doc.doc_id)}</TableCell>
                    <TableCell>{String(doc.title)}</TableCell>
                    <TableCell sx={cellStyle}>{String(doc.source)}</TableCell>
                    <TableCell>
                      <Chip
                        size='small'
                        label={String(doc.score)}
                      />
                    </TableCell>
                    <TableCell sx={cellStyle}>{String(doc.retrieval_method)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}
      <Card sx={{ p: 3 }}>
        <Typography
          variant='subtitle2'
          sx={{ mb: 2 }}
        >
          {t('ai.dshRag.k12')}
        </Typography>
        <TextField
          label={t('ai.dshRag.k13')}
          size='small'
          multiline
          minRows={2}
          value={task}
          onChange={(e) => setTask(e.target.value)}
          sx={{ width: '100%' }}
        />
        {multi && (
          <Box sx={{ mt: 2 }}>
            <Typography variant='body2'>
              {t('ai.dshRag.k14')}: {String(multi.task_id)} / {t('ai.dshRag.k15')}:{' '}
              {String(multi.collaboration_mode)} / {t('ai.dshRag.k16')}: {String(multi.num_agents)}
            </Typography>
            <Typography
              variant='body2'
              sx={{ mt: 1, whiteSpace: 'pre-wrap' }}
            >
              {String(multi.result)}
            </Typography>
          </Box>
        )}
      </Card>
    </Stack>
  );

  const renderStats = () => (
    <Stack spacing={2}>
      <Stack
        direction='row'
        spacing={2}
        sx={{ flexWrap: 'wrap' }}
      >
        {metric(t('ai.dshRag.k17'), ragStats?.total_retrievals)}
        {metric(t('ai.dshRag.k18'), ragStats?.total_documents_retrieved)}
        {metric(t('ai.dshRag.k19'), ragStats?.avg_documents_per_query, theme.palette.warning[600])}
        {metric(t('ai.dshRag.k20'), ragStats?.query_rewrites)}
        {metric(t('ai.dshRag.k21'), ragStats?.rerank_count)}
        {metric(t('ai.dshRag.k22'), ragStats?.cache_hits, theme.palette.success[600])}
      </Stack>
    </Stack>
  );

  const renderPerformance = () => (
    <Stack spacing={2}>
      <Stack
        direction='row'
        spacing={2}
        sx={{ flexWrap: 'wrap' }}
      >
        {metric(t('ai.dshRag.k23'), perf?.execution?.total_executions)}
        {metric(t('ai.dshRag.k24'), perf?.execution?.avg_duration_ms, theme.palette.warning[600])}
        {metric(t('ai.dshRag.k25'), perf?.execution?.success_rate, theme.palette.success[600])}
        {metric(t('ai.dshRag.k26'), perf?.history_size)}
      </Stack>
      <Stack
        direction='row'
        spacing={2}
        sx={{ alignItems: 'center' }}
      >
        <Button
          variant='outlined'
          color='error'
          onClick={() => resetPerf.mutate()}
        >
          {t('ai.dshRag.k27')}
        </Button>
        <TextField
          label={t('ai.dshRag.k28')}
          size='small'
          value={toolName}
          onChange={(e) => setToolName(e.target.value)}
          sx={{ width: 220 }}
        />
      </Stack>
      {toolPerf && (
        <Card sx={{ p: 3 }}>
          <Typography variant='subtitle2'>{t('ai.dshRag.k29')}</Typography>
          <Typography
            variant='body2'
            sx={{ mt: 1 }}
          >
            {t('ai.dshRag.k30')}: {String(toolPerf.call_count ?? 0)} / {t('ai.dshRag.k31')}:{' '}
            {String(toolPerf.success_rate ?? 0)} / {t('ai.dshRag.k32')}:{' '}
            {String(toolPerf.avg_duration_ms ?? 0)}ms
          </Typography>
        </Card>
      )}
      <Card>
        <Typography
          variant='subtitle2'
          sx={{ p: 2 }}
        >
          {t('ai.dshRag.k33')}
        </Typography>
        <TableContainer>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>{t('ai.dshRag.k28')}</TableCell>
                <TableCell>{t('ai.dshRag.k34')}</TableCell>
                <TableCell>{t('ai.dshRag.k35')}</TableCell>
                <TableCell>{t('ai.dshRag.k36')}</TableCell>
                <TableCell>{t('ai.dshRag.k32')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tools.length === 0 && emptyRow(5)}
              {tools.map((tool) => (
                <TableRow key={String(tool.tool_name)}>
                  <TableCell>{String(tool.tool_name)}</TableCell>
                  <TableCell>{String(tool.call_count)}</TableCell>
                  <TableCell>{String(tool.success_count)}</TableCell>
                  <TableCell sx={cellStyle}>{String(tool.failure_count)}</TableCell>
                  <TableCell sx={cellStyle}>{String(tool.avg_duration_ms)}ms</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Stack>
  );

  return (
    <PageContainer
      headerProps={{
        pageIcon: <Search sx={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${theme.palette.success[500]} 0%, ${theme.palette.info[600]} 100%)`,
      }}
      maxWidth='xl'
    >
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab
          sx={tabStyle}
          icon={<Search style={{ width: 16, height: 16 }} />}
          iconPosition='start'
          label={t('ai.dshRag.k37')}
        />
        <Tab
          sx={tabStyle}
          icon={<BarChart3 style={{ width: 16, height: 16 }} />}
          iconPosition='start'
          label={t('ai.dshRag.k38')}
        />
        <Tab
          sx={tabStyle}
          icon={<Gauge style={{ width: 16, height: 16 }} />}
          iconPosition='start'
          label={t('ai.dshRag.k39')}
        />
      </Tabs>

      {tab === 0 && renderRetrieve()}
      {tab === 1 && renderStats()}
      {tab === 2 && renderPerformance()}
    </PageContainer>
  );
};

export default DshRagPage;
