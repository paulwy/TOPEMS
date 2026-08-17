import React, { useState } from 'react';
import { useTheme } from '@mui/material';
import { User, FileText, Check, CheckCheck, MoreVertical, Trash2, Edit3 } from 'lucide-react';
import type { ChatMessage } from '../../api/im';
import { designTokens, semanticTokens } from '@topems/tokens';
import i18n from '@/i18n';

interface MessageBubbleProps {
  message: ChatMessage;
  isSent: boolean;
  showStatus?: boolean;
  onEdit?: (message: ChatMessage) => void;
  onDelete?: (messageId: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isSent,
  showStatus = true,
  onEdit,
  onDelete,
}) => {
  const theme = useTheme();
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);

  const isImage = message.message_type === 'image';
  const isFile = message.message_type === 'file';

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleEdit = () => {
    setIsEditing(true);
    setShowMenu(false);
  };

  const handleSaveEdit = async () => {
    if (editContent.trim() && onEdit) {
      const updatedMessage = { ...message, content: editContent };
      onEdit(updatedMessage);
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditContent(message.content);
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(message.id);
    }
    setShowMenu(false);
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: isSent ? 'flex-end' : 'flex-start',
        marginBottom: 16,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          maxWidth: '70%',
          flexDirection: isSent ? 'row-reverse' : 'row',
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 'full',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isSent ? theme.palette.primary.main : theme.palette.grey[300],
            marginLeft: isSent ? 8 : 0,
            marginRight: isSent ? 0 : 8,
          }}
        >
          <User
            style={{
              width: 16,
              height: 16,
              color: isSent
                ? 'var(--color-primary-foreground, #ffffff)'
                : theme.palette.text.secondary,
            }}
          />
        </div>
        <div
          style={{
            position: 'relative',
            borderRadius: 8,
            padding: 12,
            backgroundColor: isSent ? theme.palette.primary.main : theme.palette.grey[100],
            color: isSent ? 'var(--color-primary-foreground, #ffffff)' : theme.palette.text.primary,
          }}
        >
          {isSent && (
            <div
              style={{
                position: 'absolute',
                top: -4,
                right: -4,
                opacity: 0,
                transition: 'opacity 0.15s',
                cursor: 'pointer',
              }}
              role='button'
              tabIndex={0}
              onClick={() => setShowMenu(!showMenu)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setShowMenu(!showMenu);
                }
              }}
            >
              <MoreVertical
                style={{
                  width: 16,
                  height: 16,
                  color: theme.palette.text.disabled,
                  backgroundColor: 'common.white',
                  borderRadius: 'full',
                  padding: 2,
                }}
              />
            </div>
          )}

          {showMenu && isSent && (
            <div
              style={{
                position: 'absolute',
                top: -64,
                right: -4,
                backgroundColor: 'common.white',
                borderRadius: 8,
                boxShadow: designTokens.shadows['2xl'],
                border: '1px solid grey.200',
                padding: 4,
                zIndex: 10,
              }}
            >
              <button
                onClick={handleEdit}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: `${designTokens.spacing.sm} 16px`,
                  fontSize: 14,
                  color: theme.palette.grey[700],
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  width: '100%',
                }}
              >
                <Edit3 style={{ width: 16, height: 16 }} />
                {i18n.t('components.message_bubble.k0')}
              </button>
              <button
                onClick={handleDelete}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: `${designTokens.spacing.sm} 16px`,
                  fontSize: 14,
                  color: theme.palette.error.dark,
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  width: '100%',
                }}
              >
                <Trash2 style={{ width: 16, height: 16 }} />
                {i18n.t('components.message_bubble.k1')}
              </button>
            </div>
          )}

          {!isSent && (
            <div
              style={{
                fontSize: 12,
                fontWeight: 500,
                marginBottom: 4,
                opacity: 0.7,
              }}
            >
              {message.sender_name}
            </div>
          )}

          {isEditing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                style={{
                  padding: 8,
                  borderRadius: 4,
                  fontSize: 14,
                  resize: 'none',
                  backgroundColor: isSent
                    ? 'secondary.700'
                    : 'var(--color-primary-foreground, #ffffff)',
                  color: isSent
                    ? 'var(--color-primary-foreground, #ffffff)'
                    : theme.palette.text.primary,
                  border: `1px solid ${isSent ? theme.palette.primary.light : theme.palette.grey[300]}`,
                }}
                rows={3}
                autoFocus
              />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button
                  onClick={handleCancelEdit}
                  style={{
                    fontSize: 12,
                    padding: `${designTokens.spacing.xs} 12px`,
                    borderRadius: 4,
                    backgroundColor: isSent ? theme.palette.primary.light : theme.palette.grey[200],
                    color: isSent
                      ? 'var(--color-primary-foreground, #ffffff)'
                      : theme.palette.grey[700],
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {i18n.t('components.message_bubble.k2')}
                </button>
                <button
                  onClick={handleSaveEdit}
                  style={{
                    fontSize: 12,
                    padding: `${designTokens.spacing.xs} 12px`,
                    borderRadius: 4,
                    backgroundColor: isSent
                      ? 'var(--color-primary-foreground, #ffffff)'
                      : theme.palette.primary.main,
                    color: isSent
                      ? theme.palette.primary.main
                      : 'var(--color-primary-foreground, #ffffff)',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {i18n.t('components.message_bubble.k3')}
                </button>
              </div>
            </div>
          ) : isImage && message.content ? (
            <>
              <button
                type='button'
                onClick={() => window.open(message.content, '_blank')}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
              >
                <img
                  src={message.content}
                  alt={i18n.t('im.message_bubble.k0')}
                  style={{
                    borderRadius: 8,
                    maxWidth: '100%',
                    maxHeight: 300,
                    display: 'block',
                  }}
                />
              </button>
            </>
          ) : isFile ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileText style={{ width: 20, height: 20 }} />
              <a
                href={message.file_url}
                target='_blank'
                rel='noopener noreferrer'
                style={{
                  textDecoration: 'underline',
                  color: isSent
                    ? 'var(--color-primary-foreground, #ffffff)'
                    : theme.palette.primary.main,
                }}
              >
                {message.file_name || message.content}
              </a>
            </div>
          ) : (
            <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{message.content}</div>
          )}

          {!isEditing && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 4,
                marginTop: 4,
                fontSize: 12,
                color: isSent ? theme.palette.secondary.main : theme.palette.text.secondary,
              }}
            >
              <span>{formatTime(message.created_at)}</span>
              {showStatus &&
                isSent &&
                (message.is_read ? (
                  <CheckCheck style={{ width: 12, height: 12 }} />
                ) : (
                  <Check style={{ width: 12, height: 12 }} />
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
