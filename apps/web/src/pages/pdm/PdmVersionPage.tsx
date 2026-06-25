import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardHeader,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from '@mui/material';
import {
  GitBranch,
  Plus,
  Check,
  Clock,
  User,
  Tag,
} from 'lucide-react';
import { pdmApi } from '@/api/pdm';
import type { DocumentVersion, Document } from '@/api/pdm';
import { useAppStore } from '@/store';
import { apiLogger } from '@/utils/logger';

interface FormData {
  document_id: string;
  title: string;
  description: string;
  type: string;
  changes: string;
}

export const PdmVersionPage: React.FC = () => {
  const [selectedDocument, setSelectedDocument] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<FormData>({
    document_id: '',
    title: '',
    description: '',
    type: 'minor',
    changes: '',
  });
  const addNotification = useAppStore((state) => state.addNotification);

  useEffect(() => {
    loadDocuments();
    loadVersions();
  }, []);

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
      apiLogger.error('加载文档数据失败:', err);
      setDocuments([]);
    }
  };

  const loadVersions = async () => {
    try {
      setLoading(true);
      const response = await pdmApi.listVersions();
      if (response.success && response.data) {
        const data = response.data as any;
        const items = Array.isArray(data) ? data : data.versions || [];
        const adapted = items.map((item: { [key: string]: unknown }) => ({
          ...item,
          versionNumber: item.version_number || item.versionNumber || '',
        }));
        setVersions(adapted as DocumentVersion[]);
      } else {
        setVersions([]);
      }
    } catch (err: unknown) {
      apiLogger.error('加载版本数据失败:', err);
      setVersions([]);
    } finally {
      setLoading(false);
    }
  };

  const getVersionTypeColor = (type: string) => {
    switch (type) {
      case 'major':
        return 'error';
      case 'minor':
        return 'warning';
      case 'patch':
        return 'success';
      default:
        return 'default';
    }
  };

  const getVersionTypeLabel = (type: string) => {
    switch (type) {
      case 'major':
        return '重大版本';
      case 'minor':
        return '次要版本';
      case 'patch':
        return '补丁版本';
      default:
        return type;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'success';
      case 'draft':
        return 'warning';
      case 'deprecated':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'published':
        return '已发布';
      case 'draft':
        return '草稿';
      case 'deprecated':
        return '已废弃';
      default:
        return status;
    }
  };

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
      addNotification({ title: '错误', message: '创建失败', type: 'error' });
      apiLogger.error('创建版本失败:', err);
    }
  };

  const handleDocumentChange = (value: string) => {
    setSelectedDocument(value);
    setFormData({ ...formData, document_id: value });
  };

  const filteredVersions = versions.filter(
    (v) => !selectedDocument || v.document_id === selectedDocument
  );

  const currentVersion = filteredVersions.find((v) => v.status === 'published');

  return (
    <Box sx={{ flex: 1 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 4,
        }}
      >
        <div>
          <Typography
            variant='h4'
            sx={{ fontWeight: 'bold', mb: 1 }}
          >
            版本管理
          </Typography>
          <Typography
            variant='body2'
            color='text.secondary'
          >
            管理文档和产品的版本历史与变更记录
          </Typography>
        </div>
        <Button
          variant='contained'
          startIcon={<Plus />}
          onClick={handleCreate}
          sx={{ bgcolor: 'primary.main' }}
        >
          创建新版本
        </Button>
      </Box>

      <Grid
        container
        spacing={3}
        sx={{ mb: 4 }}
      >
        <Grid size={{ xs: 12, lg: 4 }}>
          <Card>
            <CardHeader title='选择文档' />
            <CardContent>
              <FormControl fullWidth>
                <Select
                  value={selectedDocument}
                  onChange={(e) => handleDocumentChange(e.target.value)}
                  sx={{ minHeight: 48 }}
                  disabled={loading}
                >
                  {documents.map((doc) => (
                    <MenuItem
                      key={doc.id}
                      value={doc.id}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Tag size={16} />
                        <div>
                          <Typography
                            variant='body1'
                            sx={{ fontWeight: 500 }}
                          >
                            {doc.name}
                          </Typography>
                          <Typography
                            variant='caption'
                            color='text.secondary'
                          >
                            {doc.type} - 当前版本: {doc.current_version}
                          </Typography>
                        </div>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, lg: 4 }}>
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
                {loading ? <CircularProgress size={24} /> : `${filteredVersions.length} 个`}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, lg: 4 }}>
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
        </Grid>
      </Grid>

      <Card>
        <CardHeader title='版本历史' />
        <CardContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {filteredVersions.map((version) => (
                <Box
                  key={version.id}
                  sx={{
                    p: 3,
                    borderRadius: 1,
                    backgroundColor: version.status === 'published' ? 'success.50' : 'grey.50',
                    borderLeft:
                      version.status === 'published' ? '3px solid' : '3px solid transparent',
                    borderColor: version.status === 'published' ? 'success.main' : undefined,
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      mb: 2,
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                      }}
                    >
                      <GitBranch size={20} />
                      <Typography
                        variant='h6'
                        sx={{ fontWeight: 600 }}
                      >
                        {version.version_number}
                      </Typography>
                      <Chip
                        size='small'
                        label={getVersionTypeLabel(version.type)}
                        color={getVersionTypeColor(version.type)}
                      />
                      {version.status === 'published' && (
                        <Chip
                          size='small'
                          label='当前版本'
                          color='success'
                          icon={<Check size={14} />}
                        />
                      )}
                    </Box>
                    <Chip
                      size='small'
                      label={getStatusLabel(version.status)}
                      color={getStatusColor(version.status)}
                    />
                  </Box>
                  <Typography
                    variant='body1'
                    sx={{ fontWeight: 500, mb: 1 }}
                  >
                    {version.title}
                  </Typography>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                    sx={{ mb: 2 }}
                  >
                    {version.description}
                  </Typography>
                  <Box
                    sx={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 1,
                      mb: 2,
                    }}
                  >
                    {(version.changes || []).map((change, idx) => (
                      <Chip
                        key={idx}
                        size='small'
                        label={change}
                        variant='outlined'
                      />
                    ))}
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                      }}
                    >
                      <Clock size={14} />
                      <Typography variant='caption'>{version.created_at || '-'}</Typography>
                    </Box>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                      }}
                    >
                      <User size={14} />
                      <Typography variant='caption'>{version.created_by || '-'}</Typography>
                    </Box>
                  </Box>
                  {version.status !== 'published' && (
                    <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                      <Button size='small'>查看详情</Button>
                      <Button size='small'>对比差异</Button>
                    </Box>
                  )}
                </Box>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>

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
          <Button variant='contained' onClick={handleSave} sx={{ bgcolor: 'primary.main' }}>
            创建版本
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PdmVersionPage;