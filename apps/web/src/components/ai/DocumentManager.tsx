import {
  Card,
  CardContent,
  Box,
  Typography,
  Dialog,
  DialogContent,
  DialogTitle,
  TextField,
  Tabs,
  Tab,
  Chip,
  IconButton,
  Tooltip,
  Button,
} from '@mui/material';
import i18n from '@/i18n';
import { useState, useEffect, useRef } from 'react';
import {
  Upload,
  FileText,
  Trash2,
  Search,
  Plus,
  AlertCircle,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import type { Document } from '@/api/ai';
import { aiApi } from '@/api/ai';
import { useNotificationStore } from '@/store';
import { logger } from '@/utils/logger';

interface DocumentManagerProps {
  className?: string;
}

export const DocumentManager: React.FC<DocumentManagerProps> = ({ className }) => {
  const addNotification = useNotificationStore((state) => state.addNotification);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [stats, setStats] = useState<{
    total_documents: number;
    total_chunks: number;
    total_vectors: number;
    vector_dimension: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<
    {
      document_title?: string;
      similarity: number;
      content: string;
      chunk_id: string;
    }[]
  >([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadDocuments();
    loadStats();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const response = await aiApi.listDocuments();
      if (response.success && response.data) {
        setDocuments(response.data.items);
      }
    } catch (err: unknown) {
      logger.error(i18n.t('components.document_manager.k0'), err);
      addNotification({
        title: i18n.t('components.document_manager.k0'),
        message: i18n.t('components.document_manager.k1'),
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const mockStats = {
        total_documents: (documents || []).length,
        total_chunks: 0,
        total_vectors: 0,
        vector_dimension: 384,
      };
      setStats(mockStats);
    } catch (err: unknown) {
      logger.error(i18n.t('components.document_manager.k1'), err);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const response = await aiApi.createDocument({
        title: file.name,
        content: '',
        filename: file.name,
      });

      if (response.success) {
        addNotification({
          title: i18n.t('components.document_manager.k2'),
          message: `${i18n.t('components.document_manager.k2')}${file.name}${i18n.t('components.document_manager.k3')}`,
          type: 'success',
        });
        loadDocuments();
        loadStats();
        setUploadDialogOpen(false);
      } else {
        throw new Error(response.message);
      }
    } catch (err: unknown) {
      logger.error(i18n.t('components.document_manager.k4'), err);
      addNotification({
        title: i18n.t('components.document_manager.k3'),
        message: i18n.t('components.document_manager.k4'),
        type: 'error',
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (doc: Document) => {
    if (
      !confirm(
        `${i18n.t('components.document_manager.k5')}${doc.title}${i18n.t('components.document_manager.k6')}`
      )
    )
      return;

    try {
      const response = await aiApi.deleteDocument(doc.id);

      if (response.success) {
        addNotification({
          title: i18n.t('components.document_manager.k5'),
          message: i18n.t('components.document_manager.k7'),
          type: 'success',
        });
        loadDocuments();
        loadStats();
      } else {
        throw new Error(response.message);
      }
    } catch (err: unknown) {
      logger.error(i18n.t('components.document_manager.k8'), err);
      addNotification({
        title: i18n.t('components.document_manager.k6'),
        message: i18n.t('components.document_manager.k7'),
        type: 'error',
      });
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      setSearching(true);
      const response = await aiApi.search({
        query: searchQuery,
        limit: 10,
      });

      if (response.success && response.data) {
        const results = (response.data.documents || []).map((doc: Document, index: number) => ({
          document_title: doc.title,
          similarity: 0.8,
          content: doc.content.substring(0, 200),
          chunk_id: `${doc.id}-${index}`,
        }));
        setSearchResults(results);
      }
    } catch (err: unknown) {
      logger.error(i18n.t('components.document_manager.k9'), err);
      addNotification({
        title: i18n.t('components.document_manager.k8'),
        message: i18n.t('components.document_manager.k9'),
        type: 'error',
      });
    } finally {
      setSearching(false);
    }
  };

  const _getStatusIcon = (status: string) => {
    switch (status) {
      case 'processed':
        return <CheckCircle style={{ width: 16, height: 16, color: 'success.main' }} />;
      case 'pending':
        return (
          <Loader2
            style={{
              width: 16,
              height: 16,
              color: 'warning.main',
              animation: 'spin 1s linear infinite',
            }}
          />
        );
      case 'partial':
        return <AlertCircle style={{ width: 16, height: 16, color: 'warning.main' }} />;
      default:
        return <AlertCircle style={{ width: 16, height: 16, color: 'error.main' }} />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'processed':
        return i18n.t('components.document_manager.k10');
      case 'pending':
        return i18n.t('components.document_manager.k11');
      case 'partial':
        return i18n.t('components.document_manager.k12');
      case 'empty':
        return i18n.t('components.document_manager.k13');
      default:
        return i18n.t('components.document_manager.k14');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'processed':
        return { bg: 'success.light', text: 'success.dark' };
      case 'pending':
        return { bg: 'warning.lightest', text: 'warning.dark' };
      case 'partial':
        return { bg: 'warning.lightest', text: 'warning.dark' };
      default:
        return { bg: 'error.lightest', text: 'error.dark' };
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Box
      sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}
      className={className}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box>
          <Typography
            variant='h5'
            sx={{ fontWeight: 600 }}
          >
            {i18n.t('components.document_manager.k10')}
          </Typography>
          <Typography
            variant='body2'
            color='text.secondary'
            sx={{ mt: 0.5 }}
          >
            {i18n.t('components.document_manager.k11')}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Button
            onClick={loadDocuments}
            disabled={loading}
          >
            {i18n.t('components.document_manager.k12')}
          </Button>
          <Button onClick={() => setUploadDialogOpen(true)}>
            <Upload style={{ width: 16, height: 16, marginRight: 8 }} />
            {i18n.t('components.document_manager.k13')}
          </Button>
        </Box>
      </Box>

      {stats && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' },
            gap: 2,
          }}
        >
          <Card>
            <CardContent sx={{ p: 2 }}>
              <Typography
                variant='body2'
                color='text.secondary'
              >
                {i18n.t('components.document_manager.k14')}
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 600 }}
              >
                {stats.total_documents}
              </Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ p: 2 }}>
              <Typography
                variant='body2'
                color='text.secondary'
              >
                {i18n.t('components.document_manager.k15')}
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 600 }}
              >
                {stats.total_chunks}
              </Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ p: 2 }}>
              <Typography
                variant='body2'
                color='text.secondary'
              >
                {i18n.t('components.document_manager.k16')}
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 600 }}
              >
                {stats.total_vectors}
              </Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ p: 2 }}>
              <Typography
                variant='body2'
                color='text.secondary'
              >
                {i18n.t('components.document_manager.k17')}
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 600 }}
              >
                {stats.vector_dimension}
              </Typography>
            </CardContent>
          </Card>
        </Box>
      )}

      <Tabs
        value={tabValue}
        onChange={(_, v) => setTabValue(v)}
      >
        <Tab label={i18n.t('components.document_manager.k15')} />
        <Tab label={i18n.t('components.document_manager.k16')} />
      </Tabs>

      {tabValue === 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {loading ? (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                py: 6,
              }}
            >
              <Loader2
                style={{
                  width: 32,
                  height: 32,
                  animation: 'spin 1s linear infinite',
                }}
              />
            </Box>
          ) : (
            <>
              {(documents || []).map((doc) => (
                <Card key={doc.id}>
                  <CardContent sx={{ p: 2 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 2,
                        }}
                      >
                        <Box
                          sx={{
                            p: 1,
                            borderRadius: 1,
                            bgcolor: 'secondary.lightest',
                          }}
                        >
                          <FileText sx={{ width: 20, height: 20, color: 'secondary.main' }} />
                        </Box>
                        <Box>
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                            }}
                          >
                            <Typography
                              variant='body1'
                              sx={{ fontWeight: 500 }}
                            >
                              {doc.title}
                            </Typography>
                            <Chip
                              size='small'
                              label={getStatusText(doc.status || '')}
                              sx={{
                                backgroundColor: getStatusColor(doc.status || '').bg,
                                color: getStatusColor(doc.status || '').text,
                                fontSize: 12,
                              }}
                            />
                          </Box>
                          <Typography
                            variant='body2'
                            color='text.secondary'
                            sx={{ mt: 0.5 }}
                          >
                            {doc.filename} • {formatFileSize(doc.filesize)}
                          </Typography>
                          {doc.description && (
                            <Typography
                              variant='body2'
                              sx={{ mt: 0.5 }}
                            >
                              {doc.description}
                            </Typography>
                          )}
                          {doc.error_message && (
                            <Typography
                              variant='caption'
                              sx={{ color: 'error.main', mt: 0.5 }}
                            >
                              [i18n.t('components.document_manager.k18')]: {doc.error_message}
                            </Typography>
                          )}
                          <Typography
                            variant='caption'
                            color='text.secondary'
                            sx={{ mt: 1, display: 'block' }}
                          >
                            [i18n.t('components.document_manager.k19')]:{' '}
                            {formatDate(doc.created_at)}
                          </Typography>
                        </Box>
                      </Box>
                      <Tooltip title={i18n.t('components.document_manager.k17')}>
                        <IconButton
                          onClick={() => handleDelete(doc)}
                          sx={{
                            color: 'error.main',
                            '&:hover': {
                              backgroundColor: 'action.hover',
                            },
                          }}
                          aria-label={i18n.t('components.document_manager.k18')}
                        >
                          <Trash2 style={{ width: 18, height: 18 }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </CardContent>
                </Card>
              ))}

              {(documents || []).length === 0 && (
                <Card>
                  <CardContent sx={{ p: 4, textAlign: 'center' }}>
                    <FileText
                      sx={{
                        width: 48,
                        height: 48,
                        color: 'action.disabled',
                        margin: '0 auto 16px',
                      }}
                    />
                    <Typography
                      variant='h6'
                      sx={{ mb: 1 }}
                    >
                      {i18n.t('components.document_manager.k20')}
                    </Typography>
                    <Typography
                      variant='body2'
                      color='text.secondary'
                      sx={{ mb: 2 }}
                    >
                      {i18n.t('components.document_manager.k21')}
                    </Typography>
                    <Button onClick={() => fileInputRef.current?.click()}>
                      <Plus style={{ width: 16, height: 16, marginRight: 8 }} />
                      {i18n.t('components.document_manager.k22')}
                    </Button>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </Box>
      )}

      {tabValue === 1 && (
        <Card>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
              <TextField
                fullWidth
                size='small'
                placeholder={i18n.t('components.document_manager.k23')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button
                onClick={handleSearch}
                disabled={searching}
                variant='contained'
              >
                {searching ? (
                  <Loader2
                    style={{
                      width: 16,
                      height: 16,
                      animation: 'spin 1s linear infinite',
                    }}
                  />
                ) : (
                  <Search style={{ width: 16, height: 16 }} />
                )}
              </Button>
            </Box>

            {searchResults.length > 0 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Typography
                  variant='body1'
                  sx={{ fontWeight: 500 }}
                >
                  {i18n.t('components.document_manager.k0')}
                  {searchResults.length})
                </Typography>
                {searchResults.map((result, index) => (
                  <Card
                    key={`${result.chunk_id}-${index}`}
                    variant='outlined'
                  >
                    <CardContent sx={{ p: 2 }}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          mb: 1,
                        }}
                      >
                        <Box>
                          <Typography
                            variant='body2'
                            sx={{ fontWeight: 500 }}
                          >
                            {result.document_title || i18n.t('components.document_manager.k19')}
                          </Typography>
                          <Chip
                            size='small'
                            variant='outlined'
                            label={`${i18n.t('components.document_manager.k24')} ${(result.similarity * 100).toFixed(1)}%`}
                            sx={{ mt: 0.5, fontSize: 12 }}
                          />
                        </Box>
                      </Box>
                      <Typography
                        variant='body2'
                        sx={{ whiteSpace: 'pre-wrap', color: 'text.secondary' }}
                      >
                        {result.content}
                      </Typography>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}

            {searchQuery && searchResults.length === 0 && !searching && (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Search
                  sx={{
                    width: 48,
                    height: 48,
                    color: 'action.disabled',
                    margin: '0 auto 16px',
                  }}
                />
                <Typography
                  variant='body1'
                  color='text.secondary'
                >
                  {i18n.t('components.document_manager.k25')}
                </Typography>
              </Box>
            )}

            {!searchQuery && (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Search
                  sx={{
                    width: 48,
                    height: 48,
                    color: 'action.disabled',
                    margin: '0 auto 16px',
                  }}
                />
                <Typography
                  variant='body1'
                  color='text.secondary'
                >
                  {i18n.t('components.document_manager.k26')}
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog
        open={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>{i18n.t('components.document_manager.k20')}</DialogTitle>
        <DialogContent>
          <Typography
            variant='body2'
            color='text.secondary'
            sx={{ mb: 2 }}
          >
            {i18n.t('components.document_manager.k27')}
          </Typography>
          <Box
            sx={{
              border: '2px dashed',
              borderColor: 'divider',
              borderRadius: 1,
              p: 4,
              textAlign: 'center',
            }}
          >
            <input
              ref={fileInputRef}
              type='file'
              accept='.txt,.md,.pdf,.json,.csv'
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              id='file-upload'
            />
            <label
              htmlFor='file-upload'
              style={{ cursor: 'pointer' }}
            >
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                <Upload
                  sx={{
                    width: 48,
                    height: 48,
                    color: 'action.disabled',
                    mb: 1.5,
                  }}
                />
                <Typography
                  variant='body2'
                  sx={{ color: 'text.secondary' }}
                >
                  {uploading
                    ? i18n.t('components.document_manager.k28')
                    : i18n.t('components.document_manager.k21')}
                </Typography>
                <Typography
                  variant='caption'
                  color='text.secondary'
                  sx={{ mt: 1 }}
                >
                  {i18n.t('components.document_manager.k29')}
                </Typography>
              </Box>
            </label>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
};
