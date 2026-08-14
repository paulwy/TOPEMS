import {
  TextField,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Tabs,
  Tab,
  Box,
  Button,
  useTheme,
} from '@mui/material';
import i18n from '@/i18n';
import React, { useState } from 'react';
import { X, Users, User, Save, MessageSquare } from 'lucide-react';

import { imApi, type CreateChatRoomRequest, type CreateProjectGroupRequest } from '../../api/im';
import { useNotificationStore } from '@/store';
import { logger } from '@/utils/logger';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  currentUserId?: string;
}

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  currentUserId = 'current-user',
}) => {
  const theme = useTheme();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'group'>('chat');

  const [chatRoomName, setChatRoomName] = useState('');
  const [chatRoomType, setChatRoomType] = useState<'direct' | 'group'>('direct');
  const [chatRoomMembers, setChatRoomMembers] = useState<string[]>([]);
  const [newMemberInput, setNewMemberInput] = useState('');

  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [groupMembers, setGroupMembers] = useState<string[]>([]);
  const [newGroupMemberInput, setNewGroupMemberInput] = useState('');

  const resetForm = () => {
    setChatRoomName('');
    setChatRoomType('direct');
    setChatRoomMembers([]);
    setNewMemberInput('');
    setGroupName('');
    setGroupDescription('');
    setGroupMembers([]);
    setNewGroupMemberInput('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const addMember = (
    memberList: string[],
    setMemberList: React.Dispatch<React.SetStateAction<string[]>>,
    input: string,
    setInput: React.Dispatch<React.SetStateAction<string>>
  ) => {
    if (input.trim() && !memberList.includes(input.trim())) {
      setMemberList([...memberList, input.trim()]);
      setInput('');
    }
  };

  const removeMember = (
    memberList: string[],
    setMemberList: React.Dispatch<React.SetStateAction<string[]>>,
    member: string
  ) => {
    setMemberList(memberList.filter((m) => m !== member));
  };

  const handleCreateChatRoom = async () => {
    if (!chatRoomMembers.length && chatRoomType === 'direct') {
      addNotification({
        title: 'Error',
        message: i18n.t('im.create_room_modal.k0'),
        type: 'error',
      });
      return;
    }

    setLoading(true);
    try {
      const members =
        chatRoomType === 'direct'
          ? [currentUserId, ...chatRoomMembers]
          : [currentUserId, ...chatRoomMembers];

      const request: CreateChatRoomRequest = {
        name: chatRoomName || undefined,
        room_type: chatRoomType,
        members,
        created_by: currentUserId,
      };

      const response = await imApi.createChatRoom(request);
      if (response.success) {
        addNotification({
          title: 'Success',
          message: i18n.t('im.create_room_modal.k1'),
          type: 'success',
        });
        onCreated();
        handleClose();
      } else {
        addNotification({
          title: 'Error',
          message: response.message || i18n.t('im.create_room_modal.k2'),
          type: 'error',
        });
      }
    } catch (error: unknown) {
      logger.error('Failed to create chat room:', error);
      addNotification({
        title: 'Error',
        message: i18n.t('im.create_room_modal.k3'),
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProjectGroup = async () => {
    if (!groupName.trim()) {
      addNotification({
        title: 'Error',
        message: i18n.t('im.create_room_modal.k4'),
        type: 'error',
      });
      return;
    }

    setLoading(true);
    try {
      const request: CreateProjectGroupRequest = {
        name: groupName,
        description: groupDescription || undefined,
        members: [currentUserId, ...groupMembers],
        created_by: currentUserId,
      };

      const response = await imApi.createProjectGroup(request);
      if (response.success) {
        addNotification({
          title: 'Success',
          message: i18n.t('im.create_room_modal.k5'),
          type: 'success',
        });
        onCreated();
        handleClose();
      } else {
        addNotification({
          title: 'Error',
          message: response.message || i18n.t('im.create_room_modal.k6'),
          type: 'error',
        });
      }
    } catch (error: unknown) {
      logger.error('Failed to create project group:', error);
      addNotification({
        title: 'Error',
        message: i18n.t('im.create_room_modal.k7'),
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      maxWidth='sm'
      fullWidth
    >
      <DialogContent sx={{ maxWidth: 500 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 2,
          }}
        >
          <DialogTitle sx={{ m: 0, p: 0 }}>{i18n.t('im.create_room_modal.k8')}</DialogTitle>
          <Button
            variant='text'
            size='small'
            onClick={handleClose}
          >
            <X sx={{ width: 16, height: 16 }} />
          </Button>
        </Box>

        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v as 'chat' | 'group')}
          variant='fullWidth'
        >
          <Tab
            value='chat'
            icon={<MessageSquare sx={{ width: 16, height: 16 }} />}
            iconPosition='start'
            label={i18n.t('im.create_room_modal.k9')}
          />
          <Tab
            value='group'
            icon={<Users sx={{ width: 16, height: 16 }} />}
            iconPosition='start'
            label={i18n.t('im.create_room_modal.k10')}
          />
        </Tabs>

        {activeTab === 'chat' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: 'var(--mui-palette-text-secondary)',
                }}
              >
                {i18n.t('components.create_room_modal.k0')}
              </span>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant={chatRoomType === 'direct' ? 'contained' : 'outlined'}
                  onClick={() => setChatRoomType('direct')}
                  size='small'
                  startIcon={<User sx={{ width: 16, height: 16 }} />}
                >
                  {i18n.t('components.create_room_modal.k1')}
                </Button>
                <Button
                  variant={chatRoomType === 'group' ? 'contained' : 'outlined'}
                  onClick={() => setChatRoomType('group')}
                  size='small'
                  startIcon={<Users sx={{ width: 16, height: 16 }} />}
                >
                  {i18n.t('components.create_room_modal.k2')}
                </Button>
              </Box>
            </Box>

            <TextField
              size='small'
              placeholder={chatRoomType === 'direct' ? i18n.t('im.create_room_modal.k12') : i18n.t('im.create_room_modal.k11')}
              value={chatRoomName}
              onChange={(e) => setChatRoomName(e.target.value)}
              label={i18n.t('im.create_room_modal.k13')}
              helperText={chatRoomType === 'direct' ? i18n.t('components.create_room_modal.k0') : ''}
            />

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: 'var(--mui-palette-text-secondary)',
                }}
              >
                {i18n.t('components.create_room_modal.k3')}
              </span>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  size='small'
                  placeholder={i18n.t('im.create_room_modal.id_14')}
                  value={newMemberInput}
                  onChange={(e) => setNewMemberInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      addMember(
                        chatRoomMembers,
                        setChatRoomMembers,
                        newMemberInput,
                        setNewMemberInput
                      );
                    }
                  }}
                  sx={{ flex: 1 }}
                />
                <Button
                  onClick={() =>
                    addMember(
                      chatRoomMembers,
                      setChatRoomMembers,
                      newMemberInput,
                      setNewMemberInput
                    )
                  }
                  variant='contained'
                  size='small'
                >
                  {i18n.t('components.create_room_modal.k4')}
                </Button>
              </Box>
              {chatRoomMembers.length > 0 && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                  {chatRoomMembers.map((member, idx) => (
                    <Box
                      key={idx}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        px: 1.5,
                        py: 0.5,
                        bgcolor: 'grey.100',
                        borderRadius: 'full',
                      }}
                    >
                      <span style={{ fontSize: 14 }}>{member}</span>
                      <button
                        onClick={() => removeMember(chatRoomMembers, setChatRoomMembers, member)}
                        style={{
                          color: theme.palette.text.secondary,
                          backgroundColor: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        <X sx={{ width: 12, height: 12 }} />
                      </button>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>

            <DialogActions sx={{ px: 0 }}>
              <Button
                onClick={handleCreateChatRoom}
                disabled={loading}
                variant='contained'
                startIcon={<Save sx={{ width: 16, height: 16 }} />}
              >
                {loading ? i18n.t('components.create_room_modal.k1') : i18n.t('im.create_room_modal.k15')}
              </Button>
            </DialogActions>
          </Box>
        )}

        {activeTab === 'group' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 2 }}>
            <TextField
              size='small'
              placeholder={i18n.t('im.create_room_modal.k16')}
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              label={i18n.t('im.create_room_modal.k17')}
            />

            <TextField
              size='small'
              placeholder={i18n.t('im.create_room_modal.k18')}
              value={groupDescription}
              onChange={(e) => setGroupDescription(e.target.value)}
              label={i18n.t('im.create_room_modal.k19')}
              multiline
              rows={3}
            />

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: 'var(--mui-palette-text-secondary)',
                }}
              >
                {i18n.t('components.create_room_modal.k5')}
              </span>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  size='small'
                  placeholder={i18n.t('im.create_room_modal.id_20')}
                  value={newGroupMemberInput}
                  onChange={(e) => setNewGroupMemberInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      addMember(
                        groupMembers,
                        setGroupMembers,
                        newGroupMemberInput,
                        setNewGroupMemberInput
                      );
                    }
                  }}
                  sx={{ flex: 1 }}
                />
                <Button
                  onClick={() =>
                    addMember(
                      groupMembers,
                      setGroupMembers,
                      newGroupMemberInput,
                      setNewGroupMemberInput
                    )
                  }
                  variant='contained'
                  size='small'
                >
                  {i18n.t('components.create_room_modal.k6')}
                </Button>
              </Box>
              {groupMembers.length > 0 && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                  {groupMembers.map((member, idx) => (
                    <Box
                      key={idx}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        px: 1.5,
                        py: 0.5,
                        bgcolor: 'grey.100',
                        borderRadius: 'full',
                      }}
                    >
                      <span style={{ fontSize: 14 }}>{member}</span>
                      <button
                        onClick={() => removeMember(groupMembers, setGroupMembers, member)}
                        style={{
                          color: theme.palette.text.secondary,
                          backgroundColor: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        <X sx={{ width: 12, height: 12 }} />
                      </button>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>

            <DialogActions sx={{ px: 0 }}>
              <Button
                onClick={handleCreateProjectGroup}
                disabled={loading}
                variant='contained'
                startIcon={<Save sx={{ width: 16, height: 16 }} />}
              >
                {loading ? i18n.t('components.create_room_modal.k2') : i18n.t('im.create_room_modal.k21')}
              </Button>
            </DialogActions>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};
