import React, { useEffect, useState } from 'react';
import { announcementApi, type Announcement } from '../api/erp';

const AnnouncementsPage: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [formData, setFormData] = useState<Partial<Announcement>>({
    title: '',
    content: '',
    priority: 'normal',
    is_published: true,
  });

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const response = await announcementApi.list();
      if (response.success && response.data) {
        setAnnouncements(response.data.items || []);
      }
    } catch (err) {
      setError('获取公告列表失败');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingAnnouncement) {
        await announcementApi.update(editingAnnouncement.id, formData);
      } else {
        await announcementApi.create(formData);
      }
      setShowModal(false);
      setEditingAnnouncement(null);
      fetchAnnouncements();
    } catch (err) {
      console.error('操作失败', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个公告吗？')) return;
    try {
      await announcementApi.delete(id);
      fetchAnnouncements();
    } catch (err) {
      console.error('删除失败', err);
    }
  };

  const getPriorityBadge = (priority?: string) => {
    const colors: Record<string, string> = {
      high: 'bg-red-100 text-red-800',
      normal: 'bg-blue-100 text-blue-800',
      low: 'bg-gray-100 text-gray-800',
    };
    const labels: Record<string, string> = {
      high: '高',
      normal: '普通',
      low: '低',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[priority || 'normal']}`}>
        {labels[priority || 'normal'] || priority}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">公告管理</h1>
        <button
          onClick={() => {
            setEditingAnnouncement(null);
            setFormData({
              title: '',
              content: '',
              priority: 'normal',
              is_published: true,
            });
            setShowModal(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          发布公告
        </button>
      </div>

      <div className="space-y-4">
        {announcements.map((announcement) => (
          <div key={announcement.id} className="bg-white shadow-md rounded-lg p-6 border border-gray-200">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-medium text-gray-900">{announcement.title}</h3>
                {getPriorityBadge(announcement.priority)}
                {!announcement.is_published && (
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                    草稿
                  </span>
                )}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    setEditingAnnouncement(announcement);
                    setFormData(announcement);
                    setShowModal(true);
                  }}
                  className="text-blue-600 hover:text-blue-900 text-sm"
                >
                  编辑
                </button>
                <button
                  onClick={() => handleDelete(announcement.id)}
                  className="text-red-600 hover:text-red-900 text-sm"
                >
                  删除
                </button>
              </div>
            </div>
            <p className="text-gray-600 whitespace-pre-wrap mb-3">{announcement.content}</p>
            <div className="flex justify-between items-center text-sm text-gray-500">
              <span>发布人：{announcement.published_by || '未知'}</span>
              <span>{new Date(announcement.created_at).toLocaleString()}</span>
            </div>
          </div>
        ))}
        {announcements.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow-md">
            <p className="text-gray-500">暂无公告</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{editingAnnouncement ? '编辑公告' : '发布公告'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">标题 *</label>
                <input
                  type="text"
                  required
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">内容 *</label>
                <textarea
                  required
                  value={formData.content || ''}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">优先级</label>
                  <select
                    value={formData.priority || 'normal'}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="high">高</option>
                    <option value="normal">普通</option>
                    <option value="low">低</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                  <select
                    value={formData.is_published ? 'published' : 'draft'}
                    onChange={(e) => setFormData({ ...formData, is_published: e.target.value === 'published' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="published">发布</option>
                    <option value="draft">保存为草稿</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnnouncementsPage;
