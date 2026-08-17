import React, { useState, useEffect } from 'react';
import { useTheme } from '@mui/material';
import { User, Search, Plus, Users, ChevronRight, MoreVertical, Check, X } from 'lucide-react';
import type { Friend, ContactGroup } from '../../api/im';
import { imApi } from '../../api/im';
import { useNotificationStore } from '@/store';
import { logger } from '@/utils/logger';
import { designTokens, semanticTokens } from '@topems/tokens';
import i18n from '@/i18n';

interface ContactListProps {
  onSelectContact?: (friend: Friend) => void;
}

export const ContactList: React.FC<ContactListProps> = ({ onSelectContact }) => {
  const theme = useTheme();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [groups, setGroups] = useState<ContactGroup[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'friends' | 'groups'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [showFriendMenu, setShowFriendMenu] = useState(false);

  useEffect(() => {
    loadFriends();
    loadGroups();
  }, []);

  const loadFriends = async () => {
    try {
      const userId = 'current-user';
      const response = await imApi.listFriends(userId);
      if (response.success && response.data) {
        setFriends(response.data.friends || []);
      }
    } catch (error: unknown) {
      logger.error('Failed to load friends:', error);
    }
  };

  const loadGroups = async () => {
    try {
      const userId = 'current-user';
      const response = await imApi.listContactGroups(userId);
      if (response.success && response.data) {
        setGroups(response.data.groups || []);
      }
    } catch (error: unknown) {
      logger.error('Failed to load groups:', error);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;

    try {
      const userId = 'current-user';
      const response = await imApi.createContactGroup(userId, {
        name: newGroupName,
      });
      if (response.success) {
        addNotification({
          title: i18n.t('components.contact_list.k0'),
          message: i18n.t('components.contact_list.k1'),
          type: 'success',
        });
        setNewGroupName('');
        setShowAddModal(false);
        loadGroups();
      }
    } catch (error: unknown) {
      logger.error('Failed to create group:', error);
      addNotification({
        title: i18n.t('components.contact_list.k2'),
        message: i18n.t('components.contact_list.k3'),
        type: 'error',
      });
    }
  };

  const handleAcceptFriend = async (friend: Friend) => {
    try {
      const userId = 'current-user';
      const response = await imApi.acceptFriendRequest(userId, friend.friend_id);
      if (response.success) {
        addNotification({
          title: i18n.t('components.contact_list.k4'),
          message: i18n.t('components.contact_list.k5'),
          type: 'success',
        });
        loadFriends();
      }
    } catch (error: unknown) {
      logger.error('Failed to accept friend:', error);
    }
  };

  const handleRejectFriend = async (friend: Friend) => {
    try {
      const userId = 'current-user';
      const response = await imApi.rejectFriendRequest(userId, friend.friend_id);
      if (response.success) {
        addNotification({
          title: i18n.t('components.contact_list.k6'),
          message: i18n.t('components.contact_list.k7'),
          type: 'success',
        });
        loadFriends();
      }
    } catch (error: unknown) {
      logger.error('Failed to reject friend:', error);
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    if (!confirm(i18n.t('components.contact_list.k8'))) return;

    try {
      const userId = 'current-user';
      const response = await imApi.removeFriend(userId, friendId);
      if (response.success) {
        addNotification({
          title: i18n.t('components.contact_list.k9'),
          message: i18n.t('components.contact_list.k10'),
          type: 'success',
        });
        setShowFriendMenu(false);
        setSelectedFriend(null);
        loadFriends();
      }
    } catch (error: unknown) {
      logger.error('Failed to remove friend:', error);
    }
  };

  const filteredFriends = friends.filter((friend) => {
    const matchesSearch = friend.friend_name.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeTab === 'friends') {
      return matchesSearch && friend.status === 'accepted';
    }
    if (activeTab === 'groups') {
      return false;
    }
    return matchesSearch;
  });

  const pendingRequests = friends.filter((f) => f.status === 'pending');
  const acceptedFriends = friends.filter((f) => f.status === 'accepted');

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: 12, borderBottom: '1px solid var(--mui-palette-divider)' }}>
        <div style={{ position: 'relative' }}>
          <Search
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 16,
              height: 16,
              color: theme.palette.text.disabled,
            }}
          />
          <input
            type='text'
            placeholder={i18n.t('components.contact_list.k0')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              paddingLeft: 40,
              paddingRight: 16,
              paddingTop: 8,
              paddingBottom: 8,
              backgroundColor: theme.palette.grey[100],
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              outline: 'none',
            }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid var(--mui-palette-divider)' }}>
        <button
          onClick={() => setActiveTab('all')}
          style={{
            flex: 1,
            paddingTop: 8,
            paddingBottom: 8,
            fontSize: 14,
            fontWeight: 500,
            transition: 'all 0.15s',
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: activeTab === 'all' ? theme.palette.primary.main : theme.palette.text.secondary,
            borderBottom: activeTab === 'all' ? '2px solid primary.main' : '2px solid transparent',
          }}
        >
          {i18n.t('components.contact_list.k0')}
          {friends.length})
        </button>
        <button
          onClick={() => setActiveTab('friends')}
          style={{
            flex: 1,
            paddingTop: 8,
            paddingBottom: 8,
            fontSize: 14,
            fontWeight: 500,
            transition: 'all 0.15s',
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color:
              activeTab === 'friends' ? theme.palette.primary.main : theme.palette.text.secondary,
            borderBottom:
              activeTab === 'friends' ? '2px solid primary.main' : '2px solid transparent',
          }}
        >
          {i18n.t('components.contact_list.k1')}
          {acceptedFriends.length})
        </button>
        <button
          onClick={() => setActiveTab('groups')}
          style={{
            flex: 1,
            paddingTop: 8,
            paddingBottom: 8,
            fontSize: 14,
            fontWeight: 500,
            transition: 'all 0.15s',
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color:
              activeTab === 'groups' ? theme.palette.primary.main : theme.palette.text.secondary,
            borderBottom:
              activeTab === 'groups' ? '2px solid primary.main' : '2px solid transparent',
          }}
        >
          {i18n.t('components.contact_list.k2')}
          {groups.length})
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {activeTab !== 'groups' && pendingRequests.length > 0 && (
          <div style={{ padding: 8 }}>
            <div style={{ fontSize: 12, color: theme.palette.text.secondary, padding: '4px 8px' }}>
              {i18n.t('components.contact_list.k1')}
            </div>
            {pendingRequests.map((friend) => (
              <div
                key={friend.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 8,
                  borderRadius: 8,
                  margin: '0 4px',
                }}
              >
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: 12 }}
                  role='button'
                  tabIndex={0}
                  onClick={() => onSelectContact?.(friend)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectContact?.(friend);
                    }
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 'full',
                      backgroundColor: theme.palette.secondary.light,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <User style={{ width: 20, height: 20, color: theme.palette.primary.main }} />
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 500,
                        color: theme.palette.text.primary,
                      }}
                    >
                      {friend.friend_name}
                    </div>
                    <div style={{ fontSize: 12, color: theme.palette.text.secondary }}>
                      {i18n.t('components.contact_list.k2')}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    onClick={() => handleAcceptFriend(friend)}
                    style={{
                      padding: 6,
                      borderRadius: 'full',
                      backgroundColor: 'success.lighter',
                      color: theme.palette.success.dark,
                      border: 'none',
                      cursor: 'pointer',
                    }}
                    title={i18n.t('components.contact_list.k11')}
                  >
                    <Check style={{ width: 16, height: 16 }} />
                  </button>
                  <button
                    onClick={() => handleRejectFriend(friend)}
                    style={{
                      padding: 6,
                      borderRadius: 'full',
                      backgroundColor: 'error.lighter',
                      color: theme.palette.error.dark,
                      border: 'none',
                      cursor: 'pointer',
                    }}
                    title={i18n.t('components.contact_list.k12')}
                  >
                    <X style={{ width: 16, height: 16 }} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab !== 'groups' && filteredFriends.length > 0 && (
          <div style={{ padding: 8 }}>
            <div style={{ fontSize: 12, color: theme.palette.text.secondary, padding: '4px 8px' }}>
              {i18n.t('components.contact_list.k3')}
            </div>
            {filteredFriends
              .filter((f) => f.status === 'accepted')
              .map((friend) => (
                <div
                  key={friend.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 8,
                    borderRadius: 8,
                    margin: '0 4px',
                    cursor: 'pointer',
                    position: 'relative',
                  }}
                >
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 12 }}
                    role='button'
                    tabIndex={0}
                    onClick={() => onSelectContact?.(friend)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectContact?.(friend);
                      }
                    }}
                  >
                    <div style={{ position: 'relative' }}>
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 'full',
                          backgroundColor: theme.palette.secondary.light,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <User
                          style={{ width: 20, height: 20, color: theme.palette.primary.main }}
                        />
                      </div>
                      {friend.is_online && (
                        <span
                          style={{
                            position: 'absolute',
                            bottom: 0,
                            right: 0,
                            width: 12,
                            height: 12,
                            backgroundColor: theme.palette.success.dark,
                            borderRadius: 'full',
                            border: '2px solid var(--color-primary-foreground, #ffffff)',
                          }}
                        ></span>
                      )}
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 500,
                          color: theme.palette.text.primary,
                        }}
                      >
                        {friend.friend_name}
                      </div>
                      <div style={{ fontSize: 12, color: theme.palette.text.secondary }}>
                        {friend.is_online
                          ? i18n.t('components.contact_list.k13')
                          : friend.last_seen
                            ? `${i18n.t('components.contact_list.k4')} ${new Date(friend.last_seen).toLocaleString()}`
                            : i18n.t('components.contact_list.k14')}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFriend(friend);
                      setShowFriendMenu(!showFriendMenu);
                    }}
                    style={{
                      padding: 6,
                      borderRadius: 'full',
                      backgroundColor: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <MoreVertical
                      style={{ width: 16, height: 16, color: theme.palette.text.disabled }}
                    />
                  </button>
                  {showFriendMenu && selectedFriend?.id === friend.id && (
                    <div
                      style={{
                        position: 'absolute',
                        right: 0,
                        top: '100%',
                        marginTop: 4,
                        backgroundColor: 'common.white',
                        borderRadius: 8,
                        boxShadow: designTokens.shadows.lg,
                        border: '1px solid grey.200',
                        padding: 4,
                        zIndex: 10,
                        minWidth: 120,
                      }}
                    >
                      <button
                        onClick={() => handleRemoveFriend(friend.friend_id)}
                        style={{
                          width: '100%',
                          padding: '8px 16px',
                          textAlign: 'left',
                          fontSize: 14,
                          color: theme.palette.error.dark,
                          backgroundColor: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        {i18n.t('components.contact_list.k5')}
                      </button>
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}

        {activeTab === 'groups' && (
          <div style={{ padding: 8 }}>
            {groups.length === 0 ? (
              <div
                style={{ textAlign: 'center', padding: 32, color: theme.palette.text.secondary }}
              >
                <Users
                  style={{
                    width: 48,
                    height: 48,
                    margin: '0 auto',
                    marginBottom: 8,
                    color: theme.palette.grey[300],
                  }}
                />
                <p style={{ fontSize: 14 }}>{i18n.t('components.contact_list.k15')}</p>
                <button
                  onClick={() => setShowAddModal(true)}
                  style={{
                    marginTop: 8,
                    color: theme.palette.primary.main,
                    fontSize: 14,
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {i18n.t('components.contact_list.k6')}
                </button>
              </div>
            ) : (
              groups.map((group) => (
                <div
                  key={group.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 12,
                    borderRadius: 8,
                    margin: '0 4px',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 'full',
                        backgroundColor: theme.palette.grey[100],
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Users
                        style={{ width: 20, height: 20, color: theme.palette.text.secondary }}
                      />
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 500,
                          color: theme.palette.text.primary,
                        }}
                      >
                        {group.name}
                      </div>
                      <div style={{ fontSize: 12, color: theme.palette.text.secondary }}>
                        {i18n.t('components.contact_list.0_7')}
                      </div>
                    </div>
                  </div>
                  <ChevronRight
                    style={{ width: 16, height: 16, color: theme.palette.text.disabled }}
                  />
                </div>
              ))
            )}
          </div>
        )}

        {activeTab !== 'groups' && filteredFriends.length === 0 && pendingRequests.length === 0 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: theme.palette.text.secondary,
            }}
          >
            <User
              style={{
                width: 64,
                height: 64,
                color: theme.palette.grey[300],
                marginBottom: 16,
              }}
            />
            <p style={{ fontSize: 14 }}>{i18n.t('components.contact_list.k16')}</p>
          </div>
        )}
      </div>

      {activeTab === 'groups' && (
        <div style={{ padding: 12, borderTop: '1px solid var(--mui-palette-divider)' }}>
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              paddingTop: 8,
              paddingBottom: 8,
              backgroundColor: theme.palette.primary.main,
              color: 'common.white',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <Plus style={{ width: 16, height: 16 }} />
            <span style={{ fontSize: 14, fontWeight: 500 }}>
              {i18n.t('components.contact_list.k17')}
            </span>
          </button>
        </div>
      )}

      {showAddModal && (
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
              borderRadius: 8,
              padding: 16,
              width: '100%',
              maxWidth: 320,
              margin: '0 16px',
            }}
          >
            <h3 style={{ fontWeight: 500, color: theme.palette.text.primary, marginBottom: 16 }}>
              {i18n.t('components.contact_list.k8')}
            </h3>
            <input
              type='text'
              placeholder={i18n.t('components.contact_list.k18')}
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid grey.300',
                borderRadius: 4,
                fontSize: 14,
                outline: 'none',
              }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button
                onClick={() => setShowAddModal(false)}
                style={{
                  flex: 1,
                  paddingTop: 8,
                  paddingBottom: 8,
                  border: '1px solid grey.300',
                  borderRadius: 4,
                  fontSize: 14,
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                }}
              >
                {i18n.t('components.contact_list.k9')}
              </button>
              <button
                onClick={handleCreateGroup}
                style={{
                  flex: 1,
                  paddingTop: 8,
                  paddingBottom: 8,
                  backgroundColor: theme.palette.primary.main,
                  color: 'common.white',
                  borderRadius: 4,
                  fontSize: 14,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {i18n.t('components.contact_list.k10')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
