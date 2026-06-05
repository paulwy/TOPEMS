import React, { useState, useEffect } from 'react';
import { User, Search, Plus, Users, ChevronRight, MoreVertical, Check, X } from 'lucide-react';
import { imApi, Friend, ContactGroup } from '../../api/im';
import { useAppStore } from '../../store';

interface ContactListProps {
  onSelectContact?: (friend: Friend) => void;
}

export const ContactList: React.FC<ContactListProps> = ({ onSelectContact }) => {
  const addNotification = useAppStore((state) => state.addNotification);
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
    } catch (error) {
      console.error('Failed to load friends:', error);
    }
  };

  const loadGroups = async () => {
    try {
      const userId = 'current-user';
      const response = await imApi.listContactGroups(userId);
      if (response.success && response.data) {
        setGroups(response.data.groups || []);
      }
    } catch (error) {
      console.error('Failed to load groups:', error);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;

    try {
      const userId = 'current-user';
      const response = await imApi.createContactGroup(userId, { name: newGroupName });
      if (response.success) {
        addNotification({ title: '成功', message: '分组创建成功', type: 'success' });
        setNewGroupName('');
        setShowAddModal(false);
        loadGroups();
      }
    } catch (error) {
      console.error('Failed to create group:', error);
      addNotification({ title: '失败', message: '分组创建失败', type: 'error' });
    }
  };

  const handleAcceptFriend = async (friend: Friend) => {
    try {
      const userId = 'current-user';
      const response = await imApi.acceptFriendRequest(userId, friend.friend_id);
      if (response.success) {
        addNotification({ title: '成功', message: '已接受好友请求', type: 'success' });
        loadFriends();
      }
    } catch (error) {
      console.error('Failed to accept friend:', error);
    }
  };

  const handleRejectFriend = async (friend: Friend) => {
    try {
      const userId = 'current-user';
      const response = await imApi.rejectFriendRequest(userId, friend.friend_id);
      if (response.success) {
        addNotification({ title: '成功', message: '已拒绝好友请求', type: 'success' });
        loadFriends();
      }
    } catch (error) {
      console.error('Failed to reject friend:', error);
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    if (!confirm('确定要删除这个好友吗？')) return;

    try {
      const userId = 'current-user';
      const response = await imApi.removeFriend(userId, friendId);
      if (response.success) {
        addNotification({ title: '成功', message: '好友已删除', type: 'success' });
        setShowFriendMenu(false);
        setSelectedFriend(null);
        loadFriends();
      }
    } catch (error) {
      console.error('Failed to remove friend:', error);
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
    <div className="flex-1 flex flex-col">
      {/* Search */}
      <div className="p-3 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索联系人..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-100 border-none rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('all')}
          className={`flex-1 py-2 text-sm font-medium transition-colors ${
            activeTab === 'all' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          全部 ({friends.length})
        </button>
        <button
          onClick={() => setActiveTab('friends')}
          className={`flex-1 py-2 text-sm font-medium transition-colors ${
            activeTab === 'friends' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          好友 ({acceptedFriends.length})
        </button>
        <button
          onClick={() => setActiveTab('groups')}
          className={`flex-1 py-2 text-sm font-medium transition-colors ${
            activeTab === 'groups' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          分组 ({groups.length})
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Pending Requests */}
        {activeTab !== 'groups' && pendingRequests.length > 0 && (
          <div className="p-2">
            <div className="text-xs text-gray-500 px-2 py-1">待处理请求</div>
            {pendingRequests.map((friend) => (
              <div
                key={friend.id}
                className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg mx-1"
              >
                <div className="flex items-center gap-3" onClick={() => onSelectContact?.(friend)}>
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                    <User className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{friend.friend_name}</div>
                    <div className="text-xs text-gray-500">等待通过</div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleAcceptFriend(friend)}
                    className="p-1.5 rounded-full bg-green-100 text-green-600 hover:bg-green-200 transition-colors"
                    title="接受"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleRejectFriend(friend)}
                    className="p-1.5 rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                    title="拒绝"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Friends List */}
        {activeTab !== 'groups' && filteredFriends.length > 0 && (
          <div className="p-2">
            <div className="text-xs text-gray-500 px-2 py-1">好友</div>
            {filteredFriends
              .filter((f) => f.status === 'accepted')
              .map((friend) => (
                <div
                  key={friend.id}
                  className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg mx-1 cursor-pointer relative"
                >
                  <div className="flex items-center gap-3" onClick={() => onSelectContact?.(friend)}>
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                        <User className="w-5 h-5 text-indigo-600" />
                      </div>
                      {friend.is_online && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></span>
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{friend.friend_name}</div>
                      <div className="text-xs text-gray-500">
                        {friend.is_online ? '在线' : friend.last_seen ? `最后活跃: ${new Date(friend.last_seen).toLocaleString()}` : '离线'}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFriend(friend);
                      setShowFriendMenu(!showFriendMenu);
                    }}
                    className="p-1.5 rounded-full hover:bg-gray-200 transition-colors"
                  >
                    <MoreVertical className="w-4 h-4 text-gray-400" />
                  </button>
                  {showFriendMenu && selectedFriend?.id === friend.id && (
                    <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 min-w-[120px]">
                      <button
                        onClick={() => handleRemoveFriend(friend.friend_id)}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-50"
                      >
                        删除好友
                      </button>
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}

        {/* Contact Groups */}
        {activeTab === 'groups' && (
          <div className="p-2">
            {groups.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">暂无分组</p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="mt-2 text-indigo-600 text-sm hover:text-indigo-700"
                >
                  创建分组
                </button>
              </div>
            ) : (
              groups.map((group) => (
                <div
                  key={group.id}
                  className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg mx-1 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                      <Users className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{group.name}</div>
                      <div className="text-xs text-gray-500">0 位联系人</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              ))
            )}
          </div>
        )}

        {/* Empty State */}
        {activeTab !== 'groups' && filteredFriends.length === 0 && pendingRequests.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <User className="w-16 h-16 text-gray-300 mb-4" />
            <p className="text-sm">暂无联系人</p>
          </div>
        )}
      </div>

      {/* Add Button */}
      {activeTab === 'groups' && (
        <div className="p-3 border-t border-gray-200">
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full flex items-center justify-center gap-2 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">创建分组</span>
          </button>
        </div>
      )}

      {/* Add Group Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 w-full max-w-sm mx-4">
            <h3 className="font-medium text-gray-900 mb-4">创建分组</h3>
            <input
              type="text"
              placeholder="分组名称"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleCreateGroup}
                className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};