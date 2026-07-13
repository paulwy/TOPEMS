import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  TextField,
  InputAdornment,
  Chip,
  Card,
  CardContent,
  CardActionArea,
  Stack,
  Avatar,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  FormControl,
  InputLabel,
  Grid,
} from '@mui/material';
import { Plus, Search, MoreVertical, Edit, Trash2, Copy, Eye, Send, FileText } from 'lucide-react';
import { PageContainer } from '@/components';
import { lowcodeApi } from '@/api';
import type { FormSchema, ListParams } from '@/api/lowcode';
import { LOWCODE_PATHS } from '@/modules/lowcode/config';
import { logger } from '@/utils/logger';

const FormListPage: React.FC = () => {
  const navigate = useNavigate();
  const [forms, setForms] = useState<FormSchema[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  const [menuAnchor, setMenuAnchor] = useState<null | { el: HTMLElement; form: FormSchema }>(null);
  const [deleteDialog, setDeleteDialog] = useState<FormSchema | null>(null);

  useEffect(() => {
    loadForms();
  }, [page, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      loadForms();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchKeyword]);

  const loadForms = async () => {
    try {
      setLoading(true);
      const params: ListParams = {
        page,
        pageSize,
        keyword: searchKeyword || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      };
      const res = await lowcodeApi.formApi.listForms(params);
      if (res.success) {
        setForms(res.data.items);
        setTotal(res.data.total);
      }
    } catch (error) {
      logger.error('Failed to load forms:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'success';
      case 'draft':
        return 'warning';
      case 'archived':
        return 'default';
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
      case 'archived':
        return '已归档';
      default:
        return status;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleCreate = () => {
    navigate(LOWCODE_PATHS.formDesigner.replace(':id', 'new'));
  };

  const handleEdit = (form: FormSchema) => {
    navigate(LOWCODE_PATHS.formDesigner.replace(':id', form.id));
    setMenuAnchor(null);
  };

  const handlePreview = (form: FormSchema) => {
    navigate(`${LOWCODE_PATHS.formDesigner.replace(':id', form.id)}?preview=true`);
    setMenuAnchor(null);
  };

  const handleCopy = async (form: FormSchema) => {
    try {
      await lowcodeApi.formApi.createForm({ ...form, name: `${form.name} (副本)` });
      loadForms();
    } catch (error) {
      logger.error('Failed to copy form:', error);
    }
    setMenuAnchor(null);
  };

  const handlePublish = async (form: FormSchema) => {
    try {
      await lowcodeApi.formApi.publishForm(form.id);
      loadForms();
    } catch (error) {
      logger.error('Failed to publish form:', error);
    }
    setMenuAnchor(null);
  };

  const handleDelete = async () => {
    if (!deleteDialog) return;
    try {
      await lowcodeApi.formApi.deleteForm(deleteDialog.id);
      setDeleteDialog(null);
      loadForms();
    } catch (error) {
      logger.error('Failed to delete form:', error);
    }
  };

  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>, form: FormSchema) => {
    e.stopPropagation();
    setMenuAnchor({ el: e.currentTarget, form });
  };

  return (
    <PageContainer
      title='表单管理'
      subtitle='创建和管理业务表单'
    >
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <TextField
          size='small'
          placeholder='搜索表单...'
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          sx={{ width: 280 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position='start'>
                  <Search size={18} />
                </InputAdornment>
              ),
            },
          }}
        />

        <FormControl
          size='small'
          sx={{ width: 140 }}
        >
          <InputLabel>状态</InputLabel>
          <Select
            value={statusFilter}
            label='状态'
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <MenuItem value='all'>全部</MenuItem>
            <MenuItem value='draft'>草稿</MenuItem>
            <MenuItem value='published'>已发布</MenuItem>
            <MenuItem value='archived'>已归档</MenuItem>
          </Select>
        </FormControl>

        <Box sx={{ flex: 1 }} />

        <Button
          variant='contained'
          startIcon={<Plus size={18} />}
          onClick={handleCreate}
        >
          新建表单
        </Button>
      </Box>

      <Grid
        container
        spacing={2.5}
      >
        {forms.map((form) => (
          <Grid
            size={{ xs: 12, sm: 6, md: 4, lg: 3 }}
            key={form.id}
          >
            <Card
              elevation={0}
              sx={{
                border: 1,
                borderColor: 'divider',
                transition: 'all 0.2s',
                '&:hover': {
                  borderColor: 'primary.main',
                  boxShadow: (theme) => theme.shadows[4],
                  transform: 'translateY(-2px)',
                },
              }}
            >
              <Box
                onClick={() => handleEdit(form)}
                sx={{
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.04)',
                  },
                  '&:active': {
                    backgroundColor: 'rgba(0, 0, 0, 0.08)',
                  },
                }}
              >
                <CardContent sx={{ p: 2.5 }}>
                  <Stack
                    direction='row'
                    spacing={2}
                    sx={{ alignItems: 'flex-start', mb: 2 }}
                  >
                    <Avatar
                      sx={{
                        bgcolor: 'primary.lighter',
                        color: 'primary.main',
                        width: 44,
                        height: 44,
                      }}
                    >
                      <FileText size={22} />
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        variant='subtitle1'
                        sx={{ fontWeight: 600 }}
                        noWrap
                      >
                        {form.name}
                      </Typography>
                      <Chip
                        label={getStatusLabel(form.status)}
                        size='small'
                        color={getStatusColor(form.status) as any}
                        variant='outlined'
                        sx={{ mt: 0.5 }}
                      />
                    </Box>
                    <IconButton
                      size='small'
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMenuOpen(e, form);
                      }}
                      sx={{ mt: -0.5, mr: -0.5 }}
                    >
                      <MoreVertical size={18} />
                    </IconButton>
                  </Stack>

                  <Typography
                    variant='body2'
                    color='text.secondary'
                    sx={{
                      mb: 2,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      minHeight: 40,
                    }}
                  >
                    {form.description || '暂无描述'}
                  </Typography>

                  <Stack
                    direction='row'
                    spacing={1}
                    sx={{ pt: 1.5, borderTop: 1, borderColor: 'divider' }}
                  >
                    <Typography
                      variant='caption'
                      color='text.disabled'
                    >
                      {form.components.length} 个组件
                    </Typography>
                    <Box sx={{ flex: 1 }} />
                    <Typography
                      variant='caption'
                      color='text.disabled'
                    >
                      {formatDate(form.updatedAt)}
                    </Typography>
                  </Stack>
                </CardContent>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>

      {forms.length === 0 && !loading && (
        <Box
          sx={{
            py: 8,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Avatar sx={{ width: 64, height: 64, bgcolor: 'grey.100' }}>
            <FileText
              size={32}
              color='grey'
            />
          </Avatar>
          <Typography
            variant='h6'
            color='text.secondary'
          >
            暂无表单
          </Typography>
          <Typography
            variant='body2'
            color='text.disabled'
          >
            点击上方按钮创建您的第一个表单
          </Typography>
          <Button
            variant='contained'
            startIcon={<Plus size={18} />}
            onClick={handleCreate}
          >
            新建表单
          </Button>
        </Box>
      )}

      <Menu
        anchorEl={menuAnchor?.el}
        open={!!menuAnchor}
        onClose={() => setMenuAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem onClick={() => menuAnchor && handleEdit(menuAnchor.form)}>
          <Edit
            size={16}
            style={{ marginRight: 8 }}
          />{' '}
          编辑
        </MenuItem>
        <MenuItem onClick={() => menuAnchor && handlePreview(menuAnchor.form)}>
          <Eye
            size={16}
            style={{ marginRight: 8 }}
          />{' '}
          预览
        </MenuItem>
        <MenuItem onClick={() => menuAnchor && handleCopy(menuAnchor.form)}>
          <Copy
            size={16}
            style={{ marginRight: 8 }}
          />{' '}
          复制
        </MenuItem>
        {menuAnchor?.form.status !== 'published' && (
          <MenuItem onClick={() => menuAnchor && handlePublish(menuAnchor.form)}>
            <Send
              size={16}
              style={{ marginRight: 8 }}
            />{' '}
            发布
          </MenuItem>
        )}
        <MenuItem
          sx={{ color: 'error.main' }}
          onClick={() => menuAnchor && setDeleteDialog(menuAnchor.form)}
        >
          <Trash2
            size={16}
            style={{ marginRight: 8 }}
          />{' '}
          删除
        </MenuItem>
      </Menu>

      <Dialog
        open={!!deleteDialog}
        onClose={() => setDeleteDialog(null)}
      >
        <DialogTitle>确认删除</DialogTitle>
        <DialogContent>
          <Typography>确定要删除表单「{deleteDialog?.name}」吗？此操作不可恢复。</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(null)}>取消</Button>
          <Button
            color='error'
            variant='contained'
            onClick={handleDelete}
          >
            删除
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default FormListPage;
