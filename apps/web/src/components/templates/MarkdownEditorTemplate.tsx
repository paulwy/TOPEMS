import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { BoxProps } from '@mui/material';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Divider,
  Chip,
  Snackbar,
  Alert as MuiAlert,
  useTheme,
} from '@mui/material';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List as ListIcon,
  ListOrdered,
  Quote,
  Code,
  CodeSquare,
  Link,
  Image,
  Table,
  Minus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Save,
  Download,
  History,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Copy,
  Check,
  AlertCircle,
  FileText,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { BreadcrumbItem } from './PageHeader';
import { PageHeader } from './PageHeader';
import { logger } from '@/utils/logger';

export interface MarkdownVersion {
  id: string;
  content: string;
  timestamp: number;
  user?: string;
  comment?: string;
}

export interface MarkdownEditorToolbarAction {
  id: string;
  icon?: React.ReactNode;
  label?: string;
  shortcut?: string;
  action?: (editor: React.RefObject<HTMLTextAreaElement | null>) => void;
  divider?: boolean;
}

export interface MarkdownEditorTemplateProps extends Omit<BoxProps, 'onChange'> {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  autoBreadcrumbs?: boolean;

  defaultValue?: string;
  onChange?: (content: string) => void;

  loading?: boolean;
  error?: string;
  success?: string;

  onSave?: (content: string) => Promise<void> | void;
  onExport?: (format: 'md' | 'html' | 'txt') => void;
  onCancel?: () => void;

  enableVersionHistory?: boolean;
  versions?: MarkdownVersion[];
  onSaveVersion?: (content: string, comment?: string) => Promise<void> | void;

  enableFileUpload?: boolean;
  enableImageUpload?: boolean;
  uploadConfig?: {
    accept?: string[];
    maxSize?: number;
    maxCount?: number;
  };

  toolbarActions?: MarkdownEditorToolbarAction[];

  readOnly?: boolean;
  showPreviewByDefault?: boolean;
  enableWordCount?: boolean;

  headerContent?: React.ReactNode;
  footerContent?: React.ReactNode;
}

const defaultToolbarActions: MarkdownEditorToolbarAction[] = [
  {
    id: 'bold',
    icon: <Bold size={18} />,
    label: '粗体',
    shortcut: 'Ctrl+B',
    action: wrapSelection('**', '**'),
  },
  {
    id: 'italic',
    icon: <Italic size={18} />,
    label: '斜体',
    shortcut: 'Ctrl+I',
    action: wrapSelection('*', '*'),
  },
  {
    id: 'underline',
    icon: <Underline size={18} />,
    label: '下划线',
    action: wrapSelection('<u>', '</u>'),
  },
  {
    id: 'strikethrough',
    icon: <Strikethrough size={18} />,
    label: '删除线',
    action: wrapSelection('~~', '~~'),
  },
  { id: 'divider1', divider: true },
  { id: 'h1', icon: <Heading1 size={18} />, label: '一级标题', action: prependLine('# ') },
  { id: 'h2', icon: <Heading2 size={18} />, label: '二级标题', action: prependLine('## ') },
  { id: 'h3', icon: <Heading3 size={18} />, label: '三级标题', action: prependLine('### ') },
  { id: 'divider2', divider: true },
  { id: 'ul', icon: <ListIcon size={18} />, label: '无序列表', action: prependLine('- ') },
  { id: 'ol', icon: <ListOrdered size={18} />, label: '有序列表', action: prependLine('1. ') },
  { id: 'quote', icon: <Quote size={18} />, label: '引用', action: prependLine('> ') },
  { id: 'divider3', divider: true },
  { id: 'code', icon: <Code size={18} />, label: '行内代码', action: wrapSelection('`', '`') },
  { id: 'codeblock', icon: <CodeSquare size={18} />, label: '代码块', action: insertCodeBlock },
  { id: 'table', icon: <Table size={18} />, label: '表格', action: insertTable },
  { id: 'divider4', divider: true },
  { id: 'link', icon: <Link size={18} />, label: '链接', action: insertLink },
  { id: 'image', icon: <Image size={18} />, label: '图片', action: insertImage },
  { id: 'divider5', divider: true },
  { id: 'hr', icon: <Minus size={18} />, label: '分隔线', action: insertHorizontalRule },
];

function wrapSelection(prefix: string, suffix: string) {
  return (editor: React.RefObject<HTMLTextAreaElement | null>) => {
    const textarea = editor.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    const before = textarea.value.substring(0, start);
    const after = textarea.value.substring(end);

    textarea.value = before + prefix + selectedText + suffix + after;
    textarea.focus();

    if (selectedText) {
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    } else {
      textarea.setSelectionRange(start + prefix.length, start + prefix.length);
    }

    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  };
}

function prependLine(prefix: string) {
  return (editor: React.RefObject<HTMLTextAreaElement | null>) => {
    const textarea = editor.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const value = textarea.value;
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const before = value.substring(0, lineStart);
    const after = value.substring(lineStart);

    textarea.value = before + prefix + after;
    textarea.focus();
    textarea.setSelectionRange(start + prefix.length, start + prefix.length);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  };
}

function insertCodeBlock(editor: React.RefObject<HTMLTextAreaElement | null>) {
  const textarea = editor.current;
  if (!textarea) return;

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selectedText = textarea.value.substring(start, end);
  const before = textarea.value.substring(0, start);
  const after = textarea.value.substring(end);
  const codeBlock = `\n\`\`\`\n${selectedText || 'code'}\n\`\`\`\n`;

  textarea.value = before + codeBlock + after;
  textarea.focus();
  textarea.setSelectionRange(start + 5, end + 5);
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
}

function insertTable(editor: React.RefObject<HTMLTextAreaElement | null>) {
  const textarea = editor.current;
  if (!textarea) return;

  const start = textarea.selectionStart;
  const before = textarea.value.substring(0, start);
  const after = textarea.value.substring(start);
  const table = `\n| 列1 | 列2 | 列3 |\n| --- | --- | --- |\n| 内容1 | 内容2 | 内容3 |\n`;

  textarea.value = before + table + after;
  textarea.focus();
  textarea.setSelectionRange(start + table.length, start + table.length);
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
}

function insertLink(editor: React.RefObject<HTMLTextAreaElement | null>) {
  const textarea = editor.current;
  if (!textarea) return;

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selectedText = textarea.value.substring(start, end);
  const before = textarea.value.substring(0, start);
  const after = textarea.value.substring(end);
  const link = `[${selectedText || '链接文本'}](https://)`;

  textarea.value = before + link + after;
  textarea.focus();
  textarea.setSelectionRange(start + 1, start + (selectedText || '链接文本').length + 1);
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
}

function insertImage(editor: React.RefObject<HTMLTextAreaElement | null>) {
  const textarea = editor.current;
  if (!textarea) return;

  const start = textarea.selectionStart;
  const before = textarea.value.substring(0, start);
  const after = textarea.value.substring(start);
  const image = `![图片描述](https://)`;

  textarea.value = before + image + after;
  textarea.focus();
  textarea.setSelectionRange(start + 2, start + 6);
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
}

function insertHorizontalRule(editor: React.RefObject<HTMLTextAreaElement | null>) {
  const textarea = editor.current;
  if (!textarea) return;

  const start = textarea.selectionStart;
  const before = textarea.value.substring(0, start);
  const after = textarea.value.substring(start);
  const hr = '\n---\n';

  textarea.value = before + hr + after;
  textarea.focus();
  textarea.setSelectionRange(start + hr.length, start + hr.length);
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
}

export const MarkdownEditorTemplate: React.FC<MarkdownEditorTemplateProps> = ({
  title,
  subtitle,
  breadcrumbs,
  autoBreadcrumbs = true,
  defaultValue = '',
  onChange,
  loading,
  error,
  success,
  onSave,
  onExport,
  onCancel,
  enableVersionHistory = false,
  versions = [],
  onSaveVersion,
  enableFileUpload = true,
  enableImageUpload = true,
  uploadConfig = {},
  toolbarActions = defaultToolbarActions,
  readOnly = false,
  showPreviewByDefault = false,
  enableWordCount = true,
  headerContent,
  footerContent,
  ...props
}) => {
  const theme = useTheme();
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const [content, setContent] = useState(defaultValue);
  const [tabValue, setTabValue] = useState(showPreviewByDefault ? 1 : 0);
  const [showHistory, setShowHistory] = useState(false);
  const [copied, setCopied] = useState(false);
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);
  const [historyFilter, setHistoryFilter] = useState('');
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [imageAlt, setImageAlt] = useState('');

  useEffect(() => {
    if (defaultValue !== content) {
      setContent(defaultValue);
    }
  }, [defaultValue]);

  useEffect(() => {
    onChange?.(content);
  }, [content, onChange]);

  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
  }, []);

  const handleToolbarAction = useCallback(
    (action: ((editor: React.RefObject<HTMLTextAreaElement | null>) => void) | undefined) => {
      if (action) {
        action(editorRef);
      }
    },
    []
  );

  const handleSave = useCallback(async () => {
    try {
      await onSave?.(content);
      setNotification({ message: '保存成功', type: 'success' });
    } catch (err) {
      logger.error('Save error:', err);
      setNotification({ message: '保存失败', type: 'error' });
    }
  }, [content, onSave]);

  const handleExport = useCallback(
    (format: 'md' | 'html' | 'txt') => {
      let exportContent = content;
      let filename = 'document';
      let mimeType = 'text/plain';

      switch (format) {
        case 'md':
          filename += '.md';
          mimeType = 'text/markdown';
          break;
        case 'html':
          filename += '.html';
          mimeType = 'text/html';
          exportContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; }
    pre { background: #1e1e1e; color: #d4d4d4; padding: 1rem; border-radius: 8px; overflow-x: auto; }
    code { background: #f3f3f3; padding: 0.2rem 0.4rem; border-radius: 4px; }
    pre code { background: none; padding: 0; }
    blockquote { border-left: 4px solid #ddd; margin: 0; padding-left: 1rem; color: #666; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 0.5rem; text-align: left; }
    th { background: #f5f5f5; }
  </style>
</head>
<body>
${content
  .replace(/\n/g, '<br>')
  .replace(/^### (.*$)/gim, '<h3>$1</h3>')
  .replace(/^## (.*$)/gim, '<h2>$1</h2>')
  .replace(/^# (.*$)/gim, '<h1>$1</h1>')
  .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  .replace(/\*(.*?)\*/g, '<em>$1</em>')
  .replace(/`(.*?)`/g, '<code>$1</code>')
  .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')}
</body>
</html>`;
          break;
        case 'txt':
          filename += '.txt';
          break;
      }

      const blob = new Blob([exportContent], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      onExport?.(format);
      setNotification({ message: `已导出为 ${filename}`, type: 'success' });
    },
    [content, onExport]
  );

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [content]);

  const handleRestoreVersion = useCallback((version: MarkdownVersion) => {
    setContent(version.content);
    setShowHistory(false);
    setNotification({ message: '已恢复历史版本', type: 'success' });
  }, []);

  const handleSaveVersion = useCallback(async () => {
    try {
      await onSaveVersion?.(content);
      setNotification({ message: '版本已保存', type: 'success' });
    } catch (err) {
      logger.error('Save version error:', err);
      setNotification({ message: '保存版本失败', type: 'error' });
    }
  }, [content, onSaveVersion]);

  const handleImageInsert = useCallback(() => {
    if (!imageUrl.trim()) return;

    const imgMarkdown = `![${imageAlt || '图片'}](${imageUrl})`;
    const textarea = editorRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const before = content.substring(0, start);
      const after = content.substring(start);
      setContent(before + imgMarkdown + after);
    } else {
      setContent(content + imgMarkdown);
    }

    setImageDialogOpen(false);
    setImageUrl('');
    setImageAlt('');
    setNotification({ message: '图片已插入', type: 'success' });
  }, [imageUrl, imageAlt, content]);

  const wordCount = content.replace(/\s/g, '').length;
  const charCount = content.length;

  const filteredVersions = versions.filter(
    (v) =>
      v.comment?.toLowerCase().includes(historyFilter.toLowerCase()) ||
      new Date(v.timestamp).toLocaleString().includes(historyFilter)
  );

  return (
    <Box {...props}>
      <PageHeader
        title={title}
        subtitle={subtitle}
        breadcrumbs={breadcrumbs}
        autoBreadcrumbs={autoBreadcrumbs}
        loading={loading}
      >
        {headerContent}
      </PageHeader>

      {error && (
        <MuiAlert
          severity='error'
          sx={{ mb: 3 }}
          icon={<AlertCircle size={20} />}
        >
          {error}
        </MuiAlert>
      )}

      {success && (
        <MuiAlert
          severity='success'
          sx={{ mb: 3 }}
        >
          {success}
        </MuiAlert>
      )}

      <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Box
          sx={{
            p: 2,
            borderBottom: 1,
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Tabs
            value={tabValue}
            onChange={(_, v) => setTabValue(v)}
            sx={{ flex: 1 }}
          >
            <Tab
              label='编辑'
              icon={<FileText size={16} />}
              iconPosition='start'
              disabled={readOnly}
            />
            <Tab
              label='预览'
              icon={<Eye size={16} />}
              iconPosition='start'
            />
          </Tabs>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {enableWordCount && (
              <Chip
                size='small'
                label={`${wordCount} 字 / ${charCount} 字符`}
                color='primary'
                variant='outlined'
              />
            )}

            {enableVersionHistory && (
              <Tooltip title='版本历史'>
                <IconButton
                  onClick={() => setShowHistory(true)}
                  size='small'
                >
                  <History size={18} />
                </IconButton>
              </Tooltip>
            )}

            <Tooltip title={copied ? '已复制' : '复制内容'}>
              <IconButton
                onClick={handleCopy}
                size='small'
              >
                {copied ? <Check size={18} /> : <Copy size={18} />}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {!readOnly && (
          <Box
            sx={{
              p: 1,
              borderBottom: 1,
              borderColor: 'divider',
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              flexWrap: 'wrap',
              backgroundColor: theme.palette.grey[50],
            }}
          >
            {toolbarActions.map((action) => {
              if (action.divider) {
                return (
                  <Divider
                    key={action.id}
                    orientation='vertical'
                    sx={{ mx: 0.5 }}
                  />
                );
              }
              return (
                <Tooltip
                  key={action.id}
                  title={`${action.label}${action.shortcut ? ` (${action.shortcut})` : ''}`}
                >
                  <IconButton
                    size='small'
                    onClick={() => handleToolbarAction(action.action)}
                    color={tabValue === 0 ? 'inherit' : 'inherit'}
                    disabled={tabValue !== 0}
                  >
                    {action.icon}
                  </IconButton>
                </Tooltip>
              );
            })}

            {enableImageUpload && (
              <>
                <Divider
                  orientation='vertical'
                  sx={{ mx: 0.5 }}
                />
                <Tooltip title='插入图片'>
                  <IconButton
                    size='small'
                    onClick={() => setImageDialogOpen(true)}
                  >
                    <Plus size={18} />
                    <Image size={18} />
                  </IconButton>
                </Tooltip>
              </>
            )}
          </Box>
        )}

        <Box sx={{ minHeight: 500, display: 'flex' }}>
          {tabValue === 0 && (
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <textarea
                ref={editorRef}
                value={content}
                onChange={handleContentChange}
                disabled={readOnly}
                placeholder='开始编写 Markdown...'
                style={{
                  flex: 1,
                  width: '100%',
                  padding: '16px',
                  border: 'none',
                  outline: 'none',
                  resize: 'none',
                  fontFamily: 'monospace',
                  fontSize: '14px',
                  lineHeight: '1.6',
                  backgroundColor: 'transparent',
                  color: theme.palette.text.primary,
                }}
              />
            </Box>
          )}

          {(tabValue === 1 || readOnly) && (
            <Box sx={{ flex: 1, p: 4, overflow: 'auto', backgroundColor: theme.palette.grey[50] }}>
              {content.trim() === '' ? (
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    color: theme.palette.text.secondary,
                  }}
                >
                  <FileText
                    size={48}
                    sx={{ mb: 2, opacity: 0.5 }}
                  />
                  <Typography variant='body1'>暂无内容</Typography>
                  <Typography variant='body2'>在编辑模式下开始编写 Markdown</Typography>
                </Box>
              ) : (
                <div
                  style={{
                    maxWidth: '100%',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  }}
                >
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      code({ node, className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || '');
                        const isInline = (props as any).inline;
                        return !isInline && match ? (
                          <SyntaxHighlighter
                            style={vscDarkPlus as { [key: string]: React.CSSProperties }}
                            language={match[1]}
                            PreTag='div'
                          >
                            {String(children).replace(/\n$/, '')}
                          </SyntaxHighlighter>
                        ) : (
                          <code
                            className={className}
                            style={{
                              backgroundColor: '#f3f3f3',
                              padding: '0.2rem 0.4rem',
                              borderRadius: '4px',
                              fontFamily: 'monospace',
                            }}
                            {...props}
                          >
                            {children}
                          </code>
                        );
                      },
                      table: ({ children }) => (
                        <div style={{ overflowX: 'auto', margin: '1rem 0' }}>
                          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                            {children}
                          </table>
                        </div>
                      ),
                      th: ({ children }) => (
                        <th
                          style={{
                            border: '1px solid #ddd',
                            padding: '0.5rem',
                            textAlign: 'left',
                            backgroundColor: '#f5f5f5',
                            fontWeight: 600,
                          }}
                        >
                          {children}
                        </th>
                      ),
                      td: ({ children }) => (
                        <td
                          style={{ border: '1px solid #ddd', padding: '0.5rem', textAlign: 'left' }}
                        >
                          {children}
                        </td>
                      ),
                      blockquote: ({ children }) => (
                        <blockquote
                          style={{
                            borderLeft: '4px solid #ddd',
                            margin: '1rem 0',
                            paddingLeft: '1rem',
                            color: '#666',
                            fontStyle: 'italic',
                          }}
                        >
                          {children}
                        </blockquote>
                      ),
                      h1: ({ children }) => (
                        <h1
                          style={{
                            fontSize: '2rem',
                            fontWeight: 700,
                            margin: '1.5rem 0 1rem',
                            borderBottom: '2px solid #eee',
                            paddingBottom: '0.5rem',
                          }}
                        >
                          {children}
                        </h1>
                      ),
                      h2: ({ children }) => (
                        <h2
                          style={{
                            fontSize: '1.5rem',
                            fontWeight: 600,
                            margin: '1.25rem 0 0.75rem',
                            borderBottom: '1px solid #eee',
                            paddingBottom: '0.25rem',
                          }}
                        >
                          {children}
                        </h2>
                      ),
                      h3: ({ children }) => (
                        <h3
                          style={{ fontSize: '1.25rem', fontWeight: 600, margin: '1rem 0 0.5rem' }}
                        >
                          {children}
                        </h3>
                      ),
                      ul: ({ children }) => (
                        <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem' }}>{children}</ul>
                      ),
                      ol: ({ children }) => (
                        <ol style={{ margin: '0.5rem 0', paddingLeft: '1.5rem' }}>{children}</ol>
                      ),
                      li: ({ children }) => <li style={{ margin: '0.25rem 0' }}>{children}</li>,
                      p: ({ children }) => (
                        <p style={{ margin: '0.75rem 0', lineHeight: '1.8' }}>{children}</p>
                      ),
                      a: ({ href, children }) => (
                        <a
                          href={href}
                          style={{ color: theme.palette.primary.main, textDecoration: 'none' }}
                        >
                          {children}
                        </a>
                      ),
                      hr: () => (
                        <hr
                          style={{ border: 'none', borderTop: '1px solid #ddd', margin: '2rem 0' }}
                        />
                      ),
                      strong: ({ children }) => (
                        <strong style={{ fontWeight: 600 }}>{children}</strong>
                      ),
                      em: ({ children }) => <em style={{ fontStyle: 'italic' }}>{children}</em>,
                    }}
                  >
                    {content}
                  </ReactMarkdown>
                </div>
              )}
            </Box>
          )}
        </Box>

        <Box
          sx={{
            p: 2,
            borderTop: 1,
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography
              variant='caption'
              color='text.secondary'
            >
              {tabValue === 0 ? '编辑模式' : '预览模式'}
              {readOnly && ' (只读)'}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {!readOnly && onCancel && (
              <Button
                variant='outlined'
                onClick={onCancel}
              >
                取消
              </Button>
            )}

            {onExport && (
              <Button
                variant='outlined'
                onClick={() => handleExport('md')}
                startIcon={<Download size={16} />}
              >
                导出 MD
              </Button>
            )}

            {enableVersionHistory && !readOnly && (
              <Button
                variant='outlined'
                onClick={handleSaveVersion}
                startIcon={<History size={16} />}
              >
                保存版本
              </Button>
            )}

            {onSave && !readOnly && (
              <Button
                variant='contained'
                onClick={handleSave}
                startIcon={<Save size={16} />}
              >
                保存
              </Button>
            )}
          </Box>
        </Box>
      </Paper>

      {footerContent}

      <Dialog
        open={showHistory}
        onClose={() => setShowHistory(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>版本历史</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            size='small'
            placeholder='搜索版本...'
            value={historyFilter}
            onChange={(e) => setHistoryFilter(e.target.value)}
            sx={{ mb: 2 }}
          />

          {filteredVersions.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <History
                size={48}
                sx={{ color: theme.palette.grey[300], marginBottom: 2 }}
              />
              <Typography
                variant='body1'
                color='text.secondary'
              >
                暂无版本历史
              </Typography>
            </Box>
          ) : (
            <List sx={{ maxHeight: 400, overflow: 'auto' }}>
              {filteredVersions.map((version) => (
                <ListItem
                  key={version.id}
                  disablePadding
                >
                  <ListItemButton onClick={() => handleRestoreVersion(version)}>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Typography variant='body1'>
                            {new Date(version.timestamp).toLocaleString('zh-CN')}
                          </Typography>
                          {version.user && (
                            <Chip
                              size='small'
                              label={version.user}
                              variant='outlined'
                            />
                          )}
                        </Box>
                      }
                      secondary={version.comment || '无备注'}
                    />
                    <IconButton size='small'>
                      <Eye size={16} />
                    </IconButton>
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowHistory(false)}>关闭</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={imageDialogOpen}
        onClose={() => setImageDialogOpen(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>插入图片</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label='图片 URL'
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder='https://example.com/image.jpg'
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label='图片描述'
            value={imageAlt}
            onChange={(e) => setImageAlt(e.target.value)}
            placeholder='图片描述（可选）'
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImageDialogOpen(false)}>取消</Button>
          <Button
            variant='contained'
            onClick={handleImageInsert}
          >
            插入
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!notification}
        autoHideDuration={3000}
        onClose={() => setNotification(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <MuiAlert
          severity={notification?.type || 'info'}
          onClose={() => setNotification(null)}
        >
          {notification?.message}
        </MuiAlert>
      </Snackbar>
    </Box>
  );
};

export default MarkdownEditorTemplate;
