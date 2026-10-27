import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Network, Boxes, GitBranch, Route } from 'lucide-react';
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
  useTheme,
} from '@mui/material';
import { dshEnhancedApi } from '@/api/ai/dshEnhanced';
import { PageContainer } from '@/components/common';
import { useNotificationStore } from '@/store';
import { designTokens } from '@/theme/tokens';
const DshKnowledgePage: React.FC = () => {
  const theme = useTheme();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const addNotification = useNotificationStore((s) => s.addNotification);

  const [tab, setTab] = useState(0);
  const [entityOpen, setEntityOpen] = useState(false);
  const [entityForm, setEntityForm] = useState({ name: '', entity_type: '', description: '' });
  const [relationOpen, setRelationOpen] = useState(false);
  const [relationForm, setRelationForm] = useState({
    source_id: '',
    target_id: '',
    relation_type: '',
    weight: 1,
  });
  const [pathForm, setPathForm] = useState({ source_id: '', target_id: '' });
  const [extractText, setExtractText] = useState('');
  const [linkName, setLinkName] = useState('');
  const [neighborId, setNeighborId] = useState('');

  const { data: statsResp } = useQuery({
    queryKey: ['dsh-kg-stats'],
    queryFn: () => dshEnhancedApi.getGraphStats(),
  });
  const stats = statsResp?.data as Record<string, unknown> | undefined;

  const { data: entitiesResp } = useQuery({
    queryKey: ['dsh-kg-entities'],
    queryFn: () => dshEnhancedApi.listEntities(),
  });
  const entities = useMemo(
    () =>
      Array.isArray(entitiesResp?.data)
        ? (entitiesResp.data as unknown as Record<string, unknown>[])
        : [],
    [entitiesResp]
  );

  const { data: relationsResp } = useQuery({
    queryKey: ['dsh-kg-relations'],
    queryFn: () => dshEnhancedApi.listRelations(),
  });
  const relations = useMemo(
    () =>
      Array.isArray(relationsResp?.data)
        ? (relationsResp.data as unknown as Record<string, unknown>[])
        : [],
    [relationsResp]
  );

  const { data: communitiesResp } = useQuery({
    queryKey: ['dsh-kg-communities'],
    queryFn: () => dshEnhancedApi.detectCommunities(),
  });
  const communities = useMemo(
    () =>
      Array.isArray(communitiesResp?.data)
        ? (communitiesResp.data as unknown as Record<string, unknown>[])
        : [],
    [communitiesResp]
  );

  const { data: neighborsResp } = useQuery({
    queryKey: ['dsh-kg-neighbors', neighborId],
    queryFn: () => dshEnhancedApi.getEntityNeighbors(neighborId),
    enabled: !!neighborId,
  });
  const neighbors = useMemo(
    () =>
      Array.isArray(neighborsResp?.data)
        ? (neighborsResp.data as unknown as Record<string, unknown>[])
        : [],
    [neighborsResp]
  );

  const { data: pathResp } = useQuery({
    queryKey: ['dsh-kg-path', pathForm],
    queryFn: () => dshEnhancedApi.shortestPath(pathForm as never),
    enabled: !!pathForm.source_id && !!pathForm.target_id,
  });
  const pathResult = pathResp?.data as Record<string, unknown> | undefined;

  const { data: extractResp } = useQuery({
    queryKey: ['dsh-kg-extract', extractText],
    queryFn: () => dshEnhancedApi.extractEntities({ text: extractText }),
    enabled: extractText.length > 0,
  });
  const extract = extractResp?.data as
    | { entities?: unknown[]; relations?: unknown[]; text_length?: number; duration_ms?: number }
    | undefined;

  const addEntity = useMutation({
    mutationFn: () => dshEnhancedApi.addEntity(entityForm as never),
    onSuccess: () => {
      addNotification({ type: 'success', message: t('ai.dshKnowledge.k0') });
      setEntityOpen(false);
      setEntityForm({ name: '', entity_type: '', description: '' });
      qc.invalidateQueries({ queryKey: ['dsh-kg-entities'] });
    },
  });

  const addRelation = useMutation({
    mutationFn: () => dshEnhancedApi.addRelation(relationForm as never),
    onSuccess: () => {
      addNotification({ type: 'success', message: t('ai.dshKnowledge.k1') });
      setRelationOpen(false);
      setRelationForm({ source_id: '', target_id: '', relation_type: '', weight: 1 });
      qc.invalidateQueries({ queryKey: ['dsh-kg-relations'] });
    },
  });

  const removeEntity = useMutation({
    mutationFn: (id: string) => dshEnhancedApi.deleteEntity(id),
    onSuccess: () => {
      addNotification({ type: 'success', message: t('ai.dshKnowledge.k2') });
      qc.invalidateQueries({ queryKey: ['dsh-kg-entities'] });
      qc.invalidateQueries({ queryKey: ['dsh-kg-stats'] });
    },
  });

  const linkEntity = useMutation({
    mutationFn: () => dshEnhancedApi.linkEntity({ name: linkName }),
    onSuccess: (resp) => {
      const count = Array.isArray(resp.data) ? resp.data.length : 0;
      addNotification({ type: 'success', message: `${t('ai.dshKnowledge.k3')} ${count}` });
      setLinkName('');
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
        {t('ai.dshKnowledge.k4')}
      </TableCell>
    </TableRow>
  );

  const renderStats = () => (
    <Stack spacing={2}>
      <Stack
        direction='row'
        spacing={2}
        sx={{ flexWrap: 'wrap' }}
      >
        {metric(t('ai.dshKnowledge.k5'), stats?.total_entities)}
        {metric(t('ai.dshKnowledge.k6'), stats?.total_relations)}
        {metric(t('ai.dshKnowledge.k7'), stats?.connected_components, theme.palette.warning[600])}
        {metric(t('ai.dshKnowledge.k8'), stats?.graph_density)}
      </Stack>
      <Card>
        <Typography
          variant='subtitle2'
          sx={{ p: 2 }}
        >
          {t('ai.dshKnowledge.k9')}
        </Typography>
        <TableContainer>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>{t('ai.dshKnowledge.k10')}</TableCell>
                <TableCell>{t('ai.dshKnowledge.k11')}</TableCell>
                <TableCell>{t('ai.dshKnowledge.k12')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {communities.length === 0 && emptyRow(3)}
              {communities.map((c) => (
                <TableRow key={String(c.community_id)}>
                  <TableCell>{String(c.community_id)}</TableCell>
                  <TableCell>{String(c.size)}</TableCell>
                  <TableCell sx={cellStyle}>{String(c.density)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
      <Card sx={{ p: 3 }}>
        <Typography
          variant='subtitle2'
          sx={{ mb: 1 }}
        >
          {t('ai.dshKnowledge.k13')}
        </Typography>
        <Stack
          direction='row'
          spacing={2}
          sx={{ alignItems: 'flex-start' }}
        >
          <TextField
            label={t('ai.dshKnowledge.k14')}
            size='small'
            multiline
            minRows={3}
            value={extractText}
            onChange={(e) => setExtractText(e.target.value)}
            sx={{ flex: 1 }}
          />
        </Stack>
        {extract && (
          <Box sx={{ mt: 2 }}>
            <Typography variant='body2'>
              {t('ai.dshKnowledge.k15')}: {extract.entities?.length ?? 0} /{' '}
              {t('ai.dshKnowledge.k16')}: {extract.relations?.length ?? 0} /{' '}
              {t('ai.dshKnowledge.k17')}: {extract.duration_ms}ms
            </Typography>
          </Box>
        )}
      </Card>
    </Stack>
  );

  const renderEntities = () => (
    <Stack spacing={2}>
      <Stack
        direction='row'
        spacing={2}
        sx={{ alignItems: 'center' }}
      >
        <Button
          variant='contained'
          onClick={() => setEntityOpen(true)}
        >
          {t('ai.dshKnowledge.k18')}
        </Button>
        <TextField
          label={t('ai.dshKnowledge.k19')}
          size='small'
          placeholder={t('ai.dshKnowledge.k20')}
          value={neighborId}
          onChange={(e) => setNeighborId(e.target.value)}
          sx={{ width: 240 }}
        />
      </Stack>
      {neighborId && neighbors.length > 0 && (
        <Card>
          <Typography
            variant='subtitle2'
            sx={{ p: 2 }}
          >
            {t('ai.dshKnowledge.k21')}
          </Typography>
          <TableContainer>
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell>{t('ai.dshKnowledge.k22')}</TableCell>
                  <TableCell>{t('ai.dshKnowledge.k23')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {neighbors.map((n) => (
                  <TableRow key={String(n.id)}>
                    <TableCell>{String(n.name)}</TableCell>
                    <TableCell sx={cellStyle}>{String(n.entity_type)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}
      <Card>
        <TableContainer>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>{t('ai.dshKnowledge.k22')}</TableCell>
                <TableCell>{t('ai.dshKnowledge.k23')}</TableCell>
                <TableCell>{t('ai.dshKnowledge.k24')}</TableCell>
                <TableCell>{t('ai.dshKnowledge.k25')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {entities.length === 0 && emptyRow(4)}
              {entities.map((e) => (
                <TableRow key={String(e.id)}>
                  <TableCell>{String(e.name)}</TableCell>
                  <TableCell>
                    <Chip
                      size='small'
                      label={String(e.entity_type)}
                    />
                  </TableCell>
                  <TableCell sx={cellStyle}>{String(e.confidence)}</TableCell>
                  <TableCell>
                    <Button
                      size='small'
                      color='error'
                      onClick={() => removeEntity.mutate(String(e.id))}
                    >
                      {t('ai.dshKnowledge.k26')}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Stack>
  );

  const renderRelations = () => (
    <Stack spacing={2}>
      <Stack
        direction='row'
        spacing={2}
        sx={{ alignItems: 'center' }}
      >
        <Button
          variant='contained'
          onClick={() => setRelationOpen(true)}
        >
          {t('ai.dshKnowledge.k27')}
        </Button>
        <TextField
          label={t('ai.dshKnowledge.k28')}
          size='small'
          placeholder={t('ai.dshKnowledge.k20')}
          value={linkName}
          onChange={(e) => setLinkName(e.target.value)}
          sx={{ width: 240 }}
        />
        <Button
          variant='outlined'
          onClick={() => linkEntity.mutate()}
          disabled={!linkName}
        >
          {t('ai.dshKnowledge.k29')}
        </Button>
      </Stack>
      <Card>
        <TableContainer>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>{t('ai.dshKnowledge.k30')}</TableCell>
                <TableCell>{t('ai.dshKnowledge.k31')}</TableCell>
                <TableCell>{t('ai.dshKnowledge.k32')}</TableCell>
                <TableCell>{t('ai.dshKnowledge.k33')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {relations.length === 0 && emptyRow(4)}
              {relations.map((r) => (
                <TableRow key={String(r.id)}>
                  <TableCell sx={cellStyle}>{String(r.source_id)}</TableCell>
                  <TableCell sx={cellStyle}>{String(r.target_id)}</TableCell>
                  <TableCell>
                    <Chip
                      size='small'
                      label={String(r.relation_type)}
                    />
                  </TableCell>
                  <TableCell sx={cellStyle}>{String(r.weight)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Stack>
  );

  const renderPaths = () => (
    <Stack spacing={2}>
      <Card sx={{ p: 3 }}>
        <Typography
          variant='subtitle2'
          sx={{ mb: 2 }}
        >
          {t('ai.dshKnowledge.k34')}
        </Typography>
        <Stack
          direction='row'
          spacing={2}
          sx={{ alignItems: 'center' }}
        >
          <TextField
            label={t('ai.dshKnowledge.k35')}
            size='small'
            value={pathForm.source_id}
            onChange={(e) => setPathForm({ ...pathForm, source_id: e.target.value })}
          />
          <TextField
            label={t('ai.dshKnowledge.k36')}
            size='small'
            value={pathForm.target_id}
            onChange={(e) => setPathForm({ ...pathForm, target_id: e.target.value })}
          />
        </Stack>
      </Card>
      {pathResult && (
        <Card sx={{ p: 3 }}>
          <Typography variant='subtitle2'>{t('ai.dshKnowledge.k37')}</Typography>
          <Typography
            variant='body2'
            sx={{ mt: 1 }}
          >
            {t('ai.dshKnowledge.k38')}: {String(pathResult.path_length ?? 0)} /{' '}
            {t('ai.dshKnowledge.k39')}: {String(pathResult.total_weight ?? 0)}
          </Typography>
          <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {((pathResult.entity_ids as unknown[]) ?? []).map((id) => (
              <Chip
                key={String(id)}
                size='small'
                label={String(id)}
              />
            ))}
          </Box>
        </Card>
      )}
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
          icon={<Boxes style={{ width: 16, height: 16 }} />}
          iconPosition='start'
          label={t('ai.dshKnowledge.k40')}
        />
        <Tab
          sx={tabStyle}
          icon={<Network style={{ width: 16, height: 16 }} />}
          iconPosition='start'
          label={t('ai.dshKnowledge.k41')}
        />
        <Tab
          sx={tabStyle}
          icon={<GitBranch style={{ width: 16, height: 16 }} />}
          iconPosition='start'
          label={t('ai.dshKnowledge.k42')}
        />
        <Tab
          sx={tabStyle}
          icon={<Route style={{ width: 16, height: 16 }} />}
          iconPosition='start'
          label={t('ai.dshKnowledge.k43')}
        />
      </Tabs>

      {tab === 0 && renderStats()}
      {tab === 1 && renderEntities()}
      {tab === 2 && renderRelations()}
      {tab === 3 && renderPaths()}

      <Dialog
        open={entityOpen}
        onClose={() => setEntityOpen(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>{t('ai.dshKnowledge.k18')}</DialogTitle>
        <DialogContent>
          <Stack
            spacing={2}
            sx={{ mt: 1 }}
          >
            <TextField
              label={t('ai.dshKnowledge.k22')}
              size='small'
              value={entityForm.name}
              onChange={(e) => setEntityForm({ ...entityForm, name: e.target.value })}
            />
            <TextField
              label={t('ai.dshKnowledge.k23')}
              size='small'
              value={entityForm.entity_type}
              onChange={(e) => setEntityForm({ ...entityForm, entity_type: e.target.value })}
            />
            <TextField
              label={t('ai.dshKnowledge.k44')}
              size='small'
              value={entityForm.description}
              onChange={(e) => setEntityForm({ ...entityForm, description: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEntityOpen(false)}>{t('ai.dshKnowledge.k45')}</Button>
          <Button
            variant='contained'
            onClick={() => addEntity.mutate()}
            disabled={!entityForm.name || !entityForm.entity_type}
          >
            {t('ai.dshKnowledge.k46')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={relationOpen}
        onClose={() => setRelationOpen(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>{t('ai.dshKnowledge.k27')}</DialogTitle>
        <DialogContent>
          <Stack
            spacing={2}
            sx={{ mt: 1 }}
          >
            <TextField
              label={t('ai.dshKnowledge.k30')}
              size='small'
              value={relationForm.source_id}
              onChange={(e) => setRelationForm({ ...relationForm, source_id: e.target.value })}
            />
            <TextField
              label={t('ai.dshKnowledge.k31')}
              size='small'
              value={relationForm.target_id}
              onChange={(e) => setRelationForm({ ...relationForm, target_id: e.target.value })}
            />
            <TextField
              label={t('ai.dshKnowledge.k32')}
              size='small'
              value={relationForm.relation_type}
              onChange={(e) => setRelationForm({ ...relationForm, relation_type: e.target.value })}
            />
            <TextField
              label={t('ai.dshKnowledge.k33')}
              size='small'
              type='number'
              value={relationForm.weight}
              onChange={(e) => setRelationForm({ ...relationForm, weight: Number(e.target.value) })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRelationOpen(false)}>{t('ai.dshKnowledge.k45')}</Button>
          <Button
            variant='contained'
            onClick={() => addRelation.mutate()}
            disabled={
              !relationForm.source_id || !relationForm.target_id || !relationForm.relation_type
            }
          >
            {t('ai.dshKnowledge.k46')}
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default DshKnowledgePage;
