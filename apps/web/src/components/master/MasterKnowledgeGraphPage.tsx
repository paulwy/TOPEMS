import React, { useMemo, useState } from 'react';
import styles from './MasterKnowledgeGraphPage.module.css';
import { formatDateTime } from '@/utils/date';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Network, Search, GitBranch, ThumbsUp } from 'lucide-react';
import {
  Button,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
import { knowledgeGraphApi } from '@/api/master/knowledgeGraph';
import { PageContainer } from '@/components/common';
import { useNotificationStore } from '@/store';
import { designTokens } from '@/theme/tokens';

const MasterKnowledgeGraphPage: React.FC = () => {
  const theme = useTheme();
  const { t } = useTranslation();
  const addNotification = useNotificationStore((s) => s.addNotification);

  const [tab, setTab] = useState(0);
  const [nodeId, setNodeId] = useState('KG-NODE-001');
  const [subgraphQuery, setSubgraphQuery] = useState('KG-NODE-001');
  const [keyword, setKeyword] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [nodeOpen, setNodeOpen] = useState(false);
  const [nodeForm, setNodeForm] = useState({ label: '', type: 'concept' });
  const [edgeOpen, setEdgeOpen] = useState(false);
  const [edgeForm, setEdgeForm] = useState({ from_node: '', to_node: '', relation: '' });
  const [pathOpen, setPathOpen] = useState(false);
  const [pathForm, setPathForm] = useState({ from_node: '', to_node: '' });

  const { data: statsResp } = useQuery({
    queryKey: ['master-kg-stats'],
    queryFn: () => knowledgeGraphApi.getAssetStats(),
  });
  const stats = statsResp?.data as
    | {
        total?: number;
        by_type?: Array<{ type: string; count: number }>;
        by_category?: Array<{ category: string; count: number }>;
      }
    | undefined;

  const { data: catResp } = useQuery({
    queryKey: ['master-kg-categories'],
    queryFn: () => knowledgeGraphApi.listCategories(),
  });
  const categories = useMemo(
    () =>
      Array.isArray(catResp?.data) ? (catResp.data as unknown as Record<string, unknown>[]) : [],
    [catResp]
  );

  const { data: subgraphResp } = useQuery({
    queryKey: ['master-kg-subgraph', subgraphQuery],
    queryFn: () => knowledgeGraphApi.getSubgraph(subgraphQuery, { depth: 2 }),
  });
  const subgraph = subgraphResp?.data as
    { nodes?: Array<Record<string, unknown>>; edges?: Array<Record<string, unknown>> } | undefined;

  const { data: searchResp } = useQuery({
    queryKey: ['master-kg-search', searchKeyword],
    queryFn: () => knowledgeGraphApi.searchAssets({ query: searchKeyword }),
    enabled: Boolean(searchKeyword),
  });
  const searchResults = useMemo(
    () =>
      Array.isArray(searchResp?.data)
        ? (searchResp.data as unknown as Record<string, unknown>[])
        : [],
    [searchResp]
  );

  const { data: recResp } = useQuery({
    queryKey: ['master-kg-recommendations'],
    queryFn: () => knowledgeGraphApi.getRecommendations('current-user'),
  });
  const recommendations = useMemo(
    () =>
      Array.isArray(recResp?.data) ? (recResp.data as unknown as Record<string, unknown>[]) : [],
    [recResp]
  );

  const addNode = useMutation({
    mutationFn: () => knowledgeGraphApi.addNode(nodeForm as never),
    onSuccess: () => {
      addNotification({ type: 'success', message: t('master.knowledgeGraph.k0') });
      setNodeOpen(false);
      setNodeForm({ label: '', type: 'concept' });
    },
  });
  const addEdge = useMutation({
    mutationFn: () => knowledgeGraphApi.addEdge(edgeForm as never),
    onSuccess: () => {
      addNotification({ type: 'success', message: t('master.knowledgeGraph.k1') });
      setEdgeOpen(false);
      setEdgeForm({ from_node: '', to_node: '', relation: '' });
    },
  });
  const findPath = useMutation({
    mutationFn: () =>
      knowledgeGraphApi.findPath({ from: pathForm.from_node, to: pathForm.to_node }),
    onSuccess: () => {
      addNotification({ type: 'success', message: t('master.knowledgeGraph.k2') });
      setPathOpen(false);
      setPathForm({ from_node: '', to_node: '' });
    },
  });

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
        {t('master.knowledgeGraph.k3')}
      </TableCell>
    </TableRow>
  );

  const renderOverview = () => (
    <Stack spacing={2}>
      <Card sx={{ p: 3 }}>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700 }}
        >
          {stats?.total ?? '-'}
        </Typography>
        <Typography
          variant='body2'
          color='text.secondary'
        >
          {t('master.knowledgeGraph.k4')}
        </Typography>
      </Card>
      <Stack
        direction='row'
        spacing={2}
        sx={{ flexWrap: 'wrap' }}
      >
        {Array.isArray(stats?.by_type) &&
          stats.by_type.map((b, i) => (
            <Card
              key={i}
              sx={{ p: 2, minWidth: 140, flex: 1 }}
            >
              <Typography
                variant='body2'
                color='text.secondary'
              >
                {b.type}
              </Typography>
              <Typography
                variant='h6'
                sx={{ fontWeight: 700 }}
              >
                {b.count}
              </Typography>
            </Card>
          ))}
      </Stack>
      <Card>
        <TableContainer>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>{t('master.knowledgeGraph.k5')}</TableCell>
                <TableCell>{t('master.knowledgeGraph.k6')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {categories.length === 0 && emptyRow(2)}
              {categories.map((c) => (
                <TableRow key={String(c.id)}>
                  <TableCell>{String(c.name)}</TableCell>
                  <TableCell>{String(c.count)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Stack>
  );

  const renderGraph = () => (
    <Stack spacing={2}>
      <Stack
        direction='row'
        spacing={2}
        sx={{ alignItems: 'center' }}
      >
        <TextField
          label={t('master.knowledgeGraph.k7')}
          size='small'
          value={nodeId}
          onChange={(e) => setNodeId(e.target.value)}
          sx={{ width: 220 }}
        />
        <Button
          variant='contained'
          onClick={() => {
            setSubgraphQuery(nodeId);
          }}
        >
          {t('master.knowledgeGraph.k8')}
        </Button>
        <Button
          variant='outlined'
          onClick={() => setNodeOpen(true)}
        >
          {t('master.knowledgeGraph.k9')}
        </Button>
        <Button
          variant='outlined'
          onClick={() => setEdgeOpen(true)}
        >
          {t('master.knowledgeGraph.k10')}
        </Button>
      </Stack>
      <Card>
        <Typography
          variant='subtitle2'
          sx={{ p: 2 }}
        >
          {t('master.knowledgeGraph.k11')}
        </Typography>
        <TableContainer>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>{t('master.knowledgeGraph.k12')}</TableCell>
                <TableCell>{t('master.knowledgeGraph.k13')}</TableCell>
                <TableCell>{t('master.knowledgeGraph.k14')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(!subgraph || !Array.isArray(subgraph.nodes) || subgraph.nodes.length === 0) &&
                emptyRow(3)}
              {subgraph?.nodes?.map((n, i) => (
                <TableRow key={i}>
                  <TableCell>{String(n.label)}</TableCell>
                  <TableCell sx={cellStyle}>{String(n.type)}</TableCell>
                  <TableCell>{String(n.degree ?? '-')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Stack>
  );

  const renderSearch = () => (
    <Stack spacing={2}>
      <Stack
        direction='row'
        spacing={2}
        sx={{ alignItems: 'center' }}
      >
        <TextField
          label={t('master.knowledgeGraph.k15')}
          size='small'
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          sx={{ width: 260 }}
        />
        <Button
          variant='contained'
          onClick={() => setSearchKeyword(keyword)}
        >
          {t('master.knowledgeGraph.k16')}
        </Button>
        <Button
          variant='outlined'
          onClick={() => setPathOpen(true)}
        >
          {t('master.knowledgeGraph.k17')}
        </Button>
      </Stack>
      <Card>
        <TableContainer>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>{t('master.knowledgeGraph.k18')}</TableCell>
                <TableCell>{t('master.knowledgeGraph.k13')}</TableCell>
                <TableCell>{t('master.knowledgeGraph.k19')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {searchResults.length === 0 && emptyRow(3)}
              {searchResults.map((r) => (
                <TableRow key={String(r.id)}>
                  <TableCell>{String(r.name)}</TableCell>
                  <TableCell sx={cellStyle}>{String(r.type)}</TableCell>
                  <TableCell sx={cellStyle}>
                    {r.updated_at ? formatDateTime(r.updated_at as string) : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Stack>
  );

  const renderRecommend = () => (
    <Stack spacing={2}>
      <Card>
        <TableContainer>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>{t('master.knowledgeGraph.k20')}</TableCell>
                <TableCell>{t('master.knowledgeGraph.k13')}</TableCell>
                <TableCell>{t('master.knowledgeGraph.k21')}</TableCell>
                <TableCell>{t('master.knowledgeGraph.k22')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {recommendations.length === 0 && emptyRow(4)}
              {recommendations.map((r, i) => (
                <TableRow key={i}>
                  <TableCell>{String(r.title)}</TableCell>
                  <TableCell sx={cellStyle}>{String(r.type)}</TableCell>
                  <TableCell sx={cellStyle}>{String(r.reason || '-')}</TableCell>
                  <TableCell>
                    <Chip
                      size='small'
                      label={`${String(r.confidence ?? 0)}%`}
                      color='info'
                    />
                  </TableCell>
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
        pageIcon: <Network sx={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${theme.palette.info[500]} 0%, ${theme.palette.info[600]} 100%)`,
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
          icon={<Network className={styles.il1} />}
          iconPosition='start'
          label={t('master.knowledgeGraph.k23')}
        />
        <Tab
          sx={tabStyle}
          icon={<GitBranch className={styles.il2} />}
          iconPosition='start'
          label={t('master.knowledgeGraph.k24')}
        />
        <Tab
          sx={tabStyle}
          icon={<Search className={styles.il3} />}
          iconPosition='start'
          label={t('master.knowledgeGraph.k25')}
        />
        <Tab
          sx={tabStyle}
          icon={<ThumbsUp className={styles.il4} />}
          iconPosition='start'
          label={t('master.knowledgeGraph.k26')}
        />
      </Tabs>

      {tab === 0 && renderOverview()}
      {tab === 1 && renderGraph()}
      {tab === 2 && renderSearch()}
      {tab === 3 && renderRecommend()}

      <Dialog
        open={nodeOpen}
        onClose={() => setNodeOpen(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>{t('master.knowledgeGraph.k9')}</DialogTitle>
        <DialogContent>
          <Stack
            spacing={2}
            sx={{ mt: 1 }}
          >
            <TextField
              label={t('master.knowledgeGraph.k27')}
              size='small'
              value={nodeForm.label}
              onChange={(e) => setNodeForm({ ...nodeForm, label: e.target.value })}
            />
            <TextField
              label={t('master.knowledgeGraph.k13')}
              size='small'
              value={nodeForm.type}
              onChange={(e) => setNodeForm({ ...nodeForm, type: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNodeOpen(false)}>{t('master.knowledgeGraph.k28')}</Button>
          <Button
            variant='contained'
            onClick={() => addNode.mutate()}
          >
            {t('master.knowledgeGraph.k29')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={edgeOpen}
        onClose={() => setEdgeOpen(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>{t('master.knowledgeGraph.k10')}</DialogTitle>
        <DialogContent>
          <Stack
            spacing={2}
            sx={{ mt: 1 }}
          >
            <TextField
              label={t('master.knowledgeGraph.k30')}
              size='small'
              value={edgeForm.from_node}
              onChange={(e) => setEdgeForm({ ...edgeForm, from_node: e.target.value })}
            />
            <TextField
              label={t('master.knowledgeGraph.k31')}
              size='small'
              value={edgeForm.to_node}
              onChange={(e) => setEdgeForm({ ...edgeForm, to_node: e.target.value })}
            />
            <TextField
              label={t('master.knowledgeGraph.k32')}
              size='small'
              value={edgeForm.relation}
              onChange={(e) => setEdgeForm({ ...edgeForm, relation: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEdgeOpen(false)}>{t('master.knowledgeGraph.k28')}</Button>
          <Button
            variant='contained'
            onClick={() => addEdge.mutate()}
          >
            {t('master.knowledgeGraph.k29')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={pathOpen}
        onClose={() => setPathOpen(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>{t('master.knowledgeGraph.k17')}</DialogTitle>
        <DialogContent>
          <Stack
            spacing={2}
            sx={{ mt: 1 }}
          >
            <TextField
              label={t('master.knowledgeGraph.k33')}
              size='small'
              value={pathForm.from_node}
              onChange={(e) => setPathForm({ ...pathForm, from_node: e.target.value })}
            />
            <TextField
              label={t('master.knowledgeGraph.k34')}
              size='small'
              value={pathForm.to_node}
              onChange={(e) => setPathForm({ ...pathForm, to_node: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPathOpen(false)}>{t('master.knowledgeGraph.k28')}</Button>
          <Button
            variant='contained'
            onClick={() => findPath.mutate()}
          >
            {t('master.knowledgeGraph.k29')}
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default MasterKnowledgeGraphPage;
