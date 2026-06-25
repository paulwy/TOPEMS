import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import {
  GitBranch,
  Plus,
  Check,
  Clock,
  User,
  Tag,
  Edit,
} from 'lucide-react';
import { pdmApi } from '@/api/pdm';
import type { DocumentVersion, Document } from '@/api/pdm';
import { useAppStore } from '@/store';
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from '@/components/templates';
import { apiLogger } from '@/utils/logger';

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
  const [selectedDocument, setSelectedDocument] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalVersions, setTotalVersions] = useState(0);

  const [formData, setFormData] = useState<FormData>({
    document_id: '',
    title: '',
    description: '',
    type: 'minor',
    changes: '',
  });

  const addNotification = useAppStore((state) => state.addNotification);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    loadDocuments();
    loadVersions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pageSize, debouncedSearch, filterType, selectedDocument]);

  const loadDocuments = async () => {
    try {
      const response = await pdmApi.listDocuments();
      if (response.success && response.data) {
        const data = response.data as any;
        const items = Array.isArray(data) ? data : data.documents || [];
        setDocuments(items);
        if (items.length > 0 && !selectedDocument) {
          setSelectedDocument(items[0].id);
          setFormData({ ...formData, document_id: items[0].id });
        }
      }
    } catch (err: unknown) {
      apiLogger.error('加载文档列表失败:', err);
      setDocuments([]);
    }
  };

  const loadVersions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await pdmApi.listVersions();
      if (response.success && response.data) {
        const data = response.data as any;
        const items = Array.isArray(data) ? data : data.versions || [];

        let filtered = items;

        if (selectedDocument) {
          filtered = filtered.filter((v: DocumentVersion) => v.document_id === selectedDocument);
        }

        if (filterType) {
          filtered = filtered.filter((v: DocumentVersion) => v.type === filterType);
        }

        if (debouncedSearch) {
          const searchLower = debouncedSearch.toLowerCase();
          filtered = filtered.filter((v: DocumentVersion) => {
            const matchTitle = v.title?.toLowerCase().includes(searchLower);
            const matchVersion = v.version_number?.toLowerCase().includes(searchLower);
            const matchDesc = v.description?.toLowerCase().includes(searchLower);
            return matchTitle || matchVersion || matchDesc;
          });
        }

        const adapted = filtered.map((item: DocumentVersion) => ({
          ...item,
          versionNumber: (item as any).version_number || (item as any).versionNumber || '',
        }));

        setTotalVersions(adapted.length);
        const start = currentPage * pageSize;
        const end = start + pageSize;
        setVersions(adapted.slice(start, end) as DocumentVersion[]);
      } else {
        setVersions([]);
        setTotalVersions(0);
      }
    } catch (err: unknown) {
      const message = (err as { message?: string }).message || '加载数据失败';
      setError(message);
      apiLogger.error('加载版本列表失败:', err);
      setVersions([]);
      setTotalVersions(0);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, debouncedSearch, filterType, selectedDocument]);

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

  const handleSave = async () => {
    try {
      const requestData = {
        document_id: formData.document_id,
        title: formData.title,
        description: formData.description,
        type: formData.type,
        changes: formData.changes.split('\n').filter(Boolean),
      };

      await pdmApi.createVersion(requestData);
      addNotification({ title: '成功', message: '版本创建成功', type: 'success' });
      setOpenDialog(false);
      loadVersions();
    } catch (err: unknown) {
      apiLogger.error('创建版本失败:', err);
      addNotification({ title: '错误', message: '创建失败', type: 'error' });
    }
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
      setFilterType(filters.type);
      setCurrentPage(0);
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
        value: selectedDocument,
        onChange: (value: any) => handleDocumentChange(value),
      },
      {
        id: 'type',
        label: '版本类型',
        type: 'select',
        options: VERSION_TYPE_OPTIONS,
        value: filterType,
        onChange: (value: any) => setFilterType(value),
      },
    ],
    [documents, selectedDocument, filterType]
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
            <Typography sx={{ fontWeight: 600, color: 'grey.900' }}>{row.version_number}</Typography>
            <Chip
              size='small'
              label={VERSION_TYPE_LABEL_MAP[row.type] || row.type}
              color={VERSION_TYPE_COLOR_MAP[row.type] || 'default'}
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
            label={VERSION_TYPE_LABEL_MAP[row.type] || row.type}
            color={VERSION_TYPE_COLOR_MAP[row.type] || 'default'}
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
    <Box sx={{ minHeight: '100vh', backgroundColor: 'grey.50' }}>
      <ListPageTemplate
        title='版本管理'
        subtitle='管理文档和产品的版本历史与变更记录'
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
        onRefresh={loadVersions}
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
                  <MenuItem key={doc.id} value={doc.id}>
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
          <Button variant='contained' onClick={handleSave}>
            创建版本
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PdmVersionPage;
