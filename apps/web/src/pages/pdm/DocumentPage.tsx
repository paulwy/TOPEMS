import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Button,
  Chip,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Typography,
  LinearProgress,
  Card,
  CardContent,
} from '@mui/material';
import {
  Plus,
  Edit,
  Delete,
  FileText,
  Upload,
  Download,
  Search,
  History,
  Eye,
  CheckCircle,
  Clock,
  AlertCircle,
  File,
} from 'lucide-react';
import {
  documentApi,
  type PdmDocument,
  type DocumentVersion,
  type CreatePdmDocumentRequest,
  type DocumentSearchParams,
} from '@/api/pdm/document';
import { useAppStore } from '@/store';
import { apiLogger } from '@/utils/logger';
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from '@/components/templates';
import { PageContainer } from '@/components/common/PageContainerV2';
import { designTokens } from '@/theme/tokens';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';

const ct = designTokens.colors;

const STATUS_COLORS: Record<
  string,
  'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error'
> = {
  draft: 'default',
  review: 'warning',
  approved: 'success',
  published: 'primary',
  archived: 'default',
};

const TYPE_COLORS: Record<
  string,
  'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error'
> = {
  specification: 'primary',
  manual: 'success',
  drawing: 'warning',
  report: 'secondary',
  procedure: 'default',
  other: 'default',
};

const VERSION_STATUS_COLORS: Record<
  string,
  'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error'
> = {
  draft: 'default',
  review: 'warning',
  approved: 'success',
  published: 'primary',
};

interface DocumentFormData {
  document_no: string;
  name: string;
  type: string;
  category: string;
  status: string;
  tags: string;
  description: string;
}

export const DocumentPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [keyword, setKeyword] = useState('');
  const [uploading, setUploading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [versionDialogOpen, setVersionDialogOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<PdmDocument | null>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [formData, setFormData] = useState<DocumentFormData>({
    document_no: '',
    name: '',
    type: 'other',
    category: '',
    status: 'draft',
    tags: '',
    description: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addNotification = useAppStore((state) => state.addNotification);

  const loadDocuments = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PDM.DOCUMENTS });
  }, [queryClient]);

  const { data: documents = [], isLoading: loading } = useQuery({
    queryKey: QUERY_KEYS.PDM.DOCUMENTS,
    queryFn: async () => {
      const response = await documentApi.list();
      if (response.success && response.data) {
        return response.data as PdmDocument[];
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: versions = [] } = useQuery({
    queryKey: QUERY_KEYS.PDM.DOCUMENT_VERSIONS(selectedDocumentId || ''),
    queryFn: async () => {
      if (!selectedDocumentId) return [];
      const response = await documentApi.listVersions(selectedDocumentId);
      if (response.success && response.data) {
        return response.data as DocumentVersion[];
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!selectedDocumentId,
  });

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const searchDocumentsMutation = useMutation({
    mutationFn: (keyword: string) => documentApi.search({ keyword }),
    onSuccess: (response) => {
      if (response.success && response.data) {
        queryClient.setQueryData(QUERY_KEYS.PDM.DOCUMENTS, response.data.documents || []);
      }
    },
    onError: () => {
      addNotification({ title: '错误', message: '搜索失败', type: 'error' });
    },
  });

  const handleSearchDocuments = () => {
    if (!keyword.trim()) {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PDM.DOCUMENTS });
      return;
    }
    searchDocumentsMutation.mutate(keyword);
  };

  const createDocumentMutation = useMutation({
    mutationFn: (data: CreatePdmDocumentRequest) => documentApi.create(data),
    onSuccess: () => {
      addNotification({ title: '成功', message: '文档创建成功', type: 'success' });
      setOpenDialog(false);
      setEditingDocument(null);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PDM.DOCUMENTS });
    },
    onError: () => {
      addNotification({ title: '错误', message: '创建失败', type: 'error' });
    },
  });

  const updateDocumentMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreatePdmDocumentRequest }) =>
      documentApi.update(id, data),
    onSuccess: () => {
      addNotification({ title: '成功', message: '文档更新成功', type: 'success' });
      setOpenDialog(false);
      setEditingDocument(null);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PDM.DOCUMENTS });
    },
    onError: () => {
      addNotification({ title: '错误', message: '更新失败', type: 'error' });
    },
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: (id: string) => documentApi.delete(id),
    onSuccess: () => {
      addNotification({ title: '成功', message: '文档删除成功', type: 'success' });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PDM.DOCUMENTS });
    },
    onError: () => {
      addNotification({ title: '错误', message: '删除失败', type: 'error' });
    },
  });

  const uploadVersionMutation = useMutation({
    mutationFn: ({ documentId, file }: { documentId: string; file: File }) =>
      documentApi.upload(documentId, file),
    onSuccess: (_data, variables) => {
      addNotification({ title: '成功', message: '文件上传成功', type: 'success' });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PDM.DOCUMENT_VERSIONS(variables.documentId) });
    },
    onError: () => {
      addNotification({ title: '错误', message: '上传失败', type: 'error' });
    },
  });

  const publishVersionMutation = useMutation({
    mutationFn: ({ documentId, versionId }: { documentId: string; versionId: string }) =>
      documentApi.publishVersion(documentId, versionId),
    onSuccess: (_data, variables) => {
      addNotification({ title: '成功', message: '版本发布成功', type: 'success' });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PDM.DOCUMENT_VERSIONS(variables.documentId) });
    },
    onError: () => {
      addNotification({ title: '错误', message: '发布失败', type: 'error' });
    },
  });

  const handleViewDocument = (doc: PdmDocument) => {
    setSelectedDocumentId(doc.id);
    setActiveTab(1);
  };

  const handleEditDocument = (doc: PdmDocument) => {
    setEditingDocument(doc);
    setFormData({
      document_no: doc.document_no || '',
      name: doc.name || '',
      type: doc.type || 'other',
      category: doc.category || '',
      status: doc.status || 'draft',
      tags: doc.tags?.join(', ') || '',
      description: doc.description || '',
    });
    setOpenDialog(true);
  };

  const handleDeleteDocument = (id: string) => {
    deleteDocumentMutation.mutate(id);
  };

  const handleCreate = () => {
    setEditingDocument(null);
    setFormData({
      document_no: '',
      name: '',
      type: 'other',
      category: '',
      status: 'draft',
      tags: '',
      description: '',
    });
    setOpenDialog(true);
  };

  const handleSaveDocument = () => {
    const requestData: CreatePdmDocumentRequest = {
      document_no: formData.document_no,
      name: formData.name,
      type: formData.type,
      category: formData.category || undefined,
      status: formData.status,
      tags: formData.tags ? formData.tags.split(',').map((t) => t.trim()) : undefined,
      description: formData.description || undefined,
    };

    if (editingDocument) {
      updateDocumentMutation.mutate({ id: editingDocument.id, data: requestData });
    } else {
      createDocumentMutation.mutate(requestData);
    }
  };

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedDocumentId) return;

    setUploading(true);
    uploadVersionMutation.mutate({ documentId: selectedDocumentId, file });
    setUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePublishVersion = (documentId: string, versionId: string) => {
    publishVersionMutation.mutate({ documentId, versionId });
  };

  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const matchesSearch =
        !searchTerm ||
        doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.document_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (doc.category && doc.category.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesSearch;
    });
  }, [documents, searchTerm]);

  const typeOptions = [
    { label: '规格说明', value: 'specification' },
    { label: '手册', value: 'manual' },
    { label: '图纸', value: 'drawing' },
    { label: '报告', value: 'report' },
    { label: '程序文件', value: 'procedure' },
    { label: '其他', value: 'other' },
  ];

  const statusOptions = [
    { label: '草稿', value: 'draft' },
    { label: '审核中', value: 'review' },
    { label: '已批准', value: 'approved' },
    { label: '已发布', value: 'published' },
    { label: '已归档', value: 'archived' },
  ];

  const statusFilterOptions = statusOptions.map((opt) => ({ label: opt.label, value: opt.value }));
  const typeFilterOptions = typeOptions.map((opt) => ({ label: opt.label, value: opt.value }));

  const filters: FilterConfig[] = useMemo(
    () => [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: statusFilterOptions,
      },
      {
        id: 'type',
        label: '类型',
        type: 'select',
        options: typeFilterOptions,
      },
    ],
    [statusFilterOptions, typeFilterOptions]
  );

  const handleFilterChange = useCallback((values: Record<string, any>) => {
    // Filter implementation
  }, []);

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  const columns: ColumnDef<PdmDocument>[] = useMemo(
    () => [
      { id: 'document_no', label: '文档编号', minWidth: 120 },
      { id: 'name', label: '文档名称', minWidth: 180 },
      {
        id: 'type',
        label: '类型',
        minWidth: 100,
        render: (row) => (
          <Chip
            label={typeOptions.find((t) => t.value === row.type)?.label || row.type}
            color={TYPE_COLORS[row.type] || 'default'}
            size='small'
          />
        ),
      },
      { id: 'category', label: '分类', minWidth: 100 },
      {
        id: 'current_version',
        label: '版本',
        minWidth: 80,
        render: (row) => `v${row.current_version || '1.0'}`,
      },
      {
        id: 'status',
        label: '状态',
        minWidth: 100,
        render: (row) => (
          <Chip
            label={statusOptions.find((s) => s.value === row.status)?.label || row.status}
            color={STATUS_COLORS[row.status] || 'default'}
            size='small'
          />
        ),
      },
      {
        id: 'version_count',
        label: '版本数',
        minWidth: 80,
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <History size={14} />
            <span>{row.version_count || 0}</span>
          </Box>
        ),
      },
      {
        id: 'created_at',
        label: '创建时间',
        minWidth: 160,
        render: (row) => {
          if (!row.created_at) return '-';
          const date = new Date(row.created_at);
          return date.toLocaleDateString('zh-CN');
        },
      },
    ],
    []
  );

  const rowActions: RowAction<PdmDocument>[] = useMemo(
    () => [
      {
        label: '查看版本',
        icon: <History size={16} />,
        color: 'primary',
        onClick: (row) => handleViewDocument(row),
      },
      {
        label: '编辑',
        icon: <Edit size={16} />,
        color: 'primary',
        onClick: (row) => handleEditDocument(row),
      },
      {
        label: '删除',
        icon: <Delete size={16} />,
        color: 'error',
        onClick: (row) => handleDeleteDocument(row.id),
        confirm: true,
        confirmMessage: '确定要删除这个文档吗？',
      },
    ],
    []
  );

  const statsCards = (
    <Grid
      container
      spacing={3}
      sx={{ mb: 2 }}
    >
      <Grid size={{ xs: 12, sm: 4 }}>
        <Box
          sx={{
            p: 2,
            borderRadius: 3,
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider',
          }}
        >
          <Box sx={{ color: 'text.secondary', fontSize: '0.875rem', mb: 1 }}>文档总数</Box>
          <Box sx={{ fontWeight: 'bold', fontSize: '1.5rem' }}>
            {loading ? '...' : `${filteredDocuments.length} 个`}
          </Box>
        </Box>
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <Box
          sx={{
            p: 2,
            borderRadius: 3,
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider',
          }}
        >
          <Box sx={{ color: 'text.secondary', fontSize: '0.875rem', mb: 1 }}>已发布</Box>
          <Box sx={{ fontWeight: 'bold', fontSize: '1.5rem', color: 'success.main' }}>
            {loading ? '...' : `${documents.filter((d) => d.status === 'published').length} 个`}
          </Box>
        </Box>
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <Box
          sx={{
            p: 2,
            borderRadius: 3,
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider',
          }}
        >
          <Box sx={{ color: 'text.secondary', fontSize: '0.875rem', mb: 1 }}>审核中</Box>
          <Box sx={{ fontWeight: 'bold', fontSize: '1.5rem', color: 'warning.main' }}>
            {loading ? '...' : `${documents.filter((d) => d.status === 'review').length} 个`}
          </Box>
        </Box>
      </Grid>
    </Grid>
  );

  return (
    <PageContainer
      headerProps={{
        pageIcon: <FileText style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.secondary.main} 0%, ${ct.secondary.dark} 100%)`,
      }}
    >
      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        sx={{ mb: 2 }}
      >
        <Tab label='文档列表' />
        <Tab label='版本管理' />
        <Tab label='文档检索' />
      </Tabs>

      {activeTab === 0 && (
        <ListPageTemplate
          title=''
          subtitle=''
          columns={columns}
          data={filteredDocuments}
          loading={loading}
          searchable
          searchPlaceholder='搜索文档名称、编号或分类...'
          onSearch={handleSearch}
          filters={filters}
          filtersValue={{}}
          onFilterChange={handleFilterChange}
          rowActions={rowActions}
          actions={[
            {
              label: '添加文档',
              icon: <Plus size={16} />,
              onClick: handleCreate,
              variant: 'contained',
            },
          ]}
          onRefresh={() => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PDM.DOCUMENTS })}
          headerContent={statsCards}
          emptyMessage='暂无文档数据'
        />
      )}

      {activeTab === 1 && (
        <Box>
          {selectedDocumentId ? (
            <Box>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 2,
                }}
              >
                <Typography variant='h6'>
                  文档版本 - {documents.find((d) => d.id === selectedDocumentId)?.name || ''}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <input
                    type='file'
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    onChange={handleUpload}
                  />
                  <Button
                    variant='contained'
                    startIcon={<Upload size={16} />}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    上传新版本
                  </Button>
                </Box>
              </Box>
              {uploading && <LinearProgress sx={{ mb: 2 }} />}
              <List>
                {versions.map((version) => (
                  <Card
                    key={version.id}
                    sx={{ mb: 1 }}
                  >
                    <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <File size={20} />
                          <Box>
                            <Typography variant='subtitle2'>
                              v{version.version_number} - {version.title}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                              <Chip
                                label={
                                  statusOptions.find((s) => s.value === version.status)?.label ||
                                  version.status
                                }
                                color={VERSION_STATUS_COLORS[version.status] || 'default'}
                                size='small'
                              />
                              <Typography
                                variant='caption'
                                color='text.secondary'
                              >
                                {version.created_by_name || version.created_by} 创建于{' '}
                                {new Date(version.created_at).toLocaleDateString('zh-CN')}
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          {version.status !== 'published' && (
                            <IconButton
                              size='small'
                              onClick={() => handlePublishVersion(selectedDocumentId, version.id)}
                              aria-label='发布版本'
                            >
                              <CheckCircle size={16} />
                            </IconButton>
                          )}
                          <IconButton
                            size='small'
                            aria-label='下载文档'
                          >
                            <Download size={16} />
                          </IconButton>
                        </Box>
                      </Box>
                      {version.description && (
                        <Typography
                          variant='body2'
                          color='text.secondary'
                          sx={{ mt: 1 }}
                        >
                          {version.description}
                        </Typography>
                      )}
                      {version.changes && version.changes.length > 0 && (
                        <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {version.changes.map((change, idx) => (
                            <Chip
                              key={idx}
                              label={change}
                              size='small'
                              variant='outlined'
                            />
                          ))}
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                ))}
                {versions.length === 0 && (
                  <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                    暂无版本数据
                  </Box>
                )}
              </List>
            </Box>
          ) : (
            <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
              <History
                size={48}
                style={{ marginBottom: 16, opacity: 0.5 }}
              />
              <Box>请先选择一个文档查看版本</Box>
            </Box>
          )}
        </Box>
      )}

      {activeTab === 2 && (
        <Box>
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <TextField
                  label='关键词搜索'
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  fullWidth
                  placeholder='输入文档名称、编号或标签...'
                  onKeyPress={(e) => e.key === 'Enter' && handleSearchDocuments()}
                />
                <Button
                  variant='contained'
                  startIcon={<Search size={16} />}
                  onClick={handleSearchDocuments}
                >
                  搜索
                </Button>
              </Box>
            </CardContent>
          </Card>
          <ListPageTemplate
            title='搜索结果'
            subtitle=''
            columns={columns}
            data={filteredDocuments}
            loading={loading}
            searchable={false}
            rowActions={rowActions}
            actions={[]}
            onRefresh={() => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PDM.DOCUMENTS })}
            emptyMessage='输入关键词搜索文档'
          />
        </Box>
      )}

      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>{editingDocument ? '编辑文档' : '添加文档'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
            <TextField
              label='文档编号 *'
              value={formData.document_no}
              onChange={(e) => setFormData({ ...formData, document_no: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label='文档名称 *'
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
              required
            />
            <Grid
              container
              spacing={3}
            >
              <Grid size={{ xs: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>类型</InputLabel>
                  <Select
                    value={formData.type}
                    label='类型'
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  >
                    {typeOptions.map((option) => (
                      <MenuItem
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>状态</InputLabel>
                  <Select
                    value={formData.status}
                    label='状态'
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    {statusOptions.map((option) => (
                      <MenuItem
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            <TextField
              label='分类'
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              fullWidth
            />
            <TextField
              label='标签（逗号分隔）'
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              fullWidth
              placeholder='如：重要, 机密, 参考'
            />
            <TextField
              label='描述'
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              fullWidth
              multiline
              rows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>取消</Button>
          <Button
            variant='contained'
            onClick={handleSaveDocument}
            disabled={!formData.document_no || !formData.name}
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default DocumentPage;
