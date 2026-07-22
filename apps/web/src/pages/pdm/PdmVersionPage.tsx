import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { GitBranch, Plus, Check, Clock, User, Tag, Edit } from 'lucide-react';
import { pdmApi } from '@/api/pdm';
import type { DocumentVersion, Document } from '@/api/pdm';
import { useNotificationStore } from '@/store';
import { useUrlListState } from '@/hooks';
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from '@/components/templates';
import { PageContainer } from '@/components/common/PageContainerV2';
import { designTokens } from '@/theme/tokens';
import { QUERY_KEYS } from '@/lib/reactQuery';

const ct = designTokens.colors;

interface FormData {
  document_id: string;
  title: string;
  description: string;
  type: string;
  changes: string;
}

const VERSION_TYPE_COLOR_MAP: Record<string, 'error' | 'warning' | 'success' | 'default'> = {
  major: 'error',
  minor: 'warning',
  patch: 'success',
};

const VERSION_TYPE_LABEL_MAP: Record<string, string> = {
  major: '重大版本',
  minor: '次要版本',
  patch: '补丁版本',
};

const STATUS_COLOR_MAP: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  published: 'success',
  draft: 'warning',
  deprecated: 'error',
};

const STATUS_LABEL_MAP: Record<string, string> = {
  published: '已发布',
  draft: '草稿',
  deprecated: '已废弃',
};

const VERSION_TYPE_OPTIONS = [
  { value: '', label: '全部类型' },
  { value: 'major', label: '重大版本' },
  { value: 'minor', label: '次要版本' },
  { value: 'patch', label: '补丁版本' },
];

export const PdmVersionPage: React.FC = () => {
  const listState = useUrlListState<{ type: string }>({
    defaultSearch: '',
    defaultPageSize: 20,
    defaultFilters: { type: '' },
    baseIndex: 0,
    historyMode: 'replace',
  });
  const {
    searchQuery,
    debouncedSearch,
    currentPage,
    pageSize,
    filters: urlFilters,
    setSearchQuery,
    setFilter,
    setCurrentPage,
    setPageSize,
  } = listState;
  const filterType = urlFilters.type;
  const [selectedDocument, setSelectedDocument] = useState('');
  const [openDialog, setOpenDialog] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    document_id: '',
    title: '',
    description: '',
    type: 'minor',
    changes: '',
  });

  const addNotification = useNotificationStore((state) => state.addNotification);
  const queryClient = useQueryClient();

  const { data: documents = [] } = useQuery<Document[]>({
    queryKey: QUERY_KEYS.PDM.DOCUMENTS,
    queryFn: async (): Promise<Document[]> => {
      const response = await pdmApi.listDocuments();
      if (response.success && response.data) {
        const data = response.data as unknown as Record<string, unknown>;
        return (Array.isArray(data) ? data : data.documents || []) as unknown as Document[];
      }
      return [];
    },
  });

  // Auto-select first document when documents load
  useEffect(() => {
    if (documents.length > 0 && !selectedDocument) {
      setSelectedDocument(documents[0].id);
      setFormData((prev) => ({ ...prev, document_id: documents[0].id }));
    }
  }, [documents, selectedDocument]);

  const {
    data: allVersions = [],
    isLoading: loading,
    error: queryError,
  } = useQuery<DocumentVersion[]>({
    queryKey: QUERY_KEYS.PDM.DOCUMENT_VERSIONS(selectedDocument || 'none'),
    queryFn: async (): Promise<DocumentVersion[]> => {
      if (!selectedDocument) return [];
      const response = await pdmApi.listVersions(selectedDocument);
      if (response.success && response.data) {
        const data = response.data as unknown as Record<string, unknown>;
        return (Array.isArray(data) ? data : data.versions || []) as unknown as DocumentVersion[];
      }
      return [];
    },
    enabled: !!selectedDocument,
  });

  const error = queryError
    ? queryError instanceof Error
      ? queryError.message
      : '加载数据失败'
    : null;

  const { versions, totalVersions } = useMemo(() => {
    let filtered = allVersions;

    if (selectedDocument) {
      filtered = filtered.filter((v) => v.document_id === selectedDocument);
    }

    if (filterType) {
      filtered = filtered.filter((v) => v.type === filterType);
    }

    if (debouncedSearch) {
      const searchLower = debouncedSearch.toLowerCase();
      filtered = filtered.filter((v) => {
        const matchTitle = v.title?.toLowerCase().includes(searchLower);
        const matchVersion = v.version_number?.toLowerCase().includes(searchLower);
        const matchDesc = v.description?.toLowerCase().includes(searchLower);
        return matchTitle || matchVersion || matchDesc;
      });
    }

    const adapted = filtered.map((item) => ({
      ...item,
      versionNumber: item.version_number || '',
    }));

    const total = adapted.length;
    const start = currentPage * pageSize;
    const end = start + pageSize;
    return { versions: adapted.slice(start, end) as DocumentVersion[], totalVersions: total };
  }, [allVersions, selectedDocument, filterType, debouncedSearch, currentPage, pageSize]);

  const createVersionMutation = useMutation({
    mutationFn: async (data: {
      document_id: string;
      version_number: string;
      title: string;
      description: string;
      changes: string[];
    }) => {
      await pdmApi.createVersion(data);
    },
    onSuccess: () => {
      addNotification({ title: '成功', message: '版本创建成功', type: 'success' });
      setOpenDialog(false);
      if (selectedDocument) {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.PDM.DOCUMENT_VERSIONS(selectedDocument),
        });
      }
    },
    onError: () => {
      addNotification({ title: '错误', message: '创建失败', type: 'error' });
    },
  });

  const handleCreate = () => {
    setFormData({
      document_id: selectedDocument,
      title: '',
      description: '',
      type: 'minor',
      changes: '',
    });
    setOpenDialog(true);
  };

  const handleSave = () => {
    const requestData = {
      document_id: formData.document_id,
      version_number: `V${Date.now()}`,
      title: formData.title,
      description: formData.description,
      changes: formData.changes.split('\n').filter(Boolean),
    };
    createVersionMutation.mutate(requestData);
  };

  const handleDocumentChange = (value: string) => {
    setSelectedDocument(value);
    setFormData({ ...formData, document_id: value });
    setCurrentPage(0);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(0);
  };

  const handleFilterChange = (filters: Record<string, any>) => {
    if (filters.document !== undefined) {
      handleDocumentChange(filters.document);
    }
    if (filters.type !== undefined) {
      setFilter('type', filters.type);
    }
  };

  const handleRefresh = () => {
    if (selectedDocument) {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.PDM.DOCUMENT_VERSIONS(selectedDocument),
      });
    }
  };

  const currentVersion = versions.find((v) => v.status === 'published');

  const filters = useMemo<FilterConfig[]>(
    () => [
      {
        id: 'document',
        label: '关联文档',
        type: 'select',
        options: [
          { value: '', label: '全部文档' },
          ...documents.map((doc) => ({ value: doc.id, label: doc.name })),
        ],
      },
      {
        id: 'type',
        label: '版本类型',
        type: 'select',
        options: VERSION_TYPE_OPTIONS,
      },
    ],
    [documents]
  );

  const columns = useMemo<ColumnDef<DocumentVersion>[]>(
    () => [
      {
        id: 'version_number',
        label: '版本号',
        width: 220,
        sortable: true,
        render: (row) => (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <GitBranch size={18} />
            <Typography sx={{ fontWeight: 600, color: 'grey.900' }}>
              {row.version_number}
            </Typography>
            <Chip
              size='small'
              label={VERSION_TYPE_LABEL_MAP[row.type || ''] || row.type}
              color={VERSION_TYPE_COLOR_MAP[row.type || ''] || 'default'}
            />
            {row.status === 'published' && (
              <Chip
                size='small'
                label='当前版本'
                color='success'
                icon={<Check size={12} />}
              />
            )}
          </Box>
        ),
      },
      {
        id: 'title',
        label: '版本标题',
        width: 200,
        render: (row) => (
          <Typography sx={{ fontWeight: 500, color: 'grey.900' }}>{row.title}</Typography>
        ),
      },
      {
        id: 'description',
        label: '描述',
        minWidth: 200,
        render: (row) => (
          <Typography sx={{ fontSize: '0.875rem', color: 'grey.600' }}>
            {row.description || '-'}
          </Typography>
        ),
      },
      {
        id: 'type',
        label: '版本类型',
        width: 120,
        render: (row) => (
          <Chip
            size='small'
            label={VERSION_TYPE_LABEL_MAP[row.type || ''] || row.type}
            color={VERSION_TYPE_COLOR_MAP[row.type || ''] || 'default'}
          />
        ),
      },
      {
        id: 'status',
        label: '状态',
        width: 100,
        render: (row) => (
          <Chip
            size='small'
            label={STATUS_LABEL_MAP[row.status] || row.status}
            color={STATUS_COLOR_MAP[row.status] || 'default'}
          />
        ),
      },
      {
        id: 'created_at',
        label: '创建时间',
        width: 130,
        sortable: true,
        render: (row) => (
          <Typography sx={{ fontSize: '0.875rem', color: 'grey.600' }}>
            {row.created_at?.substring(0, 10) || '-'}
          </Typography>
        ),
      },
      {
        id: 'created_by',
        label: '创建人',
        width: 100,
        render: (row) => (
          <Typography sx={{ fontSize: '0.875rem', color: 'grey.600' }}>
            {row.created_by || '-'}
          </Typography>
        ),
      },
    ],
    []
  );

  const rowActions = useMemo<RowAction<DocumentVersion>[]>(
    () => [
      {
        label: '查看详情',
        icon: <Edit sx={{ width: 16, height: 16 }} />,
        onClick: () => {
          addNotification({
            title: '提示',
            message: '查看详情功能开发中',
            type: 'info',
          });
        },
      },
    ],
    [addNotification]
  );

  const headerContent = useMemo(
    () => (
      <Box sx={{ mb: 4 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
            gap: 2,
            mb: 4,
          }}
        >
          <Card>
            <CardContent>
              <Typography
                variant='body2'
                color='text.secondary'
                sx={{ mb: 2 }}
              >
                版本总数
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 'bold' }}
              >
                {totalVersions} 个
              </Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Typography
                variant='body2'
                color='text.secondary'
                sx={{ mb: 2 }}
              >
                当前版本
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 'bold', color: 'primary.main' }}
              >
                {currentVersion?.version_number || '-'}
              </Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Typography
                variant='body2'
                color='text.secondary'
                sx={{ mb: 2 }}
              >
                关联文档
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 'bold' }}
              >
                {documents.length} 个
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Box>
    ),
    [totalVersions, currentVersion?.version_number, documents.length]
  );

  return (
    <PageContainer
      headerProps={{
        pageIcon: <GitBranch style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.primary.main} 0%, ${ct.primary[600]} 100%)`,
      }}
    >
      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={versions}
        loading={loading}
        error={error || undefined}
        getRowId={(row) => row.id}
        sortable
        defaultSortBy='created_at'
        defaultSortOrder='desc'
        searchable
        searchPlaceholder='搜索版本标题、版本号、描述...'
        searchValue={searchQuery}
        onSearch={setSearchQuery}
        filters={filters}
        filtersValue={{ document: selectedDocument, type: filterType }}
        onFilterChange={handleFilterChange}
        pagination={{
          page: currentPage,
          pageSize,
          total: totalVersions,
          onPageChange: handlePageChange,
          onPageSizeChange: handlePageSizeChange,
        }}
        rowActions={rowActions}
        onRefresh={handleRefresh}
        headerContent={headerContent}
        actions={[
          {
            label: '创建新版本',
            icon: <Plus sx={{ width: 16, height: 16 }} />,
            onClick: handleCreate,
            variant: 'contained',
          },
        ]}
        showRowNumber
        columnConfigurable
        persistColumnConfig
        columnConfigStorageKey='pdm-versions-columns'
      />

      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>创建新版本</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
            <FormControl fullWidth>
              <InputLabel>关联文档</InputLabel>
              <Select
                value={formData.document_id}
                label='关联文档'
                onChange={(e) => setFormData({ ...formData, document_id: e.target.value })}
              >
                {documents.map((doc) => (
                  <MenuItem
                    key={doc.id}
                    value={doc.id}
                  >
                    {doc.name} ({doc.type})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label='版本标题 *'
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder='输入版本标题'
              fullWidth
              required
            />
            <TextField
              label='版本描述'
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder='输入版本描述'
              multiline
              rows={3}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>版本类型</InputLabel>
              <Select
                value={formData.type}
                label='版本类型'
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              >
                <MenuItem value='major'>重大版本 (Major)</MenuItem>
                <MenuItem value='minor'>次要版本 (Minor)</MenuItem>
                <MenuItem value='patch'>补丁版本 (Patch)</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label='变更内容'
              value={formData.changes}
              onChange={(e) => setFormData({ ...formData, changes: e.target.value })}
              placeholder='输入变更内容，每行一项'
              multiline
              rows={4}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>取消</Button>
          <Button
            variant='contained'
            onClick={handleSave}
            disabled={createVersionMutation.isPending}
          >
            创建版本
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default PdmVersionPage;
