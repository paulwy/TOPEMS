import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  LinearProgress,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import { Grid } from '@/components/common';
import {
  FileText,
  FileType,
  Layers,
  Search,
  Sparkles,
  Upload,
} from 'lucide-react';

export interface DocumentInfo {
  document_id: string;
  name: string;
  document_type: string;
  file_size: number;
  content?: string;
  metadata?: {
    author?: string;
    page_count?: number;
    word_count?: number;
    language?: string;
    title?: string;
  };
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface DocumentSummary {
  document_id: string;
  summary_type: string;
  content: string;
  length: number;
  key_sentences: string[];
  keywords: Array<{ keyword: string; weight: number; frequency: number }>;
}

interface DocumentIntelligenceProps {
  document?: DocumentInfo;
  summary?: DocumentSummary;
  onUpload?: (file: File) => void;
  onGenerateSummary?: (type: string) => void;
  onParse?: () => void;
}

export const DocumentIntelligence: React.FC<DocumentIntelligenceProps> = ({
  document,
  summary,
  onUpload,
  onGenerateSummary,
  onParse,
}) => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const formatFileSize = (bytes: number): string => {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${bytes} B`;
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed': return '#2e7d32';
      case 'processing': return '#f57c00';
      case 'failed': return '#c62828';
      default: return '#757575';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0 && onUpload) {
      onUpload(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0 && onUpload) {
      onUpload(files[0]);
    }
  };

  const highlightText = (text: string, query: string): React.ReactNode => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <span key={i} style={{ backgroundColor: '#fff59d', fontWeight: 600 }}>
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  if (!document) {
    return (
      <Paper
        elevation={2}
        sx={{
          p: 4,
          textAlign: 'center',
          borderRadius: 2,
          border: 2,
          borderStyle: isDragging ? 'solid' : 'dashed',
          borderColor: isDragging ? theme.palette.primary.main : 'divider',
          bgcolor: isDragging ? `${theme.palette.primary.main}05` : 'background.paper',
          transition: 'all 0.2s ease',
        }}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <Upload size={48} style={{ color: theme.palette.primary.main, marginBottom: 16 }} />
        <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
          上传文档
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          拖拽文件到此处，或点击下方按钮选择文件
        </Typography>
        <Button variant="contained" component="label" startIcon={<Upload />}>
          选择文件
          <input type="file" hidden onChange={handleFileChange} accept=".pdf,.doc,.docx,.txt,.md,.xlsx,.xls" />
        </Button>
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 1, flexWrap: 'wrap' }}>
          {['PDF', 'Word', 'Excel', '文本', 'Markdown'].map((type) => (
            <Chip key={type} label={type} size="small" variant="outlined" />
          ))}
        </Box>
      </Paper>
    );
  }

  return (
    <Box>
      {/* 文档信息头部 */}
      <Paper elevation={2} sx={{ p: 2.5, mb: 2, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: `${theme.palette.primary.main}10` }}>
            <FileText size={28} style={{ color: theme.palette.primary.main }} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 200 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.25 }}>
              {document.name}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip label={document.document_type.toUpperCase()} size="small" variant="outlined" />
              <Chip label={formatFileSize(document.file_size)} size="small" variant="outlined" />
              {document.metadata?.page_count && (
                <Chip label={`${document.metadata.page_count} 页`} size="small" variant="outlined" />
              )}
              {document.metadata?.word_count && (
                <Chip label={`${document.metadata.word_count.toLocaleString()} 字`} size="small" variant="outlined" />
              )}
              <Chip
                label={document.processing_status}
                size="small"
                sx={{
                  bgcolor: getStatusColor(document.processing_status),
                  color: 'white',
                }}
              />
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {document.processing_status === 'pending' && onParse && (
              <Button variant="contained" size="small" startIcon={<FileType />} onClick={onParse}>
                解析文档
              </Button>
            )}
            {document.processing_status === 'completed' && onGenerateSummary && (
              <Button variant="outlined" size="small" startIcon={<Sparkles />} onClick={() => onGenerateSummary('standard')}>
                生成摘要
              </Button>
            )}
          </Box>
        </Box>

        {document.processing_status === 'processing' && (
          <Box sx={{ mt: 2 }}>
            <LinearProgress />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              正在解析文档...
            </Typography>
          </Box>
        )}
      </Paper>

      {/* 标签页 */}
      <Paper elevation={2} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', px: 1 }}>
          <Tab icon={<FileText size={16} />} iconPosition="start" label="原文" />
          <Tab icon={<Sparkles size={16} />} iconPosition="start" label="摘要" />
          <Tab icon={<Layers size={16} />} iconPosition="start" label="结构" />
          <Tab icon={<Search size={16} />} iconPosition="start" label="搜索" />
        </Tabs>

        <Box sx={{ p: 2.5 }}>
          {/* 原文 */}
          {activeTab === 0 && (
            <Box>
              {document.content ? (
                <Paper variant="outlined" sx={{ p: 2, maxHeight: 500, overflow: 'auto', borderRadius: 1 }}>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
                    {document.content}
                  </Typography>
                </Paper>
              ) : (
                <Alert severity="info">文档尚未解析，请先点击"解析文档"按钮。</Alert>
              )}
            </Box>
          )}

          {/* 摘要 */}
          {activeTab === 1 && (
            <Box>
              {summary ? (
                <Stack spacing={2}>
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Sparkles size={18} style={{ color: theme.palette.primary.main }} />
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        文档摘要
                      </Typography>
                      <Chip label={summary.summary_type} size="small" variant="outlined" sx={{ ml: 'auto' }} />
                    </Box>
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 1, bgcolor: `${theme.palette.primary.main}05` }}>
                      <Typography variant="body1" sx={{ lineHeight: 1.8 }}>
                        {summary.content}
                      </Typography>
                    </Paper>
                  </Box>

                  <Divider />

                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                      关键句子 ({summary.key_sentences.length})
                    </Typography>
                    <Stack spacing={1}>
                      {summary.key_sentences.map((sentence, i) => (
                        <Paper key={i} variant="outlined" sx={{ p: 1.5, borderRadius: 1, display: 'flex', gap: 1 }}>
                          <Chip label={`#${i + 1}`} size="small" color="primary" sx={{ flexShrink: 0 }} />
                          <Typography variant="body2">{sentence}</Typography>
                        </Paper>
                      ))}
                    </Stack>
                  </Box>

                  <Divider />

                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                      关键词 ({summary.keywords.length})
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {summary.keywords.map((kw, i) => (
                        <Chip
                          key={i}
                          label={`${kw.keyword} (${kw.frequency})`}
                          size="small"
                          sx={{
                            bgcolor: `${theme.palette.primary.main}${Math.round(kw.weight * 40).toString(16).padStart(2, '0')}`,
                            fontWeight: 500 + Math.round(kw.weight * 3),
                          }}
                        />
                      ))}
                    </Box>
                  </Box>
                </Stack>
              ) : (
                <Alert severity="info">尚未生成摘要，请点击"生成摘要"按钮。</Alert>
              )}
            </Box>
          )}

          {/* 结构 */}
          {activeTab === 2 && (
            <Box>
              {document.metadata ? (
                <Grid container spacing={2}>
                  <Grid xs={12} sm={6} md={4}>
                    <Card variant="outlined">
                      <CardContent sx={{ p: 2 }}>
                        <Typography variant="caption" color="text.secondary">标题</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {document.metadata.title || document.name}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid xs={12} sm={6} md={4}>
                    <Card variant="outlined">
                      <CardContent sx={{ p: 2 }}>
                        <Typography variant="caption" color="text.secondary">作者</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {document.metadata.author || '未知'}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid xs={12} sm={6} md={4}>
                    <Card variant="outlined">
                      <CardContent sx={{ p: 2 }}>
                        <Typography variant="caption" color="text.secondary">语言</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {document.metadata.language || '未知'}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid xs={12} sm={6} md={4}>
                    <Card variant="outlined">
                      <CardContent sx={{ p: 2 }}>
                        <Typography variant="caption" color="text.secondary">页数</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {document.metadata.page_count || '未知'}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid xs={12} sm={6} md={4}>
                    <Card variant="outlined">
                      <CardContent sx={{ p: 2 }}>
                        <Typography variant="caption" color="text.secondary">字数</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {document.metadata.word_count?.toLocaleString() || '未知'}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid xs={12} sm={6} md={4}>
                    <Card variant="outlined">
                      <CardContent sx={{ p: 2 }}>
                        <Typography variant="caption" color="text.secondary">文件大小</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {formatFileSize(document.file_size)}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              ) : (
                <Alert severity="info">文档元数据不可用。</Alert>
              )}
            </Box>
          )}

          {/* 搜索 */}
          {activeTab === 3 && (
            <Box>
              <TextField
                fullWidth
                size="small"
                placeholder="在文档中搜索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: <Search size={18} style={{ marginRight: 8, color: 'text.secondary' }} />,
                  },
                }}
                sx={{ mb: 2 }}
              />
              {document.content && searchQuery ? (
                <Box>
                  {document.content.split('\n').filter((line) => line.toLowerCase().includes(searchQuery.toLowerCase())).length > 0 ? (
                    <Stack spacing={1}>
                      {document.content.split('\n').filter((line) => line.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 20).map((line, i) => (
                        <Paper key={i} variant="outlined" sx={{ p: 1.5, borderRadius: 1 }}>
                          <Typography variant="body2">
                            {highlightText(line, searchQuery)}
                          </Typography>
                        </Paper>
                      ))}
                    </Stack>
                  ) : (
                    <Alert severity="info">未找到包含 "{searchQuery}" 的内容。</Alert>
                  )}
                </Box>
              ) : (
                <Alert severity="info">输入关键词在文档中搜索。</Alert>
              )}
            </Box>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default DocumentIntelligence;
