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
import { MessageSquare, Edit2, Trash2, Send, Reply, User } from 'lucide-react';
import { PageContainer } from '@/components/common/PageContainerV2';
import { commentApi, type Comment } from '@/api/shared';
import { useNotificationStore } from '@/store';
import { useAuth } from '@/hooks/useAuth';
import { apiLogger } from '@/utils/logger';

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
  const { data: comments, isLoading } = useQuery({
    queryKey: ['shared', 'comments', entityType, entityId],
    queryFn: async () => {
      const response = await commentApi.list(entityType, entityId);
      if (response.success && response.data) {
        return response.data;
      }
      return [];
    },
    enabled: !!entityType && !!entityId,
  });

  // 创建评论
  const createMutation = useMutation({
    mutationFn: (data: { content: string; parent_id?: string }) =>
      commentApi.create({
        content: data.content,
        entity_type: entityType,
        entity_id: entityId,
        parent_id: data.parent_id,
      }),
    onSuccess: () => {
      addNotification({ type: 'success', title: '已发表', message: '评论已发布' });
      queryClient.invalidateQueries({
        queryKey: ['shared', 'comments', entityType, entityId],
      });
      setNewComment('');
      setReplyTo(null);
      setReplyContent('');
    },
    onError: (error: unknown) => {
      apiLogger.error('创建评论失败:', error);
      addNotification({ type: 'error', title: '操作失败', message: '无法发布评论' });
    },
  });

  // 更新评论
  const updateMutation = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      commentApi.update(id, { content }),
    onSuccess: () => {
      addNotification({ type: 'success', title: '已更新', message: '评论已更新' });
      queryClient.invalidateQueries({
        queryKey: ['shared', 'comments', entityType, entityId],
      });
      setEditingId(null);
      setEditingContent('');
    },
    onError: (error: unknown) => {
      apiLogger.error('更新评论失败:', error);
      addNotification({ type: 'error', title: '操作失败', message: '无法更新评论' });
    },
  });

  // 删除评论
  const deleteMutation = useMutation({
    mutationFn: (id: string) => commentApi.delete(id),
    onSuccess: () => {
      addNotification({ type: 'success', title: '已删除', message: '评论已删除' });
      queryClient.invalidateQueries({
        queryKey: ['shared', 'comments', entityType, entityId],
      });
    },
    onError: (error: unknown) => {
      apiLogger.error('删除评论失败:', error);
      addNotification({ type: 'error', title: '操作失败', message: '无法删除评论' });
    },
  });

  const handleSubmit = () => {
    if (!newComment.trim()) return;
    createMutation.mutate({ content: newComment.trim() });
  };

  const handleReply = (parentId: string) => {
    if (!replyContent.trim()) return;
    createMutation.mutate({ content: replyContent.trim(), parent_id: parentId });
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
                    保存
                  </Button>
                  <Button
                    size='small'
                    onClick={() => setEditingId(null)}
                  >
                    取消
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
                    >
                      <Edit2 size={14} />
                    </IconButton>
                    <IconButton
                      size='small'
                      color='error'
                      onClick={() => deleteMutation.mutate(comment.id)}
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
                    placeholder={`回复 ${comment.author_name}...`}
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                  />
                  <Button
                    size='small'
                    variant='contained'
                    onClick={() => handleReply(comment.id)}
                  >
                    回复
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
    <PageContainer
      title='评论管理'
      autoBreadcrumbs
      headerProps={{
        pageIcon: <MessageSquare style={{ width: 20, height: 20 }} />,
      }}
    >
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
              <InputLabel>实体类型</InputLabel>
              <Select
                value={entityType}
                label='实体类型'
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
              label='实体 ID'
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
              sx={{ minWidth: 200 }}
            />
          </Stack>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography
            variant='h6'
            sx={{ mb: 2 }}
          >
            发表评论
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            placeholder='输入评论内容...'
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
              发表
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
            评论列表
          </Typography>
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : !comments || comments.length === 0 ? (
            <Alert severity='info'>暂无评论</Alert>
          ) : (
            <List>{comments.map((comment) => renderComment(comment))}</List>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
};

export default CommentsPage;
