import React, { useState, useCallback } from 'react';
import { Box, Typography, Avatar, TextField, Paper, Button } from '@mui/material';
import { Send, ThumbsUp, Reply, User } from 'lucide-react';

export interface Comment {
  id: string;
  content: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  createdAt: string;
  likes?: number;
  liked?: boolean;
  replies?: Comment[];
}

export interface CommentListProps {
  comments: Comment[];
  onAddComment?: (content: string) => void;
  onLike?: (commentId: string) => void;
  onReply?: (commentId: string, content: string) => void;
  allowReply?: boolean;
  allowLike?: boolean;
  allowAdd?: boolean;
}

const CommentItem: React.FC<{
  comment: Comment;
  onLike?: (commentId: string) => void;
  onReply?: (commentId: string, content: string) => void;
  allowReply?: boolean;
  allowLike?: boolean;
  depth?: number;
}> = ({ comment, onLike, onReply, allowReply = true, allowLike = true, depth = 0 }) => {
  const [replyText, setReplyText] = useState('');
  const [showReply, setShowReply] = useState(false);

  const handleReply = useCallback(() => {
    if (replyText.trim() && onReply) {
      onReply(comment.id, replyText.trim());
      setReplyText('');
      setShowReply(false);
    }
  }, [replyText, comment.id, onReply]);

  return (
    <Box sx={{ pl: depth * 2, py: 2 }}>
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Avatar sx={{ width: 40, height: 40, flexShrink: 0 }}>
          {comment.author.avatar ? (
            <img
              src={comment.author.avatar}
              alt=''
            />
          ) : (
            <User size={20} />
          )}
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography
              variant='body1'
              sx={{ fontWeight: 600 }}
            >
              {comment.author.name}
            </Typography>
            <Typography
              variant='caption'
              color='text.disabled'
            >
              {comment.createdAt}
            </Typography>
          </Box>
          <Typography
            variant='body2'
            sx={{ mt: 0.5 }}
          >
            {comment.content}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
            {allowLike && (
              <Button
                size='small'
                onClick={() => onLike?.(comment.id)}
                sx={{ p: 0, minWidth: 'auto', gap: 0.5 }}
              >
                <ThumbsUp
                  size={14}
                  sx={{ color: comment.liked ? 'primary.main' : 'text.secondary' }}
                />
                <Typography
                  variant='caption'
                  sx={{ color: 'text.secondary' }}
                >
                  {comment.likes || 0}
                </Typography>
              </Button>
            )}
            {allowReply && (
              <Button
                size='small'
                onClick={() => setShowReply(!showReply)}
                sx={{ p: 0, minWidth: 'auto', gap: 0.5 }}
              >
                <Reply
                  size={14}
                  sx={{ color: 'text.secondary' }}
                />
                <Typography
                  variant='caption'
                  sx={{ color: 'text.secondary' }}
                >
                  回复
                </Typography>
              </Button>
            )}
          </Box>

          {showReply && (
            <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
              <TextField
                size='small'
                placeholder='写下你的回复...'
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleReply()}
                sx={{ flex: 1 }}
              />
              <Button
                variant='contained'
                size='small'
                onClick={handleReply}
                disabled={!replyText.trim()}
                startIcon={<Send size={14} />}
              >
                发送
              </Button>
            </Box>
          )}

          {comment.replies && comment.replies.length > 0 && (
            <Box sx={{ mt: 2 }}>
              {comment.replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  onLike={onLike}
                  onReply={onReply}
                  allowReply={allowReply}
                  allowLike={allowLike}
                  depth={depth + 1}
                />
              ))}
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export const CommentList: React.FC<CommentListProps> = ({
  comments,
  onAddComment,
  onLike,
  onReply,
  allowReply = true,
  allowLike = true,
  allowAdd = true,
}) => {
  const [newComment, setNewComment] = useState('');

  const handleAddComment = useCallback(() => {
    if (newComment.trim() && onAddComment) {
      onAddComment(newComment.trim());
      setNewComment('');
    }
  }, [newComment, onAddComment]);

  return (
    <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
      {allowAdd && (
        <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
          <Typography
            variant='subtitle1'
            sx={{ fontWeight: 600, mb: 2 }}
          >
            添加评论
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Avatar sx={{ width: 40, height: 40, flexShrink: 0 }}>
              <User size={20} />
            </Avatar>
            <Box sx={{ flex: 1, display: 'flex', gap: 1 }}>
              <TextField
                size='small'
                placeholder='写下你的评论...'
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                sx={{ flex: 1 }}
              />
              <Button
                variant='contained'
                size='small'
                onClick={handleAddComment}
                disabled={!newComment.trim()}
                startIcon={<Send size={14} />}
              >
                发送
              </Button>
            </Box>
          </Box>
        </Box>
      )}

      <Box sx={{ maxHeight: 600, overflowY: 'auto' }}>
        {comments.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography
              variant='body2'
              color='text.secondary'
            >
              暂无评论，快来发表第一条评论吧
            </Typography>
          </Box>
        ) : (
          comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              onLike={onLike}
              onReply={onReply}
              allowReply={allowReply}
              allowLike={allowLike}
            />
          ))
        )}
      </Box>
    </Paper>
  );
};

export default CommentList;
