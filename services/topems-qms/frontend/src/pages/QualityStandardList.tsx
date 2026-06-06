import React, { useEffect, useState, useCallback } from 'react';
import { qualityStandardApi, QualityStandard } from '../api/qualityStandard';
import { SearchBar } from '../components/common/SearchBar';
import { Pagination } from '../components/common/Pagination';
import { StatusBadge } from '../components/common/StatusBadge';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { DetailDrawer } from '../components/common/DetailDrawer';
import { StandardForm } from '../components/qms/StandardForm';

const statusMap: Record<string, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'bg-gray-100 text-gray-800' },
  active: { label: '激活', color: 'bg-green-100 text-green-800' },
  expired: { label: '过期', color: 'bg-red-100 text-red-800' },
};

const detailFields = [
  { key: 'code', label: '编号' },
  { key: 'name', label: '名称' },
  { key: 'category', label: '类别' },
  { key: 'version', label: '版本' },
  { key: 'description', label: '描述' },
  { key: 'status', label: '状态', render: (v: string) => <StatusBadge status={v} statusMap={statusMap} /> },
  { key: 'created_at', label: '创建时间', render: (v: string) => v ? new Date(v).toLocaleString() : '-' },
  { key: 'updated_at', label: '更新时间', render: (v: string) => v ? new Date(v).toLocaleString() : '-' },
];

const QualityStandardList: React.FC = () => {
  const [standards, setStandards] = useState<QualityStandard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState<QualityStandard | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchStandards = useCallback(async () => {
    try {
      setLoading(true);
      const response = await qualityStandardApi.list({ page: currentPage, pageSize, search: keyword, status: statusFilter });
      if (response.success && response.data) {
        setStandards(response.data.standards || []);
        setTotal(response.data.total || 0);
      }
    } catch (err) {
      setError('获取质量标准列表失败');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, keyword, statusFilter]);

  useEffect(() => { fetchStandards(); }, [fetchStandards]);

  const handleSearch = (kw: string) => { setKeyword(kw); setCurrentPage(1); };
  const handleFilterChange = (filters: Record<string, string>) => { setStatusFilter(filters.status || ''); setCurrentPage(1); };
  const handlePageChange = (page: number, size?: number) => { setCurrentPage(page); if (size) setPageSize(size); };

  const handleCreate = () => { setSelected(undefined); setIsFormOpen(true); };
  const handleEdit = (item: QualityStandard) => { setSelected(item); setIsFormOpen(true); };
  const handleDetail = (item: QualityStandard) => { setSelected(item); setIsDetailOpen(true); };
  const handleDeletePrompt = (item: QualityStandard) => { setSelected(item); setIsDeleteOpen(true); };

  const handleFormSubmit = async (data: Partial<QualityStandard>) => {
    setSubmitting(true);
    try {
      if (selected) {
        await qualityStandardApi.update(selected.id, data);
      } else {
        await qualityStandardApi.create(data as any);
      }
      setIsFormOpen(false);
      fetchStandards();
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
      await qualityStandardApi.delete(selected.id);
      setIsDeleteOpen(false);
      fetchStandards();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && standards.length === 0) {
    return <div className="flex justify-center items-center h-64"><div className="text-gray-500">加载中...</div></div>;
  }

  if (error) {
    return <div className="flex justify-center items-center h-64"><div className="text-red-500">{error}</div></div>;
  }

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">质量标准</h1>
          <p className="mt-2 text-sm text-gray-700">管理系统中的所有质量标准</p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button onClick={handleCreate} className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
            添加标准
          </button>
        </div>
      </div>

      <div className="mt-6">
        <SearchBar
          onSearch={handleSearch}
          onFilterChange={handleFilterChange}
          filters={[{ key: 'status', label: '按状态筛选', options: [{ value: 'active', label: '激活' }, { value: 'draft', label: '草稿' }, { value: 'expired', label: '过期' }] }]}
          placeholder="搜索编号或名称..."
        />
      </div>

      <div className="mt-4 overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">编号</th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">名称</th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">类别</th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">版本</th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">状态</th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {standards.map((item) => (
              <tr key={item.id}>
                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6 font-medium text-gray-900">{item.code}</td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{item.name}</td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{item.category || '-'}</td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{item.version || '-'}</td>
                <td className="whitespace-nowrap px-3 py-4 text-sm"><StatusBadge status={item.status} statusMap={statusMap} /></td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 space-x-2">
                  <button onClick={() => handleDetail(item)} className="text-blue-600 hover:text-blue-800">详情</button>
                  <button onClick={() => handleEdit(item)} className="text-blue-600 hover:text-blue-800">编辑</button>
                  <button onClick={() => handleDeletePrompt(item)} className="text-red-600 hover:text-red-800">删除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {standards.length === 0 && <div className="text-center py-12"><p className="text-gray-500">暂无数据</p></div>}
      </div>

      <Pagination currentPage={currentPage} pageSize={pageSize} total={total} onChange={handlePageChange} />

      <StandardForm isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} onSubmit={handleFormSubmit} initialData={selected || undefined} loading={submitting} />

      <DetailDrawer isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} title="质量标准详情" data={selected || {}} fields={detailFields} />

      <ConfirmDialog isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} onConfirm={handleDelete} title="删除确认" message={`确定要删除标准 "${selected?.name}" 吗？此操作不可撤销。`} confirmText="删除" loading={submitting} />
    </div>
  );
};

export default QualityStandardList;