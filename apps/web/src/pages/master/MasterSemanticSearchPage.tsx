import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Search, Share2, Tag } from 'lucide-react';
import {
  Box,
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
} from '@mui/material';
import { semanticSearchApi } from '@/api/master/semanticSearch';
import { PageContainer } from '@/components/common';
import { useNotificationStore } from '@/store';
import { designTokens } from '@/theme/tokens';

const ct = designTokens.colors;

const MasterSemanticSearchPage: React.FC = () => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const addNotification = useNotificationStore((s) => s.addNotification);

  const [tab, setTab] = useState(0);
  const [query, setQuery] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [centerId, setCenterId] = useState('ENTITY-001');
  const [subgraphCenter, setSubgraphCenter] = useState('ENTITY-001');
  const [pathOpen, setPathOpen] = useState(false);
  const [pathForm, setPathForm] = useState({ from: '', to: '' });
  const [tagOpen, setTagOpen] = useState(false);
  const [tagForm, setTagForm] = useState({ name: '', description: '', color: '' });
  const [entityId, setEntityId] = useState('ENTITY-001');
  const [tagsEntity, setTagsEntity] = useState('ENTITY-001');

  const { data: statsResp } = useQuery({
    queryKey: ['master-sem-stats'],
    queryFn: () => semanticSearchApi.getSearchStats(),
  });
  const stats = statsResp?.data as
    | {
        indexed_entities?: number;
        embeddings_dimension?: number;
        last_reindex_at?: string;
        index_size_bytes?: number;
      }
    | undefined;

  const { data: searchResp } = useQuery({
    queryKey: ['master-sem-search', searchQuery],
    queryFn: () => semanticSearchApi.searchSemantic({ query: searchQuery, limit: 20 }),
    enabled: Boolean(searchQuery),
  });
  const results = useMemo(
    () =>
      Array.isArray(searchResp?.data)
        ? (searchResp.data as unknown as Record<string, unknown>[])
        : [],
    [searchResp]
  );

  const { data: subgraphResp } = useQuery({
    queryKey: ['master-sem-subgraph', subgraphCenter],
    queryFn: () => semanticSearchApi.getSubgraph({ center_id: subgraphCenter, depth: 2 }),
  });
  const subgraph = subgraphResp?.data as
    { nodes?: Array<Record<string, unknown>>; edges?: Array<Record<string, unknown>> } | undefined;

  const { data: tagsResp } = useQuery({
    queryKey: ['master-sem-tags', tagsEntity],
    queryFn: () => semanticSearchApi.getTagsForEntity('generic' as never, tagsEntity),
    enabled: Boolean(tagsEntity),
  });
  const tags = useMemo(
    () =>
      Array.isArray(tagsResp?.data) ? (tagsResp.data as unknown as Record<string, unknown>[]) : [],
    [tagsResp]
  );

  const reindex = useMutation({
    mutationFn: () => semanticSearchApi.reindexAll(),
    onSuccess: () => {
      addNotification({ type: 'success', message: t('master.semanticSearch.k0') });
      qc.invalidateQueries({ queryKey: ['master-sem-stats'] });
    },
  });

  const findPath = useMutation({
    mutationFn: () => semanticSearchApi.findShortestPath(pathForm as never),
    onSuccess: () => {
      addNotification({ type: 'success', message: t('master.semanticSearch.k1') });
      setPathOpen(false);
      setPathForm({ from: '', to: '' });
    },
  });

  const createTag = useMutation({
    mutationFn: () => semanticSearchApi.createTag(tagForm as never),
    onSuccess: () => {
      addNotification({ type: 'success', message: t('master.semanticSearch.k2') });
      setTagOpen(false);
      setTagForm({ name: '', description: '', color: '' });
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
        {t('master.semanticSearch.k3')}
      </TableCell>
    </TableRow>
  );

  const metric = (label: string, value: unknown) => (
    <Card sx={{ p: 2.5, minWidth: 150, flex: 1 }}>
      <Typography
        variant='body2'
        color='text.secondary'
      >
        {label}
      </Typography>
      <Typography
        variant='h5'
        sx={{ fontWeight: 700 }}
      >
        {String(value ?? '-')}
      </Typography>
    </Card>
  );

  const renderSearch = () => (
    <Stack spacing={2}>
      <Stack
        direction='row'
        spacing={2}
        sx={{ flexWrap: 'wrap' }}
      >
        {metric(t('master.semanticSearch.k4'), stats?.indexed_entities)}
        {metric(t('master.semanticSearch.k5'), stats?.embeddings_dimension)}
        {metric(t('master.semanticSearch.k6'), stats?.index_size_bytes)}
      </Stack>
      <Stack
        direction='row'
        spacing={2}
        sx={{ alignItems: 'center' }}
      >
        <TextField
          label={t('master.semanticSearch.k7')}
          size='small'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          sx={{ width: 300 }}
        />
        <Button
          variant='contained'
          onClick={() => setSearchQuery(query)}
        >
          {t('master.semanticSearch.k8')}
        </Button>
        <Button
          variant='outlined'
          onClick={() => reindex.mutate()}
        >
          {t('master.semanticSearch.k9')}
        </Button>
      </Stack>
      <Card>
        <TableContainer>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>{t('master.semanticSearch.k10')}</TableCell>
                <TableCell>{t('master.semanticSearch.k11')}</TableCell>
                <TableCell>{t('master.semanticSearch.k12')}</TableCell>
                <TableCell>{t('master.semanticSearch.k13')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {searchQuery && results.length === 0 && emptyRow(4)}
              {results.map((r) => (
                <TableRow key={String(r.id)}>
                  <TableCell>{String(r.title)}</TableCell>
                  <TableCell sx={cellStyle}>{String(r.entity_type)}</TableCell>
                  <TableCell sx={cellStyle}>{String(r.description || '-')}</TableCell>
                  <TableCell>
                    <Chip
                      size='small'
                      label={String(r.score ?? 0)}
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

  const renderGraph = () => (
    <Stack spacing={2}>
      <Stack
        direction='row'
        spacing={2}
        sx={{ alignItems: 'center' }}
      >
        <TextField
          label={t('master.semanticSearch.k14')}
          size='small'
          value={centerId}
          onChange={(e) => setCenterId(e.target.value)}
          sx={{ width: 200 }}
        />
        <Button
          variant='contained'
          onClick={() => {
            setSubgraphCenter(centerId);
          }}
        >
          {t('master.semanticSearch.k15')}
        </Button>
        <Button
          variant='outlined'
          onClick={() => setPathOpen(true)}
        >
          {t('master.semanticSearch.k16')}
        </Button>
      </Stack>
      <Card>
        <Typography
          variant='subtitle2'
          sx={{ p: 2 }}
        >
          {t('master.semanticSearch.k17')}
        </Typography>
        <TableContainer>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>{t('master.semanticSearch.k18')}</TableCell>
                <TableCell>{t('master.semanticSearch.k11')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(!subgraph || !Array.isArray(subgraph.nodes) || subgraph.nodes.length === 0) &&
                emptyRow(2)}
              {subgraph?.nodes?.map((n, i) => (
                <TableRow key={i}>
                  <TableCell>{String(n.label)}</TableCell>
                  <TableCell sx={cellStyle}>{String(n.type)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Stack>
  );

  const renderTags = () => (
    <Stack spacing={2}>
      <Stack
        direction='row'
        spacing={2}
        sx={{ alignItems: 'center' }}
      >
        <TextField
          label={t('master.semanticSearch.k19')}
          size='small'
          value={entityId}
          onChange={(e) => setEntityId(e.target.value)}
          sx={{ width: 200 }}
        />
        <Button
          variant='contained'
          onClick={() => setTagsEntity(entityId)}
        >
          {t('master.semanticSearch.k20')}
        </Button>
        <Button
          variant='outlined'
          onClick={() => setTagOpen(true)}
        >
          {t('master.semanticSearch.k21')}
        </Button>
      </Stack>
      <Card>
        <TableContainer>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>{t('master.semanticSearch.k22')}</TableCell>
                <TableCell>{t('master.semanticSearch.k23')}</TableCell>
                <TableCell>{t('master.semanticSearch.k24')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tags.length === 0 && emptyRow(3)}
              {tags.map((tg) => (
                <TableRow key={String(tg.id)}>
                  <TableCell>{String(tg.name)}</TableCell>
                  <TableCell sx={cellStyle}>{String(tg.description || '-')}</TableCell>
                  <TableCell>{String(tg.usage_count ?? 0)}</TableCell>
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
        pageGradient: `linear-gradient(135deg, ${ct.info[500]} 0%, ${ct.info[600]} 100%)`,
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
          label={t('master.semanticSearch.k25')}
        />
        <Tab
          sx={tabStyle}
          icon={<Share2 style={{ width: 16, height: 16 }} />}
          iconPosition='start'
          label={t('master.semanticSearch.k26')}
        />
        <Tab
          sx={tabStyle}
          icon={<Tag style={{ width: 16, height: 16 }} />}
          iconPosition='start'
          label={t('master.semanticSearch.k27')}
        />
      </Tabs>

      {tab === 0 && renderSearch()}
      {tab === 1 && renderGraph()}
      {tab === 2 && renderTags()}

      <Dialog
        open={pathOpen}
        onClose={() => setPathOpen(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>{t('master.semanticSearch.k16')}</DialogTitle>
        <DialogContent>
          <Stack
            spacing={2}
            sx={{ mt: 1 }}
          >
            <TextField
              label={t('master.semanticSearch.k28')}
              size='small'
              value={pathForm.from}
              onChange={(e) => setPathForm({ ...pathForm, from: e.target.value })}
            />
            <TextField
              label={t('master.semanticSearch.k29')}
              size='small'
              value={pathForm.to}
              onChange={(e) => setPathForm({ ...pathForm, to: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPathOpen(false)}>{t('master.semanticSearch.k30')}</Button>
          <Button
            variant='contained'
            onClick={() => findPath.mutate()}
          >
            {t('master.semanticSearch.k31')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={tagOpen}
        onClose={() => setTagOpen(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>{t('master.semanticSearch.k21')}</DialogTitle>
        <DialogContent>
          <Stack
            spacing={2}
            sx={{ mt: 1 }}
          >
            <TextField
              label={t('master.semanticSearch.k22')}
              size='small'
              value={tagForm.name}
              onChange={(e) => setTagForm({ ...tagForm, name: e.target.value })}
            />
            <TextField
              label={t('master.semanticSearch.k23')}
              size='small'
              value={tagForm.description}
              onChange={(e) => setTagForm({ ...tagForm, description: e.target.value })}
            />
            <TextField
              label={t('master.semanticSearch.k32')}
              size='small'
              value={tagForm.color}
              onChange={(e) => setTagForm({ ...tagForm, color: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTagOpen(false)}>{t('master.semanticSearch.k30')}</Button>
          <Button
            variant='contained'
            onClick={() => createTag.mutate()}
          >
            {t('master.semanticSearch.k31')}
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default MasterSemanticSearchPage;
