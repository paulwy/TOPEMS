import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  TextField,
  Button,
  Divider,
  CircularProgress,
  Alert,
  Chip,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import i18n from '@/i18n';
import { Edit2, Trash2, Send, Reply, User } from 'lucide-react';
import { ListPageTemplate } from '@/components/templates';
import { commentApi, type Comment } from '@/api/shared';
import { useNotificationStore } from '@/store';
import { useAuth } from '@/hooks/useAuth';
import { apiLogger } from '@/utils/logger';

import { CACHE_DURATIONS, QUERY_KEYS } from '@/lib/reactQuery';

const ENTITY_TYPES = ['document', 'task', 'project', 'ticket', 'order'] as const;

const CommentsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const { user } = useAuth();

  const [entityType, setEntityType] = useState<string>('document');
  const [entityId, setEntityId] = useState<string>('demo-1');
  const [newComment, setNewComment] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  // 获取评论列表
  const { data: comments, isPending } = useQuery({
    queryKey: [...QUERY_KEYS.AD_HOC.SHARED_COMMENTS_BASE, entityType, entityId],
    queryFn: async () => {
      const response = await commentApi.list(entityType, entityId);
      if (response.success && response.data) {
        return response.data;
      }
      return [];
    },
    enabled: !!entityType && !!entityId,

    staleTime: CACHE_DURATIONS.MEDIUM,
  });

  // 创建评论
  const createMutation = useMutation({
    mutationFn: (data: { content: string; parentId?: string }) =>
      commentApi.create({
        content: data.content,
        entity_type: entityType,
        entity_id: entityId,
        parentId: data.parentId,
      }),
    onSuccess: () => {
      addNotification({
        type: 'success',
        title: i18n.t('pages.comments_page.k1'),
        message: i18n.t('pages.comments_page.k0'),
      });
      queryClient.invalidateQueries({
        queryKey: [...QUERY_KEYS.AD_HOC.SHARED_COMMENTS_BASE, entityType, entityId],

        exact: false,
        refetchType: 'active',
      });
      setNewComment('');
      setReplyTo(null);
      setReplyContent('');
    },
    onError: (error: unknown) => {
      apiLogger.error(i18n.t('pages.comments_page.k0'), error);
      addNotification({
        type: 'error',
        title: i18n.t('pages.comments_page.k3'),
        message: i18n.t('pages.comments_page.k2'),
      });
    },
  });

  // 更新评论
  const updateMutation = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      commentApi.update(id, { content }),
    onSuccess: () => {
      addNotification({
        type: 'success',
        title: i18n.t('pages.comments_page.k5'),
        message: i18n.t('pages.comments_page.k4'),
      });
      queryClient.invalidateQueries({
        queryKey: [...QUERY_KEYS.AD_HOC.SHARED_COMMENTS_BASE, entityType, entityId],

        exact: false,
        refetchType: 'active',
      });
      setEditingId(null);
      setEditingContent('');
    },
    onError: (error: unknown) => {
      apiLogger.error(i18n.t('pages.comments_page.k1'), error);
      addNotification({
        type: 'error',
        title: i18n.t('pages.comments_page.k7'),
        message: i18n.t('pages.comments_page.k6'),
      });
    },
  });

  // 删除评论
  const deleteMutation = useMutation({
    mutationFn: (id: string) => commentApi.delete(id),
    onSuccess: () => {
      addNotification({
        type: 'success',
        title: i18n.t('pages.comments_page.k9'),
        message: i18n.t('pages.comments_page.k8'),
      });
      queryClient.invalidateQueries({
        queryKey: [...QUERY_KEYS.AD_HOC.SHARED_COMMENTS_BASE, entityType, entityId],

        exact: false,
        refetchType: 'active',
      });
    },
    onError: (error: unknown) => {
      apiLogger.error(i18n.t('pages.comments_page.k2'), error);
      addNotification({
        type: 'error',
        title: i18n.t('pages.comments_page.k11'),
        message: i18n.t('pages.comments_page.k10'),
      });
    },
  });

  const handleSubmit = () => {
    if (!newComment.trim()) return;
    createMutation.mutate({ content: newComment.trim() });
  };

  const handleReply = (parentId: string) => {
    if (!replyContent.trim()) return;
    createMutation.mutate({ content: replyContent.trim(), parentId });
  };

  const handleUpdate = (id: string) => {
    if (!editingContent.trim()) return;
    updateMutation.mutate({ id, content: editingContent.trim() });
  };

  const renderComment = (comment: Comment, depth = 0) => (
    <Box
      key={comment.id}
      sx={{ pl: depth * 3, mb: 2 }}
    >
      <ListItem
        alignItems='flex-start'
        sx={{ px: 0 }}
      >
        <ListItemAvatar>
          <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main' }}>
            <User size={18} />
          </Avatar>
        </ListItemAvatar>
        <ListItemText
          primary={
            <Stack
              direction='row'
              spacing={1}
              sx={{ alignItems: 'center' }}
            >
              <Typography variant='subtitle2'>{comment.author_name}</Typography>
              <Chip
                size='small'
                label={comment.entity_type}
                variant='outlined'
              />
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {new Date(comment.created_at).toLocaleString('zh-CN')}
              </Typography>
            </Stack>
          }
          secondary={
            <Box sx={{ mt: 0.5 }}>
              {editingId === comment.id ? (
                <Stack
                  direction='row'
                  spacing={1}
                  sx={{ mt: 1 }}
                >
                  <TextField
                    fullWidth
                    size='small'
                    multiline
                    value={editingContent}
                    onChange={(e) => setEditingContent(e.target.value)}
                  />
                  <Button
                    size='small'
                    variant='contained'
                    onClick={() => handleUpdate(comment.id)}
                  >
                    {i18n.t('pages.comments_page.k3')}
                  </Button>
                  <Button
                    size='small'
                    onClick={() => setEditingId(null)}
                  >
                    {i18n.t('pages.comments_page.k4')}
                  </Button>
                </Stack>
              ) : (
                <Typography
                  variant='body2'
                  color='text.primary'
                >
                  {comment.content}
                </Typography>
              )}
              <Stack
                direction='row'
                spacing={1}
                sx={{ mt: 1 }}
              >
                <IconButton
                  size='small'
                  onClick={() => {
                    setReplyTo(replyTo === comment.id ? null : comment.id);
                    setReplyContent('');
                  }}
                  aria-label={i18n.t('pages.comments_page.k12')}
                >
                  <Reply size={14} />
                </IconButton>
                {comment.author_id === user?.id && (
                  <>
                    <IconButton
                      size='small'
                      onClick={() => {
                        setEditingId(comment.id);
                        setEditingContent(comment.content);
                      }}
                      aria-label={i18n.t('pages.comments_page.k13')}
                    >
                      <Edit2 size={14} />
                    </IconButton>
                    <IconButton
                      size='small'
                      color='error'
                      onClick={() => deleteMutation.mutate(comment.id)}
                      aria-label={i18n.t('pages.comments_page.k14')}
                    >
                      <Trash2 size={14} />
                    </IconButton>
                  </>
                )}
              </Stack>
              {replyTo === comment.id && (
                <Stack
                  direction='row'
                  spacing={1}
                  sx={{ mt: 1 }}
                >
                  <TextField
                    fullWidth
                    size='small'
                    placeholder={`${i18n.t('pages.comments_page.k5')} ${comment.author_name}...`}
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                  />
                  <Button
                    size='small'
                    variant='contained'
                    onClick={() => handleReply(comment.id)}
                  >
                    {i18n.t('pages.comments_page.k6')}
                  </Button>
                </Stack>
              )}
            </Box>
          }
        />
      </ListItem>
      {comment.replies?.map((reply) => renderComment(reply, depth + 1))}
      <Divider sx={{ mt: 1 }} />
    </Box>
  );

  return (
    <ListPageTemplate
      title={i18n.t('pages.comments_page.k15')}
      autoBreadcrumbs
      columns={[]}
      data={[]}
      headerContent={
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Stack
              direction='row'
              spacing={2}
              sx={{ mb: 2 }}
            >
              <FormControl
                size='small'
                sx={{ minWidth: 140 }}
              >
                <InputLabel>{i18n.t('pages.comments_page.k16')}</InputLabel>
                <Select
                  value={entityType}
                  label={i18n.t('pages.comments_page.k17')}
                  onChange={(e) => setEntityType(e.target.value)}
                >
                  {ENTITY_TYPES.map((t) => (
                    <MenuItem
                      key={t}
                      value={t}
                    >
                      {t}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                size='small'
                label={i18n.t('pages.comments_page.id_18')}
                value={entityId}
                onChange={(e) => setEntityId(e.target.value)}
                sx={{ minWidth: 200 }}
              />
            </Stack>
          </CardContent>
        </Card>
      }
      footerContent={
        <>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography
                variant='h6'
                sx={{ mb: 2 }}
              >
                {i18n.t('pages.comments_page.k7')}
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                placeholder={i18n.t('pages.comments_page.k8')}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
              />
              <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant='contained'
                  startIcon={<Send size={16} />}
                  onClick={handleSubmit}
                  disabled={!newComment.trim() || createMutation.isPending}
                >
                  {i18n.t('pages.comments_page.k9')}
                </Button>
              </Box>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography
                variant='h6'
                sx={{ mb: 2 }}
              >
                {i18n.t('pages.comments_page.k10')}
              </Typography>
              {isPending ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                  <CircularProgress />
                </Box>
              ) : !comments || comments.length === 0 ? (
                <Alert severity='info'>{i18n.t('pages.comments_page.k19')}</Alert>
              ) : (
                <List>{comments.map((comment) => renderComment(comment))}</List>
              )}
            </CardContent>
          </Card>
        </>
      }
    />
  );
};

export default CommentsPage;
