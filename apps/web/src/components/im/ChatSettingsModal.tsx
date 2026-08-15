import React from 'react';
import { X, BellOff, Bell, Pin, PinOff, Trash2, Users } from 'lucide-react';
import type { ChatRoom } from '../../api/im';
import { designTokens, semanticTokens } from '@topems/tokens';
import i18n from '@/i18n';

interface ChatSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatRoom: ChatRoom;
  onMute: () => void;
  onUnmute: () => void;
  onPin: () => void;
  onUnpin: () => void;
  onDelete: () => void;
}

export const ChatSettingsModal: React.FC<ChatSettingsModalProps> = ({
  isOpen,
  onClose,
  chatRoom,
  onMute,
  onUnmute,
  onPin,
  onUnpin,
  onDelete,
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'action.active',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
      }}
    >
      <div
        style={{
          backgroundColor: 'common.white',
          borderRadius: 12,
          boxShadow: designTokens.shadows['2xl'],
          width: '100%',
          maxWidth: 384,
          margin: '0 16px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: `${designTokens.spacing.md} 16px`,
            borderBottom: '1px solid grey.200',
          }}
        >
          <h3 style={{ fontWeight: 600, color: 'text.primary' }}>{i18n.t('im.chat_settings_modal.k0')}</h3>
          <button
            onClick={onClose}
            style={{
              padding: 4,
              borderRadius: 'full',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <X style={{ width: 20, height: 20, color: 'text.secondary' }} />
          </button>
        </div>

        <div style={{ padding: 16 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 16,
              paddingBottom: 16,
              borderBottom: '1px solid grey.100',
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 'full',
                backgroundColor: 'secondary.light',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Users style={{ width: 24, height: 24, color: 'primary.main' }} />
            </div>
            <div>
              <div style={{ fontWeight: 500, color: 'text.primary' }}>
                {chatRoom.name || i18n.t('im.chat_settings_modal.k1')}
              </div>
              <div style={{ fontSize: 14, color: 'text.secondary' }}>
                {chatRoom.room_type === 'direct' ? i18n.t('im.chat_settings_modal.k3') : i18n.t('im.chat_settings_modal.k2')} ·{' '}
                {chatRoom.members?.length || 0} {i18n.t('components.chat_settings_modal.k0')}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              onClick={chatRoom.is_muted ? onUnmute : onMute}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: 12,
                borderRadius: 8,
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                transition: 'background-color 0.15s',
              }}
            >
              {chatRoom.is_muted ? (
                <>
                  <Bell style={{ width: 20, height: 20, color: 'text.disabled' }} />
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 500,
                        color: 'text.primary',
                      }}
                    >
                      {i18n.t('components.chat_settings_modal.k0')}
                    </div>
                    <div style={{ fontSize: 12, color: 'text.secondary' }}>{i18n.t('im.chat_settings_modal.k4')}</div>
                  </div>
                </>
              ) : (
                <>
                  <BellOff style={{ width: 20, height: 20, color: 'text.disabled' }} />
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 500,
                        color: 'text.primary',
                      }}
                    >
                      {i18n.t('components.chat_settings_modal.k1')}
                    </div>
                    <div style={{ fontSize: 12, color: 'text.secondary' }}>{i18n.t('im.chat_settings_modal.k5')}</div>
                  </div>
                </>
              )}
            </button>

            <button
              onClick={chatRoom.is_pinned ? onUnpin : onPin}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: 12,
                borderRadius: 8,
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                transition: 'background-color 0.15s',
              }}
            >
              {chatRoom.is_pinned ? (
                <>
                  <PinOff style={{ width: 20, height: 20, color: 'text.disabled' }} />
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 500,
                        color: 'text.primary',
                      }}
                    >
                      {i18n.t('components.chat_settings_modal.k2')}
                    </div>
                    <div style={{ fontSize: 12, color: 'text.secondary' }}>{i18n.t('im.chat_settings_modal.k6')}</div>
                  </div>
                </>
              ) : (
                <>
                  <Pin style={{ width: 20, height: 20, color: 'text.disabled' }} />
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 500,
                        color: 'text.primary',
                      }}
                    >
                      {i18n.t('components.chat_settings_modal.k3')}
                    </div>
                    <div style={{ fontSize: 12, color: 'text.secondary' }}>
                      {i18n.t('components.chat_settings_modal.k4')}
                    </div>
                  </div>
                </>
              )}
            </button>

            <button
              onClick={onDelete}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: 12,
                borderRadius: 8,
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                transition: 'background-color 0.15s',
              }}
            >
              <Trash2 style={{ width: 20, height: 20, color: 'error.main' }} />
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'error.dark' }}>{i18n.t('im.chat_settings_modal.k7')}</div>
                <div style={{ fontSize: 12, color: 'error.light' }}>{i18n.t('im.chat_settings_modal.k8')}</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
