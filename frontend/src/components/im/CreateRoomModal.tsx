import React, { useState } from 'react';
import { X, Users, User, Save, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { imApi, type CreateChatRoomRequest, type CreateProjectGroupRequest } from '../../api/im';
import { useAppStore } from '../../store';

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
  const addNotification = useAppStore((state) => state.addNotification);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'group'>('chat');

  // Chat room form state
  const [chatRoomName, setChatRoomName] = useState('');
  const [chatRoomType, setChatRoomType] = useState<'direct' | 'group'>('direct');
  const [chatRoomMembers, setChatRoomMembers] = useState<string[]>([]);
  const [newMemberInput, setNewMemberInput] = useState('');

  // Project group form state
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
        message: '请至少添加一位成员',
        type: 'error',
      });
      return;
    }

    setLoading(true);
    try {
      const members =
        chatRoomType === 'direct' ? [currentUserId, ...chatRoomMembers] : [currentUserId, ...chatRoomMembers];

      const request: CreateChatRoomRequest = {
        name: chatRoomName || undefined,
        room_type: chatRoomType,
        members: members,
        created_by: currentUserId,
      };

      const response = await imApi.createChatRoom(request);
      if (response.success) {
        addNotification({
          title: 'Success',
          message: '聊天室创建成功',
          type: 'success',
        });
        onCreated();
        handleClose();
      } else {
        addNotification({
          title: 'Error',
          message: response.message || '创建聊天室失败',
          type: 'error',
        });
      }
    } catch (error) {
      console.error('Failed to create chat room:', error);
      addNotification({
        title: 'Error',
        message: '创建聊天室失败',
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
        message: '请输入群组名称',
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
          message: '项目群组创建成功',
          type: 'success',
        });
        onCreated();
        handleClose();
      } else {
        addNotification({
          title: 'Error',
          message: response.message || '创建群组失败',
          type: 'error',
        });
      }
    } catch (error) {
      console.error('Failed to create project group:', error);
      addNotification({
        title: 'Error',
        message: '创建群组失败',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className='sm:max-w-[500px]'>
        <DialogHeader>
          <DialogTitle className='flex items-center justify-between'>
            <span>创建新会话</span>
            <Button variant='ghost' size='sm' onClick={handleClose}>
              <X className='w-4 h-4' />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'chat' | 'group')}>
          <TabsList className='grid w-full grid-cols-2'>
            <TabsTrigger value='chat' className='flex items-center gap-2'>
              <MessageSquare className='w-4 h-4' />
              聊天室
            </TabsTrigger>
            <TabsTrigger value='group' className='flex items-center gap-2'>
              <Users className='w-4 h-4' />
              项目群组
            </TabsTrigger>
          </TabsList>

          <TabsContent value='chat' className='space-y-4 py-4'>
            <div className='space-y-2'>
              <label className='text-sm font-medium text-gray-700'>聊天室类型</label>
              <div className='flex gap-2'>
                <Button
                  variant={chatRoomType === 'direct' ? 'default' : 'secondary'}
                  onClick={() => setChatRoomType('direct')}
                  className='flex items-center gap-2'
                  size='sm'
                >
                  <User className='w-4 h-4' />
                  私聊
                </Button>
                <Button
                  variant={chatRoomType === 'group' ? 'default' : 'secondary'}
                  onClick={() => setChatRoomType('group')}
                  className='flex items-center gap-2'
                  size='sm'
                >
                  <Users className='w-4 h-4' />
                  群聊
                </Button>
              </div>
            </div>

            <div className='space-y-2'>
              <label className='text-sm font-medium text-gray-700'>
                名称 {chatRoomType === 'direct' ? '(可选)' : ''}
              </label>
              <Input
                placeholder={chatRoomType === 'direct' ? '输入聊天室名称（可选）' : '输入群组名称'}
                value={chatRoomName}
                onChange={(e) => setChatRoomName(e.target.value)}
              />
            </div>

            <div className='space-y-2'>
              <label className='text-sm font-medium text-gray-700'>添加成员</label>
              <div className='flex gap-2'>
                <Input
                  placeholder='输入用户ID'
                  value={newMemberInput}
                  onChange={(e) => setNewMemberInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      addMember(chatRoomMembers, setChatRoomMembers, newMemberInput, setNewMemberInput);
                    }
                  }}
                />
                <Button
                  onClick={() => addMember(chatRoomMembers, setChatRoomMembers, newMemberInput, setNewMemberInput)}
                >
                  添加
                </Button>
              </div>
              {chatRoomMembers.length > 0 && (
                <div className='flex flex-wrap gap-2 mt-2'>
                  {chatRoomMembers.map((member, idx) => (
                    <span
                      key={idx}
                      className='inline-flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full text-sm'
                    >
                      {member}
                      <button
                        onClick={() => removeMember(chatRoomMembers, setChatRoomMembers, member)}
                        className='text-gray-500 hover:text-gray-700'
                      >
                        <X className='w-3 h-3' />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button onClick={handleCreateChatRoom} disabled={loading} className='flex items-center gap-2'>
                <Save className='w-4 h-4' />
                {loading ? '创建中...' : '创建聊天室'}
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value='group' className='space-y-4 py-4'>
            <div className='space-y-2'>
              <label className='text-sm font-medium text-gray-700'>群组名称</label>
              <Input placeholder='输入群组名称' value={groupName} onChange={(e) => setGroupName(e.target.value)} />
            </div>

            <div className='space-y-2'>
              <label className='text-sm font-medium text-gray-700'>群组描述</label>
              <Textarea
                placeholder='输入群组描述（可选）'
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className='space-y-2'>
              <label className='text-sm font-medium text-gray-700'>添加成员</label>
              <div className='flex gap-2'>
                <Input
                  placeholder='输入用户ID'
                  value={newGroupMemberInput}
                  onChange={(e) => setNewGroupMemberInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      addMember(groupMembers, setGroupMembers, newGroupMemberInput, setNewGroupMemberInput);
                    }
                  }}
                />
                <Button
                  onClick={() => addMember(groupMembers, setGroupMembers, newGroupMemberInput, setNewGroupMemberInput)}
                >
                  添加
                </Button>
              </div>
              {groupMembers.length > 0 && (
                <div className='flex flex-wrap gap-2 mt-2'>
                  {groupMembers.map((member, idx) => (
                    <span
                      key={idx}
                      className='inline-flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full text-sm'
                    >
                      {member}
                      <button
                        onClick={() => removeMember(groupMembers, setGroupMembers, member)}
                        className='text-gray-500 hover:text-gray-700'
                      >
                        <X className='w-3 h-3' />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button onClick={handleCreateProjectGroup} disabled={loading} className='flex items-center gap-2'>
                <Save className='w-4 h-4' />
                {loading ? '创建中...' : '创建群组'}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
