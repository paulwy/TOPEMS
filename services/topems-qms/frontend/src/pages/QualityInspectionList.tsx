import React, { useEffect, useState } from 'react';
import { inspectionApi, QualityInspection } from '../api/qualityStandard';
import InspectionForm from '../components/qms/InspectionForm';

const QualityInspectionList: React.FC = () => {
  const [inspections, setInspections] = useState<QualityInspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search and filter state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);

  // Modal and drawer state
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState<QualityInspection | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchInspections();
  }, [page, search, statusFilter, typeFilter]);

  const fetchInspections = async () => {
    try {
      setLoading(true);
      const response = await inspectionApi.list({
        page,
        pageSize,
        search: search || undefined,
        status: statusFilter || undefined,
        inspection_type: typeFilter || undefined,
      });
      if (response.success && response.data) {
        setInspections(response.data.inspections || response.data || []);
        setTotal(response.data.total || 0);
      }
    } catch (err) {
      setError('获取质量检查列表失败');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };

  const handleTypeFilter = (value: string) => {
    setTypeFilter(value);
    setPage(1);
  };

  const handleCreate = () => {
    setSelectedInspection({} as QualityInspection);
    setIsEditing(false);
    setShowFormModal(true);
  };

  const handleEdit = (inspection: QualityInspection) => {
    setSelectedInspection(inspection);
    setIsEditing(true);
    setShowFormModal(true);
  };

  const handleViewDetail = (inspection: QualityInspection) => {
    setSelectedInspection(inspection);
    setShowDetailDrawer(true);
  };

  const handleDelete = (inspection: QualityInspection) => {
    setSelectedInspection(inspection);
    setShowDeleteDialog(true);
  };

  const handleFormSubmit = async (data: Partial<QualityInspection>) => {
    try {
      if (isEditing && selectedInspection?.id) {
        await inspectionApi.update(selectedInspection.id, data);
      } else {
        await inspectionApi.create(data as any);
      }
      setShowFormModal(false);
      fetchInspections();
    } catch (err) {
      console.error(err);
      alert('操作失败');
    }
  };

  const confirmDelete = async () => {
    if (selectedInspection?.id) {
      try {
        await inspectionApi.delete(selectedInspection.id);
        setShowDeleteDialog(false);
        setSelectedInspection(null);
        fetchInspections();
      } catch (err) {
        console.error(err);
        alert('删除失败');
      }
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; color: string }> = {
      pending: { label: '待检查', color: 'bg-yellow-100 text-yellow-800' },
      in_progress: { label: '检查中', color: 'bg-blue-100 text-blue-800' },
      completed: { label: '已完成', color: 'bg-green-100 text-green-800' },
    };
    const config = statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-800' };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const totalPages = Math.ceil(total / pageSize);

  if (loading && inspections.length === 0) {
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
    <div>
      {/* Header */}
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">质量检查</h1>
          <p className="mt-2 text-sm text-gray-700">管理所有质量检查记录</p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            type="button"
            onClick={handleCreate}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
          >
            创建检查
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="mt-4 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="搜索标题..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border px-3 py-2"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => handleStatusFilter(e.target.value)}
          className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border px-3 py-2"
        >
          <option value="">全部状态</option>
          <option value="pending">待检查</option>
          <option value="in_progress">检查中</option>
          <option value="completed">已完成</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => handleTypeFilter(e.target.value)}
          className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border px-3 py-2"
        >
          <option value="">全部类型</option>
          <option value="巡检">巡检</option>
          <option value="定期检查">定期检查</option>
          <option value="专项检查">专项检查</option>
          <option value="来料检查">来料检查</option>
          <option value="出货检查">出货检查</option>
        </select>
      </div>

      {/* Table */}
      <div className="mt-8 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                      标题
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      检查类型
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      检查员
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      状态
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {inspections.map((inspection) => (
                    <tr key={inspection.id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                        <button
                          onClick={() => handleViewDetail(inspection)}
                          className="font-medium text-blue-600 hover:text-blue-900"
                        >
                          {inspection.title}
                        </button>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {inspection.inspection_type}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {inspection.inspector || '-'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        {getStatusBadge(inspection.status)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(inspection)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            编辑
                          </button>
                          <button
                            onClick={() => handleDelete(inspection)}
                            className="text-red-600 hover:text-red-900"
                          >
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {inspections.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500">暂无质量检查数据</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            显示 {(page - 1) * pageSize + 1} 到 {Math.min(page * pageSize, total)} 条，共 {total} 条
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              className="px-3 py-1 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              上一页
            </button>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages}
              className="px-3 py-1 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              下一页
            </button>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-25" onClick={() => setShowFormModal(false)} />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {isEditing ? '编辑检查' : '创建检查'}
              </h3>
              <InspectionForm
                initialData={selectedInspection || undefined}
                onSubmit={handleFormSubmit}
                onCancel={() => setShowFormModal(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Detail Drawer */}
      {showDetailDrawer && selectedInspection && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="fixed inset-0 bg-black bg-opacity-25" onClick={() => setShowDetailDrawer(false)} />
          <div className="absolute inset-y-0 right-0 max-w-xs w-full bg-white shadow-xl flex flex-col">
            <div className="p-4 border-b">
              <h3 className="text-lg font-medium text-gray-900">检查详情</h3>
              <button
                onClick={() => setShowDetailDrawer(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">标题</label>
                  <div className="mt-1 text-sm text-gray-900">{selectedInspection.title}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">检查类型</label>
                  <div className="mt-1 text-sm text-gray-900">{selectedInspection.inspection_type}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">检查员</label>
                  <div className="mt-1 text-sm text-gray-900">{selectedInspection.inspector || '-'}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">状态</label>
                  <div className="mt-1">{getStatusBadge(selectedInspection.status)}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">描述</label>
                  <div className="mt-1 text-sm text-gray-900">{selectedInspection.description || '-'}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">检查结果</label>
                  <div className="mt-1 text-sm text-gray-900">{selectedInspection.result || '-'}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">发现问题</label>
                  <div className="mt-1 text-sm text-gray-900">{selectedInspection.findings || '-'}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">创建时间</label>
                  <div className="mt-1 text-sm text-gray-900">{selectedInspection.created_at}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">更新时间</label>
                  <div className="mt-1 text-sm text-gray-900">{selectedInspection.updated_at}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && selectedInspection && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-25" onClick={() => setShowDeleteDialog(false)} />
            <div className="relative bg-white rounded-lg shadow-xl max-w-sm w-full p-6">
              <h3 className="text-lg font-medium text-gray-900">确认删除</h3>
              <p className="mt-2 text-sm text-gray-500">
                确定要删除检查 "{selectedInspection.title}" 吗？此操作无法撤销。
              </p>
              <div className="mt-4 flex justify-end space-x-2">
                <button
                  onClick={() => setShowDeleteDialog(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
                >
                  删除
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QualityInspectionList;