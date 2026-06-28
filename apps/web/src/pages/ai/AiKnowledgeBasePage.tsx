import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tabs,
  Tab,
  Paper,
  Avatar,
  LinearProgress,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Badge,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material';
import {
  Database,
  Upload,
  Search,
  Plus,
  Trash2,
  Settings,
  MoreHorizontal,
  FileText,
  FileSpreadsheet,
  File,
  RefreshCw,
  PlayCircle,
  CheckCircle,
  Clock,
  AlertCircle,
  FolderOpen,
  Layers,
  Zap,
  Download,
  Edit3,
} from 'lucide-react';
import { PageContainer, Grid } from '@/components/common';
import { ListPageTemplate, type ColumnDef } from '@/components/templates';
import { useAppStore } from '@/store';
import { logger } from '@/utils/logger';

interface VectorCollection {
  id: string;
  name: string;
  description: string;
  document_count: number;
  vector_count: number;
  created_at: string;
  updated_at: string;
  embedding_model: string;
  status: 'active' | 'indexing' | 'error';
}

interface KnowledgeDocument {
  id: string;
  title: string;
  filename: string;
  file_size: string;
  file_type: string;
  status: 'indexed' | 'indexing' | 'pending' | 'error';
  collection_id: string;
  collection_name: string;
  chunks: number;
  created_at: string;
  indexed_at?: string;
  error_message?: string;
}

const mockCollections: VectorCollection[] = [
  {
    id: '1',
    name: '企业知识库',
    description: '包含企业规章制度、操作手册、培训资料等',
    document_count: 256,
    vector_count: 12580,
    created_at: '2024-01-15',
    updated_at: '2024-06-20',
    embedding_model: 'text-embedding-3-small',
    status: 'active',
  },
  {
    id: '2',
    name: '产品文档库',
    description: '产品规格书、技术文档、使用说明',
    document_count: 128,
    vector_count: 6420,
    created_at: '2024-02-20',
    updated_at: '2024-06-18',
    embedding_model: 'text-embedding-3-small',
    status: 'active',
  },
  {
    id: '3',
    name: '培训资料库',
    description: '新员工培训、技能培训、安全培训',
    document_count: 89,
    vector_count: 4250,
    created_at: '2024-03-10',
    updated_at: '2024-06-15',
    embedding_model: 'text-embedding-3-large',
    status: 'indexing',
  },
  {
    id: '4',
    name: '合同文档库',
    description: '各类合同模板和范本',
    document_count: 67,
    vector_count: 3120,
    created_at: '2024-04-05',
    updated_at: '2024-06-10',
    embedding_model: 'text-embedding-3-small',
    status: 'active',
  },
];

const mockDocuments: KnowledgeDocument[] = [
  {
    id: '1',
    title: '员工手册2024版',
    filename: 'employee_handbook_2024.pdf',
    file_size: '2.3 MB',
    file_type: 'pdf',
    status: 'indexed',
    collection_id: '1',
    collection_name: '企业知识库',
    chunks: 156,
    created_at: '2024-06-20 10:30',
    indexed_at: '2024-06-20 10:35',
  },
  {
    id: '2',
    title: '库存管理制度',
    filename: 'inventory_management.pdf',
    file_size: '1.5 MB',
    file_type: 'pdf',
    status: 'indexed',
    collection_id: '1',
    collection_name: '企业知识库',
    chunks: 89,
    created_at: '2024-06-19 14:20',
    indexed_at: '2024-06-19 14:25',
  },
  {
    id: '3',
    title: '产品规格书-X100系列',
    filename: 'product_spec_x100.docx',
    file_size: '856 KB',
    file_type: 'docx',
    status: 'indexed',
    collection_id: '2',
    collection_name: '产品文档库',
    chunks: 45,
    created_at: '2024-06-18 09:15',
    indexed_at: '2024-06-18 09:18',
  },
  {
    id: '4',
    title: '安全培训教材',
    filename: 'safety_training.pptx',
    file_size: '5.2 MB',
    file_type: 'pptx',
    status: 'indexing',
    collection_id: '3',
    collection_name: '培训资料库',
    chunks: 0,
    created_at: '2024-06-21 08:00',
  },
  {
    id: '5',
    title: '采购合同模板',
    filename: 'purchase_contract_template.docx',
    file_size: '128 KB',
    file_type: 'docx',
    status: 'indexed',
    collection_id: '4',
    collection_name: '合同文档库',
    chunks: 12,
    created_at: '2024-06-17 16:45',
    indexed_at: '2024-06-17 16:46',
  },
  {
    id: '6',
    title: '财务报销制度',
    filename: 'expense_reimbursement.pdf',
    file_size: '678 KB',
    file_type: 'pdf',
    status: 'error',
    collection_id: '1',
    collection_name: '企业知识库',
    chunks: 0,
    created_at: '2024-06-21 10:00',
    error_message: '文件解析失败：格式不支持',
  },
];

const getStatusConfig = (status: KnowledgeDocument['status']) => {
  const configs = {
    indexed: { label: '已索引', color: 'success' as const, icon: <CheckCircle size={14} /> },
    indexing: { label: '索引中', color: 'warning' as const, icon: <RefreshCw size={14} className="animate-spin" /> },
    pending: { label: '待处理', color: 'default' as const, icon: <Clock size={14} /> },
    error: { label: '失败', color: 'error' as const, icon: <AlertCircle size={14} /> },
  };
  return configs[status];
};

const getFileIcon = (fileType: string) => {
  if (fileType === 'pdf') return <FileText size={20} style={{ color: '#ef4444' }} />;
  if (['docx', 'doc'].includes(fileType)) return <FileText size={20} style={{ color: '#3b82f6' }} />;
  if (['xlsx', 'xls'].includes(fileType)) return <FileSpreadsheet size={20} style={{ color: '#22c55e' }} />;
  if (['pptx', 'ppt'].includes(fileType)) return <File size={20} style={{ color: '#f97316' }} />;
  return <File size={20} style={{ color: '#6b7280' }} />;
};

export const AiKnowledgeBasePage: React.FC = () => {
  const addNotification = useAppStore((state) => state.addNotification);
  const [activeTab, setActiveTab] = useState<'collections' | 'documents'>('collections');
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [collectionDialogOpen, setCollectionDialogOpen] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const columns: ColumnDef<KnowledgeDocument>[] = [
    {
      id: 'title',
      label: '文档名称',
      sortable: true,
      minWidth: 250,
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {getFileIcon(row.file_type)}
          <Box>
            <Typography
              variant='body2'
              sx={{ fontWeight: 500 }}
            >
              {row.title}
            </Typography>
            <Typography
              variant='caption'
              color='text.secondary'
            >
              {row.filename}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      id: 'collection_name',
      label: '所属库',
      sortable: true,
      width: 140,
      render: (row) => (
        <Chip
          label={row.collection_name}
          size='small'
          variant='outlined'
          sx={{ borderRadius: 1 }}
        />
      ),
    },
    {
      id: 'file_size',
      label: '大小',
      sortable: true,
      width: 100,
    },
    {
      id: 'chunks',
      label: '分片数',
      sortable: true,
      width: 100,
    },
    {
      id: 'status',
      label: '状态',
      sortable: true,
      width: 120,
      render: (row) => {
        const config = getStatusConfig(row.status);
        return (
          <Chip
            label={config.label}
            size='small'
            color={config.color}
            icon={config.icon}
            sx={{ borderRadius: 1 }}
          />
        );
      },
    },
    {
      id: 'created_at',
      label: '上传时间',
      sortable: true,
      width: 160,
    },
  ];

  const rowActions: import('@/components/templates/list/types').RowAction<KnowledgeDocument>[] = [
    {
      label: '重新索引',
      icon: <RefreshCw size={16} />,
      color: 'primary',
      onClick: (row) => {
        addNotification({
          title: '重新索引',
          message: `文档「${row.title}」已开始重新索引`,
          type: 'info',
        });
      },
    },
    {
      label: '下载',
      icon: <Download size={16} />,
      color: 'info',
      onClick: (row) => {
        addNotification({
          title: '下载',
          message: `开始下载「${row.title}」`,
          type: 'info',
        });
      },
    },
    {
      label: '删除',
      icon: <Trash2 size={16} />,
      color: 'error',
      divider: true,
      onClick: (row) => {
        addNotification({
          title: '删除成功',
          message: `文档「${row.title}」已删除`,
          type: 'success',
        });
      },
    },
  ];

  const handleUpload = useCallback(() => {
    if (!selectedCollection || selectedFiles.length === 0) {
      addNotification({
        title: '提示',
        message: '请选择目标库和文件',
        type: 'warning',
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setUploading(false);
          setUploadDialogOpen(false);
          setSelectedFiles([]);
          setUploadProgress(0);
          addNotification({
            title: '上传成功',
            message: `${selectedFiles.length} 个文件已上传，正在建立索引...`,
            type: 'success',
          });
          return 100;
        }
        return prev + 10;
      });
    }, 300);
  }, [selectedCollection, selectedFiles, addNotification]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const stats = [
    { label: '向量库数量', value: mockCollections.length, icon: <Database size={20} />, color: 'primary' },
    { label: '文档总数', value: '540', icon: <FileText size={20} />, color: 'success' },
    { label: '向量总数', value: '26.3K', icon: <Layers size={20} />, color: 'warning' },
    { label: '索引中', value: '3', icon: <RefreshCw size={20} />, color: 'info' },
  ];

  return (
    <PageContainer
      title='知识库管理'
      subtitle='向量库管理、文档上传和索引管理'
      padding={false}
      maxWidth={false}
      headerProps={{
        pageIcon: <Database style={{ width: 20, height: 20 }} />,
        pageGradient: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
      }}
    >
      <Box sx={{ p: 3 }}>
        {/* 统计卡片 */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {stats.map((stat, index) => (
            <Grid item xs={6} sm={3} key={index}>
              <Paper sx={{ p: 2.5, borderRadius: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar
                    sx={{
                      width: 48,
                      height: 48,
                      bgcolor: `${stat.color}.50`,
                      color: `${stat.color}.main`,
                    }}
                  >
                    {stat.icon}
                  </Avatar>
                  <Box>
                    <Typography
                      variant='h5'
                      sx={{ fontWeight: 700 }}
                    >
                      {stat.value}
                    </Typography>
                    <Typography
                      variant='body2'
                      color='text.secondary'
                    >
                      {stat.label}
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* 标签页和操作栏 */}
        <Paper sx={{ borderRadius: 2, mb: 3 }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: 1,
              borderColor: 'divider',
              px: 2,
            }}
          >
            <Tabs
              value={activeTab}
              onChange={(_, v) => setActiveTab(v)}
              sx={{ minHeight: 48 }}
            >
              <Tab
                label='向量库'
                value='collections'
                sx={{ minHeight: 48, textTransform: 'none' }}
              />
              <Tab
                label='文档列表'
                value='documents'
                sx={{ minHeight: 48, textTransform: 'none' }}
              />
            </Tabs>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant='outlined'
                startIcon={<Search size={18} />}
                size='small'
                onClick={() => {
                  addNotification({
                    title: '语义搜索',
                    message: '正在打开语义搜索面板...',
                    type: 'info',
                  });
                }}
              >
                语义搜索
              </Button>
              {activeTab === 'collections' && (
                <Button
                  variant='contained'
                  startIcon={<Plus size={18} />}
                  size='small'
                  onClick={() => setCollectionDialogOpen(true)}
                >
                  新建向量库
                </Button>
              )}
              {activeTab === 'documents' && (
                <Button
                  variant='contained'
                  startIcon={<Upload size={18} />}
                  size='small'
                  onClick={() => setUploadDialogOpen(true)}
                >
                  上传文档
                </Button>
              )}
            </Box>
          </Box>

          {/* 向量库列表 */}
          {activeTab === 'collections' && (
            <Box sx={{ p: 2 }}>
              <Grid container spacing={2}>
                {mockCollections.map((collection) => (
                  <Grid item xs={12} sm={6} md={4} key={collection.id}>
                    <Paper
                      variant='outlined'
                      sx={{
                        p: 2.5,
                        borderRadius: 2,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        '&:hover': {
                          borderColor: 'primary.main',
                          boxShadow: 2,
                        },
                      }}
                      onClick={() => {
                        setActiveTab('documents');
                        setSearchQuery(collection.name);
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                          <Avatar
                            sx={{
                              bgcolor: 'primary.50',
                              color: 'primary.main',
                            }}
                          >
                            <FolderOpen size={22} />
                          </Avatar>
                          <Box>
                            <Typography
                              variant='subtitle1'
                              sx={{ fontWeight: 600 }}
                            >
                              {collection.name}
                            </Typography>
                            <Chip
                              label={collection.status === 'active' ? '运行中' : '索引中'}
                              size='small'
                              color={collection.status === 'active' ? 'success' : 'warning'}
                              sx={{ height: 20, fontSize: 11, mt: 0.5 }}
                            />
                          </Box>
                        </Box>
                        <IconButton size='small'>
                          <MoreHorizontal size={18} />
                        </IconButton>
                      </Box>
                      <Typography
                        variant='body2'
                        color='text.secondary'
                        sx={{ mb: 2, minHeight: 40 }}
                      >
                        {collection.description}
                      </Typography>
                      <Divider sx={{ my: 1.5 }} />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography
                            variant='body2'
                            sx={{ fontWeight: 600 }}
                          >
                            {collection.document_count}
                          </Typography>
                          <Typography
                            variant='caption'
                            color='text.secondary'
                          >
                            文档
                          </Typography>
                        </Box>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography
                            variant='body2'
                            sx={{ fontWeight: 600 }}
                          >
                            {collection.vector_count.toLocaleString()}
                          </Typography>
                          <Typography
                            variant='caption'
                            color='text.secondary'
                          >
                            向量
                          </Typography>
                        </Box>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography
                            variant='body2'
                            sx={{ fontWeight: 600 }}
                          >
                            {collection.embedding_model.split('-').pop()}
                          </Typography>
                          <Typography
                            variant='caption'
                            color='text.secondary'
                          >
                            嵌入模型
                          </Typography>
                        </Box>
                      </Box>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {/* 文档列表 */}
          {activeTab === 'documents' && (
            <ListPageTemplate
              columns={columns}
              data={mockDocuments.filter(
                (d) => !searchQuery || d.title.includes(searchQuery) || d.collection_name.includes(searchQuery)
              )}
              searchable
              searchPlaceholder='搜索文档名称、所属库...'
              searchValue={searchQuery}
              onSearch={setSearchQuery}
              rowActions={rowActions}
              selectable
              pagination={{
                page: 0,
                pageSize: 10,
                total: mockDocuments.length,
                onPageChange: () => {},
              }}
              showRowNumber
              columnConfigurable
              persistColumnConfig
              columnConfigStorageKey='ai-knowledge-documents'
              sx={{ border: 'none', boxShadow: 'none' }}
            />
          )}
        </Paper>
      </Box>

      {/* 上传文档对话框 */}
      <Dialog
        open={uploadDialogOpen}
        onClose={() => !uploading && setUploadDialogOpen(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>上传文档</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography
              variant='body2'
              color='text.secondary'
              sx={{ mb: 1 }}
            >
              目标向量库
            </Typography>
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel id='collection-select-label'>选择向量库</InputLabel>
              <Select
                labelId='collection-select-label'
                value={selectedCollection}
                label='选择向量库'
                onChange={(e) => setSelectedCollection(e.target.value)}
              >
                <MenuItem value=''>请选择向量库</MenuItem>
                {mockCollections.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Typography
              variant='body2'
              color='text.secondary'
              sx={{ mb: 1 }}
            >
              选择文件
            </Typography>
            <Box
              sx={{
                border: '2px dashed',
                borderColor: 'divider',
                borderRadius: 2,
                p: 4,
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: 'primary.50',
                },
              }}
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <input
                type='file'
                id='file-input'
                multiple
                accept='.pdf,.docx,.doc,.xlsx,.xls,.pptx,.ppt,.txt'
                style={{ display: 'none' }}
                onChange={handleFileSelect}
              />
              <Upload
                size={40}
                style={{ margin: '0 auto 12px', color: '#9ca3af' }}
              />
              <Typography
                variant='body1'
                sx={{ fontWeight: 500, mb: 1 }}
              >
                点击或拖拽文件到此处上传
              </Typography>
              <Typography
                variant='body2'
                color='text.secondary'
              >
                支持 PDF、Word、Excel、PPT、TXT 格式
              </Typography>
            </Box>

            {selectedFiles.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography
                  variant='body2'
                  sx={{ fontWeight: 500, mb: 1 }}
                >
                  已选择 {selectedFiles.length} 个文件
                </Typography>
                {selectedFiles.map((file, index) => (
                  <Box
                    key={index}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      p: 1.5,
                      bgcolor: 'grey.50',
                      borderRadius: 1,
                      mb: 1,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      {getFileIcon(file.name.split('.').pop() || '')}
                      <Typography variant='body2'>{file.name}</Typography>
                    </Box>
                    <Typography variant='caption' color='text.secondary'>
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}

            {uploading && (
              <Box sx={{ mt: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant='body2'>上传中...</Typography>
                  <Typography variant='body2'>{uploadProgress}%</Typography>
                </Box>
                <LinearProgress variant='determinate' value={uploadProgress} />
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setUploadDialogOpen(false)}
            disabled={uploading}
          >
            取消
          </Button>
          <Button
            variant='contained'
            onClick={handleUpload}
            disabled={!selectedCollection || selectedFiles.length === 0 || uploading}
            startIcon={<Upload size={18} />}
          >
            {uploading ? '上传中' : '开始上传'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 新建向量库对话框 */}
      <Dialog
        open={collectionDialogOpen}
        onClose={() => setCollectionDialogOpen(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>新建向量库</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label='向量库名称'
              placeholder='请输入向量库名称'
            />
            <TextField
              fullWidth
              label='描述'
              placeholder='请输入向量库描述'
              multiline
              rows={3}
            />
            <FormControl fullWidth>
              <InputLabel id='embedding-model-label'>嵌入模型</InputLabel>
              <Select
                labelId='embedding-model-label'
                defaultValue='text-embedding-3-small'
                label='嵌入模型'
              >
                <MenuItem value='text-embedding-3-small'>text-embedding-3-small</MenuItem>
                <MenuItem value='text-embedding-3-large'>text-embedding-3-large</MenuItem>
                <MenuItem value='text-embedding-ada-002'>text-embedding-ada-002</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCollectionDialogOpen(false)}>取消</Button>
          <Button
            variant='contained'
            onClick={() => {
              setCollectionDialogOpen(false);
              addNotification({
                title: '创建成功',
                message: '向量库已创建成功',
                type: 'success',
              });
            }}
          >
            创建
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default AiKnowledgeBasePage;
