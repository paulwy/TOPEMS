import React, { useState, useEffect } from "react";
import {
  Archive,
  ChevronLeft,
  Search,
  Loader2,
  RefreshCw,
  Settings,
  Trash2,
  RotateCcw,
  Eye,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import type {
  ArchiveConfig,
  ArchivedNotification,
  NotificationTypeEnum,
} from "../api/notification";
import {
  getArchivedNotifications,
  getArchiveConfig,
  updateArchiveConfig,
  runAutoArchive,
} from "../api/notification";
import { useNotification } from "../hooks/useNotification";
import { NotificationContainer } from "../components/NotificationContainer";

const NotificationArchivePage: React.FC = () => {
  const navigate = useNavigate();
  const { success, error, notifications, hideNotification } = useNotification();

  const [archivedNotifications, setArchivedNotifications] = useState<
    ArchivedNotification[]
  >([]);
  const [archiveConfig, setArchiveConfig] = useState<ArchiveConfig | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [selectedNotification, setSelectedNotification] =
    useState<ArchivedNotification | null>(null);

  useEffect(() => {
    loadData();
  }, [page]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [archivedRes, configRes] = await Promise.all([
        getArchivedNotifications(page, 20),
        getArchiveConfig(),
      ]);

      if (archivedRes.success && archivedRes.data) {
        setArchivedNotifications(archivedRes.data.notifications || []);
        setTotal(archivedRes.data.total);
      }
      if (configRes.success && configRes.data) {
        setArchiveConfig(configRes.data);
      }
    } catch (err) {
      console.error("Error loading data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateConfig = async (config: ArchiveConfig) => {
    try {
      const res = await updateArchiveConfig(config);
      if (res.success) {
        success("归档配置更新成功");
        setShowConfigModal(false);
        loadData();
      } else {
        error(res.message || "更新失败");
      }
    } catch (err: any) {
      error(err.message || "更新失败");
    }
  };

  const handleRunAutoArchive = async () => {
    try {
      const res = await runAutoArchive();
      if (res.success) {
        success(
          `自动归档执行成功，已归档 ${res.data?.archived_count || 0} 条通知`,
        );
        loadData();
      } else {
        error(res.message || "执行失败");
      }
    } catch (err: any) {
      error(err.message || "执行失败");
    }
  };

  const filteredNotifications = archivedNotifications.filter(
    (n) =>
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.content.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const getTypeLabel = (type: NotificationTypeEnum) => {
    const labels: Record<NotificationTypeEnum, string> = {
      system: "系统通知",
      workflow: "审批通知",
      reminder: "提醒通知",
      alert: "告警通知",
      message: "消息通知",
      info: "信息通知",
      success: "成功通知",
      warning: "警告通知",
      error: "错误通知",
    };
    return labels[type] || type;
  };

  const getTypeColor = (type: NotificationTypeEnum) => {
    const colors: Record<NotificationTypeEnum, string> = {
      system: "bg-blue-100 text-blue-700",
      workflow: "bg-purple-100 text-purple-700",
      reminder: "bg-yellow-100 text-yellow-700",
      alert: "bg-red-100 text-red-700",
      message: "bg-green-100 text-green-700",
      info: "bg-cyan-100 text-cyan-700",
      success: "bg-emerald-100 text-emerald-700",
      warning: "bg-orange-100 text-orange-700",
      error: "bg-rose-100 text-rose-700",
    };
    return colors[type] || "bg-gray-100 text-gray-700";
  };

  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <div className="min-h-screen bg-gray-50">
      <NotificationContainer
        notifications={notifications}
        onClose={hideNotification}
      />

      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate("/notifications")}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                  <Archive className="w-7 h-7 mr-3 text-orange-600" />
                  通知归档管理
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  查看和管理已归档的通知
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={loadData}
                className="flex items-center px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <RefreshCw className="w-5 h-5 mr-2" />
                刷新
              </button>
              <button
                onClick={handleRunAutoArchive}
                className="flex items-center px-4 py-2 text-orange-700 bg-orange-100 rounded-lg hover:bg-orange-200 transition-colors"
              >
                <RotateCcw className="w-5 h-5 mr-2" />
                执行自动归档
              </button>
              <button
                onClick={() => setShowConfigModal(true)}
                className="flex items-center px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Settings className="w-5 h-5 mr-2" />
                归档设置
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Archive Config Summary */}
      {archiveConfig && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Settings className="w-5 h-5 text-orange-600 mr-2" />
                <span className="text-sm font-medium text-orange-900">
                  归档配置
                </span>
              </div>
              <div className="flex items-center space-x-6 text-sm text-orange-800">
                <span>自动归档天数：{archiveConfig.auto_archive_days} 天</span>
                <span>保留天数：{archiveConfig.retention_days} 天</span>
                <span
                  className={
                    archiveConfig.enabled ? "text-green-600" : "text-red-600"
                  }
                >
                  {archiveConfig.enabled ? "已启用" : "已禁用"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="搜索归档通知标题、内容..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-12 h-12 text-blue-600 mx-auto animate-spin" />
              <p className="mt-2 text-gray-500">加载中...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-8 text-center">
              <Archive className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">暂无归档通知</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        通知标题
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        类型
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        原创建时间
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        归档时间
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredNotifications.map((notification) => (
                      <tr key={notification.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {notification.title}
                          </div>
                          <div className="text-xs text-gray-500 truncate max-w-md">
                            {notification.content}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${getTypeColor(notification.notification_type)}`}
                          >
                            {getTypeLabel(notification.notification_type)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(notification.created_at).toLocaleString(
                            "zh-CN",
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(notification.archived_at).toLocaleString(
                            "zh-CN",
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() =>
                                setSelectedNotification(notification)
                              }
                              className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                              title="查看详情"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {total > 20 && (
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    第 {page} 页，共 {totalPages} 页
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      上一页
                    </button>
                    <button
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={page >= totalPages}
                      className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      下一页
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Config Modal */}
      {showConfigModal && archiveConfig && (
        <ArchiveConfigModal
          config={archiveConfig}
          onClose={() => setShowConfigModal(false)}
          onSubmit={handleUpdateConfig}
        />
      )}

      {/* Detail Modal */}
      {selectedNotification && (
        <ArchivedNotificationDetailModal
          notification={selectedNotification}
          onClose={() => setSelectedNotification(null)}
        />
      )}
    </div>
  );
};

// Archive Config Modal Component
interface ArchiveConfigModalProps {
  config: ArchiveConfig;
  onClose: () => void;
  onSubmit: (config: ArchiveConfig) => void;
}

const ArchiveConfigModal: React.FC<ArchiveConfigModalProps> = ({
  config,
  onClose,
  onSubmit,
}) => {
  const [formData, setFormData] = useState<ArchiveConfig>(config);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">归档设置</h3>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">
              启用自动归档
            </label>
            <button
              type="button"
              onClick={() =>
                setFormData({ ...formData, enabled: !formData.enabled })
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                formData.enabled ? "bg-blue-600" : "bg-gray-200"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  formData.enabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              自动归档天数
            </label>
            <input
              type="number"
              min="1"
              value={formData.auto_archive_days}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  auto_archive_days: parseInt(e.target.value) || 30,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              超过此天数未读的通知将自动归档
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              保留天数
            </label>
            <input
              type="number"
              min="1"
              value={formData.retention_days}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  retention_days: parseInt(e.target.value) || 90,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              超过此天数的归档通知将被永久删除
            </p>
          </div>
        </form>

        <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
};

// Archived Notification Detail Modal
interface ArchivedNotificationDetailModalProps {
  notification: ArchivedNotification;
  onClose: () => void;
}

const ArchivedNotificationDetailModal: React.FC<
  ArchivedNotificationDetailModalProps
> = ({ notification, onClose }) => {
  const getTypeLabel = (type: NotificationTypeEnum) => {
    const labels: Record<NotificationTypeEnum, string> = {
      system: "系统通知",
      workflow: "审批通知",
      reminder: "提醒通知",
      alert: "告警通知",
      message: "消息通知",
      info: "信息通知",
      success: "成功通知",
      warning: "警告通知",
      error: "错误通知",
    };
    return labels[type] || type;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">归档通知详情</h3>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
              标题
            </label>
            <p className="text-gray-900">{notification.title}</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
              内容
            </label>
            <p className="text-gray-700">{notification.content}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                类型
              </label>
              <p className="text-gray-700">
                {getTypeLabel(notification.notification_type)}
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                优先级
              </label>
              <p className="text-gray-700">
                {notification.priority >= 4
                  ? "紧急"
                  : notification.priority >= 3
                    ? "高"
                    : notification.priority >= 2
                      ? "中"
                      : "低"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                原创建时间
              </label>
              <p className="text-gray-700">
                {new Date(notification.created_at).toLocaleString("zh-CN")}
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                归档时间
              </label>
              <p className="text-gray-700">
                {new Date(notification.archived_at).toLocaleString("zh-CN")}
              </p>
            </div>
          </div>

          {notification.read_at && (
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                阅读时间
              </label>
              <p className="text-gray-700">
                {new Date(notification.read_at).toLocaleString("zh-CN")}
              </p>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationArchivePage;
