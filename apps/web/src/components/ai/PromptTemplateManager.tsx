/**
 * 提示词模板管理组件
 *
 * @module components/ai
 */

import React, { useState, useCallback } from 'react';
import {
  Plus,
  Edit3,
  Trash2,
  Copy,
  PlayCircle,
  Star,
  Search,
  X,
  Save,
  Tag,
  FileText,
  Code2,
  MessageSquare,
  BarChart3,
  Lightbulb,
} from 'lucide-react';
import type { Theme } from '@mui/material';
import {
  Box,
  Typography,
  Button,
  Paper,
  Card,
  CardContent,
  Chip,
  IconButton,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Avatar,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  useTheme,
} from '@mui/material';

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  content: string;
  variables: string[];
  usage_count: number;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
}

type PromptCategory = 'all' | 'writing' | 'code' | 'business' | 'analysis' | 'creative';

interface PromptTemplateManagerProps {
  prompts: PromptTemplate[];
  onToggleFavorite: (id: string) => void;
  onDeletePrompt: (id: string) => void;
  onCopyPrompt: (content: string) => void;
  onUsePrompt: (prompt: PromptTemplate) => void;
  onAddPrompt: (
    prompt: Omit<
      PromptTemplate,
      'id' | 'usage_count' | 'is_favorite' | 'created_at' | 'updated_at' | 'created_by'
    >
  ) => void;
  onUpdatePrompt: (id: string, prompt: Partial<PromptTemplate>) => void;
}

const categories = [
  { id: 'all', label: '全部', icon: <Tag size={18} /> },
  { id: 'writing', label: '写作', icon: <FileText size={18} /> },
  { id: 'code', label: '编程', icon: <Code2 size={18} /> },
  { id: 'business', label: '商务', icon: <MessageSquare size={18} /> },
  { id: 'analysis', label: '分析', icon: <BarChart3 size={18} /> },
  { id: 'creative', label: '创意', icon: <Lightbulb size={18} /> },
];

const getCategoryIcon = (category: string) => {
  const map: Record<string, React.ReactNode> = {
    writing: <FileText size={20} />,
    code: <Code2 size={20} />,
    business: <MessageSquare size={20} />,
    analysis: <BarChart3 size={20} />,
    creative: <Lightbulb size={20} />,
  };
  return map[category] || <Tag size={20} />;
};

const getCategoryColor = (theme: Theme, category: string) => {
  const map: Record<string, string> = {
    writing: theme.palette.primary.main,
    code: theme.palette.secondary.main,
    business: theme.palette.success.main,
    analysis: theme.palette.warning.main,
    creative: theme.palette.secondary.main,
  };
  return map[category] || theme.palette.grey[500];
};

export const PromptTemplateManager: React.FC<PromptTemplateManagerProps> = ({
  prompts,
  onToggleFavorite,
  onDeletePrompt,
  onCopyPrompt,
  onUsePrompt,
  onAddPrompt,
  onUpdatePrompt,
}) => {
  const theme = useTheme();
  const [activeCategory, setActiveCategory] = useState<PromptCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<PromptTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'writing',
    content: '',
    variables: '',
  });
  const [viewTab, setViewTab] = useState<'all' | 'mine'>('all');

  const filteredPrompts = prompts.filter((p) => {
    const matchCategory = activeCategory === 'all' || p.category === activeCategory;
    const matchSearch =
      !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchFavorite = !showFavoritesOnly || p.is_favorite;
    return matchCategory && matchSearch && matchFavorite;
  });

  const handleOpenEditDialog = useCallback((prompt?: PromptTemplate) => {
    if (prompt) {
      setEditingPrompt(prompt);
      setFormData({
        name: prompt.name,
        description: prompt.description,
        category: prompt.category,
        content: prompt.content,
        variables: prompt.variables.join('\n'),
      });
    } else {
      setEditingPrompt(null);
      setFormData({
        name: '',
        description: '',
        category: 'writing',
        content: '',
        variables: '',
      });
    }
    setEditDialogOpen(true);
  }, []);

  const handleCloseEditDialog = useCallback(() => {
    setEditDialogOpen(false);
    setEditingPrompt(null);
    setFormData({
      name: '',
      description: '',
      category: 'writing',
      content: '',
      variables: '',
    });
  }, []);

  const handleSave = useCallback(() => {
    const variables = formData.variables
      .split('\n')
      .map((v) => v.trim())
      .filter((v) => v);

    if (!formData.name || !formData.content) return;

    if (editingPrompt) {
      onUpdatePrompt(editingPrompt.id, {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        content: formData.content,
        variables,
      });
    } else {
      onAddPrompt({
        name: formData.name,
        description: formData.description,
        category: formData.category,
        content: formData.content,
        variables,
      });
    }

    handleCloseEditDialog();
  }, [formData, editingPrompt, onAddPrompt, onUpdatePrompt, handleCloseEditDialog]);

  return (
    <>
      <Box sx={{ p: 3 }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            gap: 3,
          }}
        >
          {/* 左侧分类 */}
          <Box sx={{ width: { xs: '100%', md: 200 }, flexShrink: 0 }}>
            <Paper sx={{ p: 2, borderRadius: 3 }}>
              <Box sx={{ mb: 2 }}>
                <Typography
                  variant='subtitle2'
                  sx={{ fontWeight: 600, mb: 1, color: 'text.secondary' }}
                >
                  分类
                </Typography>
                <List
                  disablePadding
                  dense
                >
                  {categories.map((cat) => (
                    <ListItem
                      key={cat.id}
                      sx={{
                        borderRadius: 1,
                        mb: 0.5,
                        cursor: 'pointer',
                        bgcolor: activeCategory === cat.id ? 'primary.50' : 'transparent',
                        '&:hover': { bgcolor: 'grey.50' },
                      }}
                      onClick={() => setActiveCategory(cat.id as PromptCategory)}
                    >
                      <ListItemIcon sx={{ minWidth: 36 }}>{cat.icon}</ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography
                            variant='body2'
                            sx={{
                              fontWeight: activeCategory === cat.id ? 600 : 400,
                              color: activeCategory === cat.id ? 'primary.main' : 'inherit',
                            }}
                          >
                            {cat.label}
                          </Typography>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Box>
                <Chip
                  icon={<Star size={14} />}
                  label='仅显示收藏'
                  variant={showFavoritesOnly ? 'filled' : 'outlined'}
                  color={showFavoritesOnly ? 'warning' : 'default'}
                  onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                  sx={{ width: '100%', justifyContent: 'flex-start' }}
                />
              </Box>
            </Paper>
          </Box>

          {/* 右侧模板列表 */}
          <Box sx={{ flex: 1 }}>
            <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
              <Box
                sx={{
                  p: 2,
                  borderBottom: 1,
                  borderColor: 'divider',
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <Tabs
                  value={viewTab}
                  onChange={(_, v) => setViewTab(v)}
                  sx={{ minHeight: 36, '& .MuiTab-root': { minHeight: 36, py: 0.5 } }}
                >
                  <Tab
                    label='全部模板'
                    value='all'
                    sx={{ textTransform: 'none' }}
                  />
                  <Tab
                    label='我的模板'
                    value='mine'
                    sx={{ textTransform: 'none' }}
                  />
                </Tabs>

                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    size='small'
                    placeholder='搜索模板...'
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <Search
                            size={16}
                            style={{ marginRight: 8, color: theme.palette.grey[400] }}
                          />
                        ),
                      },
                    }}
                    sx={{ width: { xs: '100%', sm: 250 } }}
                  />
                  <Button
                    variant='contained'
                    startIcon={<Plus size={18} />}
                    size='small'
                    onClick={() => handleOpenEditDialog()}
                  >
                    新建模板
                  </Button>
                </Box>
              </Box>

              <Box sx={{ p: 3 }}>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
                    gap: 2,
                  }}
                >
                  {filteredPrompts.map((prompt) => (
                    <Card
                      key={prompt.id}
                      variant='outlined'
                      sx={{
                        height: '100%',
                        borderRadius: 3,
                        transition: 'all 0.2s',
                        '&:hover': {
                          boxShadow: 2,
                          borderColor: 'primary.main',
                        },
                      }}
                    >
                      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            mb: 1.5,
                          }}
                        >
                          <Avatar
                            sx={{
                              width: 40,
                              height: 40,
                              bgcolor: `${prompt.category}.50`,
                              color: getCategoryColor(theme, prompt.category),
                            }}
                          >
                            {getCategoryIcon(prompt.category)}
                          </Avatar>
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <IconButton
                              size='small'
                              onClick={() => onToggleFavorite(prompt.id)}
                            aria-label="收藏"
                            >
                              <Star
                                size={18}
                                style={{
                                  fill: prompt.is_favorite ? 'warning.main' : 'none',
                                  color: prompt.is_favorite ? 'warning.main' : 'grey.400',
                                }}
                              />
                            </IconButton>
                            <IconButton
                              size='small'
                              onClick={() => handleOpenEditDialog(prompt)}
                            aria-label="编辑"
                            >
                              <Edit3 size={18} />
                            </IconButton>
                            <IconButton
                              size='small'
                              onClick={() => onDeletePrompt(prompt.id)}
                            aria-label="删除"
                            >
                              <Trash2 size={18} />
                            </IconButton>
                          </Box>
                        </Box>

                        <Typography
                          variant='subtitle1'
                          sx={{ fontWeight: 600, mb: 0.5 }}
                        >
                          {prompt.name}
                        </Typography>
                        <Typography
                          variant='body2'
                          color='text.secondary'
                          sx={{ mb: 2, minHeight: 40 }}
                        >
                          {prompt.description}
                        </Typography>

                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                          {prompt.variables.slice(0, 3).map((v) => (
                            <Chip
                              key={v}
                              label={`{${v}}`}
                              size='small'
                              variant='outlined'
                              sx={{ fontSize: 11 }}
                            />
                          ))}
                          {prompt.variables.length > 3 && (
                            <Chip
                              label={`+${prompt.variables.length - 3}`}
                              size='small'
                              variant='outlined'
                              sx={{ fontSize: 11 }}
                            />
                          )}
                        </Box>

                        <Divider sx={{ mb: 1.5 }} />

                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <Typography
                            variant='caption'
                            color='text.secondary'
                            sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                          >
                            使用 {prompt.usage_count} 次
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <IconButton
                              size='small'
                              onClick={() => onCopyPrompt(prompt.content)}
                            aria-label="复制"
                            >
                              <Copy size={14} />
                            </IconButton>
                            <IconButton
                              size='small'
                              onClick={() => onUsePrompt(prompt)}
                            aria-label="执行"
                            >
                              <PlayCircle size={14} />
                            </IconButton>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Box>

                {filteredPrompts.length === 0 && (
                  <Box sx={{ textAlign: 'center', py: 8 }}>
                    <Tag
                      size={48}
                      style={{ margin: '0 auto 12px', color: theme.palette.text.disabled }}
                    />
                    <Typography
                      variant='body1'
                      color='text.secondary'
                    >
                      没有找到匹配的模板
                    </Typography>
                  </Box>
                )}
              </Box>
            </Paper>
          </Box>
        </Box>
      </Box>

      {/* 编辑/新建模板对话框 */}
      <Dialog
        open={editDialogOpen}
        onClose={handleCloseEditDialog}
        maxWidth='lg'
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography
              variant='h6'
              sx={{ fontWeight: 600 }}
            >
              {editingPrompt ? '编辑模板' : '新建模板'}
            </Typography>
            <IconButton
              size='small'
              onClick={handleCloseEditDialog}
            aria-label="关闭"
            >
              <X size={18} />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ mt: 1 }}>
            <TextField
              label='模板名称'
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              fullWidth
              size='small'
              sx={{ mb: 2 }}
            />

            <TextField
              label='描述'
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              fullWidth
              size='small'
              sx={{ mb: 2 }}
              multiline
              rows={2}
            />

            <FormControl
              fullWidth
              size='small'
              sx={{ mb: 2 }}
            >
              <InputLabel>分类</InputLabel>
              <Select
                value={formData.category}
                label='分类'
                onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
              >
                {(categories.filter((c) => c.id !== 'all') as { id: string; label: string }[]).map(
                  (cat) => (
                    <MenuItem
                      key={cat.id}
                      value={cat.id}
                    >
                      {cat.label}
                    </MenuItem>
                  )
                )}
              </Select>
            </FormControl>

            <TextField
              label='变量（每行一个）'
              value={formData.variables}
              onChange={(e) => setFormData((prev) => ({ ...prev, variables: e.target.value }))}
              fullWidth
              size='small'
              sx={{ mb: 2 }}
              multiline
              rows={3}
              placeholder='subject
recipient
key_points'
            />

            <TextField
              label='模板内容'
              value={formData.content}
              onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))}
              fullWidth
              sx={{ mb: 2 }}
              multiline
              rows={8}
              placeholder='您的提示词模板内容，使用 {变量名} 来引用变量...'
            />

            {formData.variables && (
              <Typography
                variant='caption'
                color='text.secondary'
              >
                可用变量:{' '}
                {formData.variables
                  .split('\n')
                  .map((v) => `{${v.trim()}}`)
                  .join(', ')}
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditDialog}>取消</Button>
          <Button
            variant='contained'
            startIcon={<Save size={16} />}
            onClick={handleSave}
            disabled={!formData.name || !formData.content}
          >
            {editingPrompt ? '保存修改' : '创建模板'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default PromptTemplateManager;
