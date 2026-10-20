import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Tooltip,
  Divider,
  TextField,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import StorageIcon from '@mui/icons-material/Storage';
import {
  schemaRegistryApi,
  type SchemaDefinition,
  type DynamicDataRecord,
} from '@/api/master/schemaRegistry';
import i18n from '@/i18n';

const t = (key: string): string => i18n.t(`master.schema_registry.${key}`);

const SchemaRegistryPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [schemas, setSchemas] = useState<SchemaDefinition[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SchemaDefinition | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formName, setFormName] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formSchemaJson, setFormSchemaJson] = useState('');

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailSchema, setDetailSchema] = useState<SchemaDefinition | null>(null);
  const [records, setRecords] = useState<DynamicDataRecord[]>([]);
  const [recordsTotal, setRecordsTotal] = useState(0);
  const [recordsPage, setRecordsPage] = useState(0);
  const [recordsLoading, setRecordsLoading] = useState(false);

  const [dataFormOpen, setDataFormOpen] = useState(false);
  const [dataEditing, setDataEditing] = useState<DynamicDataRecord | null>(null);
  const [dataFormJson, setDataFormJson] = useState('');
  const [dataSaving, setDataSaving] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  const loadSchemas = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await schemaRegistryApi.list({ page: page + 1, pageSize });
      if (res.success && res.data) {
        setSchemas(res.data.items || []);
        setTotal(res.data.total || 0);
      } else {
        setSchemas([]);
        setTotal(0);
      }
    } catch (err) {
      console.error('加载 Schema 列表失败', err);
      setError(t('load_failed'));
      setSchemas([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    loadSchemas();
  }, [loadSchemas]);

  const openCreate = () => {
    setEditing(null);
    setFormName('');
    setFormTitle('');
    setFormDesc('');
    setFormSchemaJson('{\n  "type": "object",\n  "properties": {}\n}');
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (schema: SchemaDefinition) => {
    setEditing(schema);
    setFormName(schema.name);
    setFormTitle(schema.title);
    setFormDesc(schema.description || '');
    setFormSchemaJson(JSON.stringify(schema.schema_json, null, 2));
    setFormError(null);
    setFormOpen(true);
  };

  const handleSave = async () => {
    setFormError(null);
    let schemaJson: Record<string, unknown>;
    try {
      schemaJson = JSON.parse(formSchemaJson);
    } catch {
      setFormError(t('schema_json_invalid'));
      return;
    }
    if (!formName.trim() || !formTitle.trim()) {
      setFormError(t('name_title_required'));
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const res = await schemaRegistryApi.update(editing.id, {
          title: formTitle.trim(),
          description: formDesc.trim() || undefined,
          schema_json: schemaJson,
        });
        if (!res.success) setFormError(res.message || t('save_failed'));
      } else {
        const res = await schemaRegistryApi.create({
          name: formName.trim(),
          title: formTitle.trim(),
          description: formDesc.trim() || undefined,
          schema_json: schemaJson,
        });
        if (!res.success) setFormError(res.message || t('save_failed'));
      }
      if (!formError) {
        setFormOpen(false);
        loadSchemas();
      }
    } catch (err) {
      console.error('保存 Schema 失败', err);
      setFormError(t('save_failed'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (schema: SchemaDefinition) => {
    try {
      const res = await schemaRegistryApi.remove(schema.id);
      if (res.success) {
        setSchemas((prev) => prev.filter((s) => s.id !== schema.id));
        setTotal((prev) => prev - 1);
      }
    } catch (err) {
      console.error('删除 Schema 失败', err);
    }
  };

  const loadRecords = useCallback(async (schemaId: string, p: number) => {
    setRecordsLoading(true);
    try {
      const res = await schemaRegistryApi.listData(schemaId, { page: p + 1, pageSize: 10 });
      if (res.success && res.data) {
        setRecords(res.data.items || []);
        setRecordsTotal(res.data.total || 0);
      } else {
        setRecords([]);
        setRecordsTotal(0);
      }
    } catch (err) {
      console.error('加载动态数据失败', err);
      setRecords([]);
      setRecordsTotal(0);
    } finally {
      setRecordsLoading(false);
    }
  }, []);

  const handleViewDetail = async (schema: SchemaDefinition) => {
    setDetailSchema(schema);
    setRecordsPage(0);
    setDetailOpen(true);
    loadRecords(schema.id, 0);
  };

  const handleRecordsPageChange = (_: unknown, p: number) => {
    setRecordsPage(p);
    if (detailSchema) loadRecords(detailSchema.id, p);
  };

  const openDataCreate = () => {
    setDataEditing(null);
    setDataFormJson('{\n}');
    setDataError(null);
    setDataFormOpen(true);
  };

  const openDataEdit = (record: DynamicDataRecord) => {
    setDataEditing(record);
    setDataFormJson(JSON.stringify(record.data, null, 2));
    setDataError(null);
    setDataFormOpen(true);
  };

  const handleDataSave = async () => {
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(dataFormJson);
    } catch {
      setDataError(t('data_json_invalid'));
      return;
    }
    if (!detailSchema) return;
    setDataSaving(true);
    try {
      if (dataEditing) {
        const res = await schemaRegistryApi.updateData(detailSchema.id, dataEditing.id, data);
        if (!res.success) setDataError(res.message || t('data_save_failed'));
      } else {
        const res = await schemaRegistryApi.createData(detailSchema.id, data);
        if (!res.success) setDataError(res.message || t('data_save_failed'));
      }
      setDataFormOpen(false);
      loadRecords(detailSchema.id, recordsPage);
    } catch (err) {
      console.error('保存动态数据失败', err);
      setDataError(t('data_save_failed'));
    } finally {
      setDataSaving(false);
    }
  };

  const handleDataDelete = async (record: DynamicDataRecord) => {
    if (!detailSchema) return;
    try {
      const res = await schemaRegistryApi.removeData(detailSchema.id, record.id);
      if (res.success) {
        setRecords((prev) => prev.filter((r) => r.id !== record.id));
        setRecordsTotal((prev) => prev - 1);
      }
    } catch (err) {
      console.error('删除动态数据失败', err);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography
            variant='h5'
            sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <StorageIcon sx={{ color: 'primary.main' }} />
            {t('title')}
          </Typography>
          <Typography
            variant='body2'
            color='text.secondary'
          >
            {t('desc')}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant='outlined'
            startIcon={<RefreshIcon />}
            onClick={loadSchemas}
            disabled={loading}
          >
            {t('refresh')}
          </Button>
          <Button
            variant='contained'
            startIcon={<AddIcon />}
            onClick={openCreate}
          >
            {t('create')}
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert
          severity='error'
          sx={{ mb: 2 }}
        >
          {error}
        </Alert>
      )}

      <Card>
        <CardContent>
          <TableContainer>
            <Table size='small'>
              <TableHead>
                <TableRow sx={{ backgroundColor: 'grey.100' }}>
                  <TableCell sx={{ fontWeight: 600 }}>{t('col_name')}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{t('col_title')}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{t('col_version')}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{t('col_status')}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{t('col_updated_at')}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{t('col_actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      align='center'
                    >
                      <CircularProgress size={24} />
                    </TableCell>
                  </TableRow>
                ) : schemas.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      align='center'
                    >
                      {t('empty')}
                    </TableCell>
                  </TableRow>
                ) : (
                  schemas.map((s) => (
                    <TableRow
                      key={s.id}
                      hover
                    >
                      <TableCell>{s.name}</TableCell>
                      <TableCell>{s.title}</TableCell>
                      <TableCell>v{s.version}</TableCell>
                      <TableCell>
                        <Chip
                          label={s.is_active ? t('status_active') : t('status_inactive')}
                          size='small'
                          color={s.is_active ? 'success' : 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        {s.updated_at ? new Date(s.updated_at).toLocaleString('zh-CN') : '-'}
                      </TableCell>
                      <TableCell>
                        <Tooltip title={t('view')}>
                          <IconButton
                            size='small'
                            onClick={() => handleViewDetail(s)}
                          >
                            <VisibilityIcon fontSize='small' />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t('edit')}>
                          <IconButton
                            size='small'
                            onClick={() => openEdit(s)}
                          >
                            <EditIcon fontSize='small' />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t('delete')}>
                          <IconButton
                            size='small'
                            color='error'
                            onClick={() => handleDelete(s)}
                          >
                            <DeleteIcon fontSize='small' />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component='div'
            count={total}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={pageSize}
            onRowsPerPageChange={(e) => {
              setPageSize(parseInt(e.target.value, 10));
              setPage(0);
            }}
            labelRowsPerPage={t('rows_per_page')}
          />
        </CardContent>
      </Card>

      {/* 新建/编辑 Schema */}
      <Dialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>{editing ? t('edit_title') : t('create_title')}</DialogTitle>
        <DialogContent dividers>
          {formError && (
            <Alert
              severity='error'
              sx={{ mb: 2 }}
            >
              {formError}
            </Alert>
          )}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label={t('col_name')}
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                disabled={!!editing}
                fullWidth
                size='small'
              />
              <TextField
                label={t('col_title')}
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                fullWidth
                size='small'
              />
            </Box>
            <TextField
              label={t('fld_description')}
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              fullWidth
              size='small'
            />
            <TextField
              label={t('fld_schema_json')}
              value={formSchemaJson}
              onChange={(e) => setFormSchemaJson(e.target.value)}
              fullWidth
              multiline
              minRows={8}
              maxRows={16}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFormOpen(false)}>{t('cancel')}</Button>
          <Button
            variant='contained'
            onClick={handleSave}
            disabled={saving}
          >
            {t('save')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Schema 详情 + 动态数据 */}
      <Dialog
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>
          <StorageIcon sx={{ color: 'primary.main', verticalAlign: 'middle', mr: 1 }} />
          {detailSchema?.name}
          <Chip
            label={`v${detailSchema?.version}`}
            size='small'
            sx={{ ml: 1 }}
          />
        </DialogTitle>
        <DialogContent dividers>
          {detailSchema && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
              <Box sx={{ flex: '1 1 45%', minWidth: 200 }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {t('col_title')}
                </Typography>
                <Typography variant='body1'>{detailSchema.title}</Typography>
              </Box>
              <Box sx={{ flex: '1 1 45%', minWidth: 200 }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {t('fld_table_name')}
                </Typography>
                <Typography variant='body1'>{detailSchema.table_name}</Typography>
              </Box>
              <Box sx={{ flex: '1 1 100%', minWidth: '100%' }}>
                <Divider sx={{ my: 1 }} />
                <Typography
                  variant='subtitle2'
                  sx={{ fontWeight: 600, mb: 1 }}
                >
                  {t('data_title')}
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                  <Button
                    size='small'
                    variant='contained'
                    startIcon={<AddIcon />}
                    onClick={openDataCreate}
                  >
                    {t('data_create')}
                  </Button>
                </Box>
                {recordsLoading ? (
                  <CircularProgress size={20} />
                ) : records.length === 0 ? (
                  <Typography variant='body1'>{t('data_empty')}</Typography>
                ) : (
                  <Box>
                    {records.map((r) => (
                      <Box
                        key={r.id}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 1,
                          mb: 0.5,
                          p: 1,
                          border: '1px solid',
                          borderColor: 'grey.200',
                          borderRadius: 1,
                        }}
                      >
                        <Typography
                          variant='body2'
                          sx={{
                            flex: 1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            fontFamily: 'monospace',
                          }}
                        >
                          {JSON.stringify(r.data)}
                        </Typography>
                        <Tooltip title={t('edit')}>
                          <IconButton
                            size='small'
                            onClick={() => openDataEdit(r)}
                          >
                            <EditIcon fontSize='small' />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t('delete')}>
                          <IconButton
                            size='small'
                            color='error'
                            onClick={() => handleDataDelete(r)}
                          >
                            <DeleteIcon fontSize='small' />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    ))}
                    <TablePagination
                      component='div'
                      count={recordsTotal}
                      page={recordsPage}
                      onPageChange={handleRecordsPageChange}
                      rowsPerPage={10}
                      rowsPerPageOptions={[10]}
                      labelRowsPerPage={t('rows_per_page')}
                    />
                  </Box>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailOpen(false)}>{t('close')}</Button>
        </DialogActions>
      </Dialog>

      {/* 动态数据 新建/编辑 */}
      <Dialog
        open={dataFormOpen}
        onClose={() => setDataFormOpen(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>{dataEditing ? t('data_edit_title') : t('data_create_title')}</DialogTitle>
        <DialogContent dividers>
          {dataError && (
            <Alert
              severity='error'
              sx={{ mb: 2 }}
            >
              {dataError}
            </Alert>
          )}
          <TextField
            label={t('fld_data_json')}
            value={dataFormJson}
            onChange={(e) => setDataFormJson(e.target.value)}
            fullWidth
            multiline
            minRows={6}
            maxRows={14}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDataFormOpen(false)}>{t('cancel')}</Button>
          <Button
            variant='contained'
            onClick={handleDataSave}
            disabled={dataSaving}
          >
            {t('save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SchemaRegistryPage;
