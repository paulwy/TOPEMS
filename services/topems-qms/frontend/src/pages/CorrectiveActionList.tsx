import React, { useEffect, useState, useCallback } from 'react';
import { correctiveActionApi, CorrectiveAction } from '../api/qualityStandard';
import { SearchBar } from '../components/common/SearchBar';
import { Pagination } from '../components/common/Pagination';
import { StatusBadge } from '../components/common/StatusBadge';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { DetailDrawer } from '../components/common/DetailDrawer';
import { ActionForm } from '../components/qms/ActionForm';

const statusMap: Record<string, { label: string; color: string }> = {
  pending: { label: '待执行', color: 'bg-yellow-100 text-yellow-800' },
  in_progress: { label: '执行中', color: 'bg-blue-100 text-blue-800' },
  completed: { label: '已完成', color: 'bg-green-100 text-green-800' },
  verified: { label: '已验证', color: 'bg-purple-100 text-purple-800' },
};

const actionTypeMap: Record<string, { label: string; color: string }> = {
  corrective: { label: '纠正', color: 'bg-orange-100 text-orange-800' },
  preventive: { label: '预防', color: 'bg-blue-100 text-blue-800' },
  improvement: { label: '改进', color: 'bg-green-100 text-green-800' },
};

const detailFields = [
  { key: 'title', label: '标题' },
  { key: 'action_type', label: '类型', render: (v: string) => <StatusBadge status={v} statusMap={actionTypeMap} /> },
  { key: 'assigned_to', label: '负责人' },
  { key: 'status', label: '状态', render: (v: string) => <StatusBadge status={v} statusMap={statusMap} /> },
  { key: 'target_date', label: '目标日期', render: (v: string) => v ? new Date(v).toLocaleDateString() : '-' },
  { key: 'description', label: '描述' },
  { key: 'created_at', label: '创建时间', render: (v: string) => v ? new Date(v).toLocaleString() : '-' },
  { key: 'updated_at', label: '更新时间', render: (v: string) => v ? new Date(v).toLocaleString() : '-' },
];

const CorrectiveActionList: React.FC = () => {
  const [actions, setActions] = useState<CorrectiveAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [keyword, setKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState<CorrectiveAction | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchActions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await correctiveActionApi.list({ page: currentPage, pageSize, search: keyword, action_type: typeFilter, status: statusFilter });
      if (response.success && response.data) {
        setActions(response.data.actions || []);
        setTotal(response.data.total || 0);
      }
    } catch (err) {
      setError('获取纠正措施列表失败');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, keyword, typeFilter, statusFilter]);

  useEffect(() => { fetchActions(); }, [fetchActions]);

  const handleSearch = (kw: string) => { setKeyword(kw); setCurrentPage(1); };
  const handleFilterChange = (filters: Record<string, string>) => { setTypeFilter(filters.action_type || ''); setStatusFilter(filters.status || ''); setCurrentPage(1); };
  const handlePageChange = (page: number, size?: number) => { setCurrentPage(page); if (size) setPageSize(size); };

  const handleCreate = () => { setSelected(null); setIsFormOpen(true); };
  const handleEdit = (item: CorrectiveAction) => { setSelected(item); setIsFormOpen(true); };
  const handleDetail = (item: CorrectiveAction) => { setSelected(item); setIsDetailOpen(true); };
  const handleDeletePrompt = (item: CorrectiveAction) => { setSelected(item); setIsDeleteOpen(true); };

  const handleFormSubmit = async (data: Partial<CorrectiveAction>) => {
    setSubmitting(true);
    try {
      if (selected) {
        await correctiveActionApi.update(selected.id, data);
      } else {
        await correctiveActionApi.create(data as any);
      }
      setIsFormOpen(false);
      fetchActions();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await correctiveActionApi.delete(selected.id);
      setIsDeleteOpen(false);
      fetchActions();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && actions.length === 0) {
    return <div className="flex justify-center items-center h-64"><div className="text-gray-500">加载中...</div></div>;
  }

  if (error) {
    return <div className="flex justify-center items-center h-64"><div className="text-red-500">{error}</div></div>;
  }

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">纠正措施</h1>
          <p className="mt-2 text-sm text-gray-700">管理和跟踪纠正与预防措施</p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button onClick={handleCreate} className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
            创建措施
          </button>
        </div>
      </div>

      <div className="mt-6">
        <SearchBar
          onSearch={handleSearch}
          onFilterChange={handleFilterChange}
          filters={[
            { key: 'action_type', label: '按类型筛选', options: [{ value: 'corrective', label: '纠正' }, { value: 'preventive', label: '预防' }, { value: 'improvement', label: '改进' }] },
            { key: 'status', label: '按状态筛选', options: [{ value: 'pending', label: '待执行' }, { value: 'in_progress', label: '执行中' }, { value: 'completed', label: '已完成' }, { value: 'verified', label: '已验证' }] },
          ]}
          placeholder="搜索标题..."
        />
      </div>

      <div className="mt-4 overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">标题</th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">类型</th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">负责人</th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">状态</th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">目标日期</th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {actions.map((item) => (
              <tr key={item.id}>
                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6 font-medium text-gray-900">{item.title}</td>
                <td className="whitespace-nowrap px-3 py-4 text-sm"><StatusBadge status={item.action_type} statusMap={actionTypeMap} /></td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{item.assigned_to || '-'}</td>
                <td className="whitespace-nowrap px-3 py-4 text-sm"><StatusBadge status={item.status} statusMap={statusMap} /></td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{item.target_date ? new Date(item.target_date).toLocaleDateString() : '-'}</td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 space-x-2">
                  <button onClick={() => handleDetail(item)} className="text-blue-600 hover:text-blue-800">详情</button>
                  <button onClick={() => handleEdit(item)} className="text-blue-600 hover:text-blue-800">编辑</button>
                  <button onClick={() => handleDeletePrompt(item)} className="text-red-600 hover:text-red-800">删除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {actions.length === 0 && <div className="text-center py-12"><p className="text-gray-500">暂无数据</p></div>}
      </div>

      <Pagination currentPage={currentPage} pageSize={pageSize} total={total} onChange={handlePageChange} />

      <ActionForm isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} onSubmit={handleFormSubmit} initialData={selected || undefined} loading={submitting} />

      <DetailDrawer isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} title="纠正措施详情" data={selected || {}} fields={detailFields} />

      <ConfirmDialog isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} onConfirm={handleDelete} title="删除确认" message={`确定要删除措施 "${selected?.title}" 吗？此操作不可撤销。`} confirmText="删除" loading={submitting} />
    </div>
  );
};

export default CorrectiveActionList;