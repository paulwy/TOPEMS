import React, { useEffect, useState } from 'react';
import { 
  MessageSquare, Plus, Search, ChevronRight, 
  Users, Bell, Send, FileText, Loader2, X, Edit, Trash2, Check
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { 
  imApi, 
  ChatRoom, 
  ChatMessage, 
  ProjectGroup,
  Notification,
  CreateChatRoomRequest,
  CreateChatMessageRequest,
  CreateProjectGroupRequest,
  CreateNotificationRequest
} from '../api/im';

type TabType = 'chatRooms' | 'projectGroups' | 'notifications';

type ModalType = 'create' | 'edit' | null;

const Impage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('chatRooms');
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [projectGroups, setProjectGroups] = useState<ProjectGroup[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<{[key: string]: string}>();
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedChatRoom, setSelectedChatRoom] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'chatRooms') {
        const response = await imApi.listChatRooms();
        if (response.success && response.data) {
          let data: any = response.data;
          let rawItems: any[] = [];
          if (Array.isArray(data)) {
            rawItems = data;
          } else if (data.chat_rooms && Array.isArray(data.chat_rooms)) {
            rawItems = data.chat_rooms;
          } else if (data.chatRooms && Array.isArray(data.chatRooms)) {
            rawItems = data.chatRooms;
          }
          setChatRooms(rawItems);
        } else {
          setChatRooms([]);
        }
      } else if (activeTab === 'projectGroups') {
        const response = await imApi.listProjectGroups();
        if (response.success && response.data) {
          let data: any = response.data;
          let rawItems: any[] = [];
          if (Array.isArray(data)) {
            rawItems = data;
          } else if (data.project_groups && Array.isArray(data.project_groups)) {
            rawItems = data.project_groups;
          } else if (data.projectGroups && Array.isArray(data.projectGroups)) {
            rawItems = data.projectGroups;
          }
          setProjectGroups(rawItems);
        } else {
          setProjectGroups([]);
        }
      } else if (activeTab === 'notifications') {
        const response = await imApi.listNotifications('current-user');
        if (response.success && response.data) {
          let data: any = response.data;
          let rawItems: any[] = [];
          if (Array.isArray(data)) {
            rawItems = data;
          } else if (data.notifications && Array.isArray(data.notifications)) {
            rawItems = data.notifications;
          }
          setNotifications(rawItems);
        } else {
          setNotifications([]);
        }
      }
    } catch (err) {
      console.error('加载数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadChatMessages = async (chatRoomId: string) => {
    try {
      const response = await imApi.listChatMessages(chatRoomId);
      if (response.success && response.data) {
        let data: any = response.data;
        let rawItems: any[] = [];
        if (Array.isArray(data)) {
          rawItems = data;
        } else if (data.chat_messages && Array.isArray(data.chat_messages)) {
          rawItems = data.chat_messages;
        } else if (data.chatMessages && Array.isArray(data.chatMessages)) {
          rawItems = data.chatMessages;
        }
        setChatMessages(rawItems);
      } else {
        setChatMessages([]);
      }
    } catch (err) {
      console.error('加载消息失败:', err);
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const resetModal = () => {
    setShowModal(false);
    setModalType(null);
    setEditingItem(null);
    setFormData({});
  };

  const handleCreate = async () => {
    try {
      if (activeTab === 'chatRooms') {
        const req: CreateChatRoomRequest = {
          name: formData.name,
          room_type: formData.room_type || 'group',
          members: formData.members ? formData.members.split(',').map(m => m.trim()) : [],
          created_by: 'current-user'
        };
        await imApi.createChatRoom(req);
      } else if (activeTab === 'projectGroups') {
        const req: CreateProjectGroupRequest = {
          name: formData.name || '',
          description: formData.description,
          project_id: formData.project_id,
          members: formData.members ? formData.members.split(',').map(m => m.trim()) : [],
          created_by: 'current-user'
        };
        await imApi.createProjectGroup(req);
      } else if (activeTab === 'notifications') {
        const req: CreateNotificationRequest = {
          user_id: formData.user_id || '',
          title: formData.title || '',
          content: formData.content || '',
          notification_type: formData.notification_type || 'info',
          related_id: formData.related_id,
          related_type: formData.related_type
        };
        await imApi.createNotification(req);
      }
      showNotification('success', '创建成功');
      resetModal();
      loadData();
    } catch (err) {
      showNotification('error', '创建失败');
      console.error('创建失败:', err);
    }
  };

  const handleMarkNotificationRead = async (id: string) => {
    try {
      await imApi.markNotificationRead(id);
      showNotification('success', '已标记为已读');
      loadData();
    } catch (err) {
      showNotification('error', '标记失败');
      console.error('标记失败:', err);
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    try {
      await imApi.markAllNotificationsRead('current-user');
      showNotification('success', '全部已标记为已读');
      loadData();
    } catch (err) {
      showNotification('error', '标记失败');
      console.error('标记失败:', err);
    }
  };

  const safeChatRooms = Array.isArray(chatRooms) ? chatRooms : [];
  const safeProjectGroups = Array.isArray(projectGroups) ? projectGroups : [];
  const safeNotifications = Array.isArray(notifications) ? notifications : [];

  const openCreateModal = () => {
    setModalType('create');
    setFormData({});
    setShowModal(true);
  };

  const openEditModal = (item: any) => {
    setModalType('edit');
    setEditingItem(item);
    setFormData({
      ...item
    });
    setShowModal(true);
  };

  const tabs = [
    { id: 'chatRooms', label: '聊天会话', icon: MessageSquare },
    { id: 'projectGroups', label: '项目群组', icon: Users },
    { id: 'notifications', label: '消息通知', icon: Bell }
  ];

  const getCurrentData = () => {
    switch (activeTab) {
      case 'chatRooms': return safeChatRooms;
      case 'projectGroups': return safeProjectGroups;
      case 'notifications': return safeNotifications;
      default: return [];
    }
  };

  const filteredData = getCurrentData().filter((item: any) => {
    const searchFields = Object.values(item).filter(v => typeof v === 'string').join(' ').toLowerCase();
    return searchFields.includes(searchTerm.toLowerCase());
  });

  const getStatusColor = (status: string) => {
    if (!status) return 'bg-gray-100 text-gray-800';
    const s = status.toLowerCase();
    if (s.includes('active') || s.includes('已读')) return 'bg-green-100 text-green-800';
    if (s.includes('pending') || s.includes('未读')) return 'bg-yellow-100 text-yellow-800';
    if (s.includes('inactive')) return 'bg-gray-100 text-gray-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/dashboard')} 
              className="text-gray-500 hover:text-gray-700"
            >
              <ChevronRight className="w-6 h-6 rotate-180" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">即时通讯</h1>
              <p className="text-gray-500">管理聊天会话、项目群组和消息通知</p>
            </div>
          </div>
          <div className="flex gap-2">
            {activeTab === 'notifications' && (
              <button 
                onClick={handleMarkAllNotificationsRead}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Check className="w-5 h-5" />
                全部已读
              </button>
            )}
            <button 
              onClick={openCreateModal}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              新建
            </button>
          </div>
        </div>

        <div className="flex gap-2 mb-6 border-b border-gray-200">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 px-6 py-3 border-b-2 transition-colors ${
                  activeTab === tab.id 
                    ? 'border-indigo-600 text-indigo-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="搜索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {activeTab === 'chatRooms' && (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">名称</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">类型</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">成员数</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">最后消息</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">最后消息时间</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                    </>
                  )}
                  {activeTab === 'projectGroups' && (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">名称</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">描述</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">成员数</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">创建人</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">创建时间</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                    </>
                  )}
                  {activeTab === 'notifications' && (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">标题</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">内容</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">类型</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">时间</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredData.map((item: any) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    {activeTab === 'chatRooms' && (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.name || '未命名会话'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.room_type}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.members?.length || 0}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.last_message}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.last_message_time ? new Date(item.last_message_time).toLocaleString() : ''}
                        </td>
                      </>
                    )}
                    {activeTab === 'projectGroups' && (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.description}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.members?.length || 0}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.created_by}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.created_at ? new Date(item.created_at).toLocaleString() : ''}
                        </td>
                      </>
                    )}
                    {activeTab === 'notifications' && (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.title}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.content}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.notification_type}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            item.is_read ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {item.is_read ? '已读' : '未读'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.created_at ? new Date(item.created_at).toLocaleString() : ''}
                        </td>
                      </>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        {activeTab === 'chatRooms' && (
                          <button 
                            onClick={() => {
                              setSelectedChatRoom(item.id);
                              loadChatMessages(item.id);
                            }}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                        )}
                        {activeTab === 'notifications' && !item.is_read && (
                          <button 
                            onClick={() => handleMarkNotificationRead(item.id)}
                            className="text-green-600 hover:text-green-900"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredData.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">暂无数据</p>
              </div>
            )}
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {modalType === 'create' ? '新建' : '编辑'}
                </h3>
                <button onClick={resetModal} className="text-gray-400 hover:text-gray-500">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                {activeTab === 'chatRooms' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">名称</label>
                      <input 
                        type="text" 
                        value={formData.name || ''}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">类型</label>
                      <select 
                        value={formData.room_type || ''}
                        onChange={(e) => setFormData({...formData, room_type: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="private">私聊</option>
                        <option value="group">群组</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">成员（逗号分隔）</label>
                      <input 
                        type="text" 
                        value={formData.members || ''}
                        onChange={(e) => setFormData({...formData, members: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="user1, user2, user3"
                      />
                    </div>
                  </>
                )}

                {activeTab === 'projectGroups' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">名称</label>
                      <input 
                        type="text" 
                        value={formData.name || ''}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                      <textarea 
                        value={formData.description || ''}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        rows={3}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">项目ID</label>
                      <input 
                        type="text" 
                        value={formData.project_id || ''}
                        onChange={(e) => setFormData({...formData, project_id: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">成员（逗号分隔）</label>
                      <input 
                        type="text" 
                        value={formData.members || ''}
                        onChange={(e) => setFormData({...formData, members: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="user1, user2, user3"
                      />
                    </div>
                  </>
                )}

                {activeTab === 'notifications' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">用户ID</label>
                      <input 
                        type="text" 
                        value={formData.user_id || ''}
                        onChange={(e) => setFormData({...formData, user_id: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">标题</label>
                      <input 
                        type="text" 
                        value={formData.title || ''}
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">内容</label>
                      <textarea 
                        value={formData.content || ''}
                        onChange={(e) => setFormData({...formData, content: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        rows={3}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">类型</label>
                      <select 
                        value={formData.notification_type || ''}
                        onChange={(e) => setFormData({...formData, notification_type: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="info">信息</option>
                        <option value="warning">警告</option>
                        <option value="error">错误</option>
                        <option value="success">成功</option>
                      </select>
                    </div>
                  </>
                )}
              </div>
              <div className="px-6 py-4 border-t border-gray-200 flex gap-3 justify-end">
                <button 
                  onClick={resetModal}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  取消
                </button>
                <button 
                  onClick={modalType === 'create' ? handleCreate : handleCreate}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  {modalType === 'create' ? '创建' : '保存'}
                </button>
              </div>
            </div>
          </div>
        )}

        {notification && (
          <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg ${
            notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
          }`}>
            {notification.message}
          </div>
        )}
      </div>
    </div>
  );
};

export default Impage;
