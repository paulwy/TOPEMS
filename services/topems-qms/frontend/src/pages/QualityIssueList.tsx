import React, { useEffect, useState, useCallback } from 'react';
import { issueApi, QualityIssue } from '../api/qualityStandard';
import { SearchBar } from '../components/common/SearchBar';
import { Pagination } from '../components/common/Pagination';
import { DetailDrawer } from '../components/common/DetailDrawer';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { FormModal } from '../components/common/FormModal';
import { IssueForm } from '../components/qms/IssueForm';

const QualityIssueList: React.FC = () => {
  const [issues, setIssues] = useState<QualityIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  const [searchKeyword, setSearchKeyword] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});

  const [selectedIssue, setSelectedIssue] = useState<QualityIssue | null>(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [issueToDelete, setIssueToDelete] = useState<QualityIssue | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingIssue, setEditingIssue] = useState<QualityIssue | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const fetchIssues = useCallback(async () => {
    try {
      setLoading(true);
      const response = await issueApi.list({
        page,
        pageSize,
        search: searchKeyword || undefined,
        severity: filters.severity || undefined,
        status: filters.status || undefined,
      });
      if (response.success && response.data) {
        setIssues(response.data.issues || response.data || []);
        setTotal(response.data.total || 0);
      }
    } catch (err) {
      setError('获取质量问题列表失败');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchKeyword, filters]);

  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

  const handleSearch = (keyword: string) => {
    setSearchKeyword(keyword);
    setPage(1);
  };

  const handleFilterChange = (newFilters: Record<string, string>) => {
    setFilters(newFilters);
    setPage(1);
  };

  const handlePageChange = (newPage: number, newPageSize?: number) => {
    if (newPageSize && newPageSize !== pageSize) {
      setPageSize(newPageSize);
      setPage(1);
    } else {
      setPage(newPage);
    }
  };

  const handleViewDetail = (issue: QualityIssue) => {
    setSelectedIssue(issue);
    setDetailDrawerOpen(true);
  };

  const handleDeleteClick = (issue: QualityIssue) => {
    setIssueToDelete(issue);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!issueToDelete) return;
    try {
      setDeleteLoading(true);
      await issueApi.delete(issueToDelete.id);
      setDeleteDialogOpen(false);
      setIssueToDelete(null);
      fetchIssues();
    } catch (err) {
      setError('删除质量问题失败');
      console.error(err);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingIssue(null);
    setFormModalOpen(true);
  };

  const handleEdit = (issue: QualityIssue) => {
    setEditingIssue(issue);
    setFormModalOpen(true);
  };

  const handleFormSubmit = async (data: Partial<QualityIssue>) => {
    try {
      setFormLoading(true);
      if (editingIssue) {
        await issueApi.update(editingIssue.id, data);
      } else {
        await issueApi.create(data as { title: string; description?: string; severity?: string; source?: string; assigned_to?: string; priority?: string });
      }
      setFormModalOpen(false);
      setEditingIssue(null);
      fetchIssues();
    } catch (err) {
      setError(editingIssue ? '更新质量问题失败' : '创建质量问题失败');
      console.error(err);
    } finally {
      setFormLoading(false);
    }
  };

  const getSeverityBadge = (severity: string) => {
    const severityMap: Record<string, { label: string; color: string }> = {
      critical: { label: '严重', color: 'bg-red-100 text-red-800' },
      major: { label: '较大', color: 'bg-orange-100 text-orange-800' },
      minor: { label: '一般', color: 'bg-yellow-100 text-yellow-800' },
    };
    const config = severityMap[severity] || { label: severity, color: 'bg-gray-100 text-gray-800' };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; color: string }> = {
      open: { label: '开放', color: 'bg-red-100 text-red-800' },
      in_progress: { label: '处理中', color: 'bg-yellow-100 text-yellow-800' },
      resolved: { label: '已解决', color: 'bg-green-100 text-green-800' },
      closed: { label: '已关闭', color: 'bg-gray-100 text-gray-800' },
    };
    const config = statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-800' };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const filterOptions = [
    {
      key: 'severity',
      label: '严重性',
      options: [
        { value: 'critical', label: '严重' },
        { value: 'major', label: '较大' },
        { value: 'minor', label: '一般' },
      ],
    },
    {
      key: 'status',
      label: '状态',
      options: [
        { value: 'open', label: '开放' },
        { value: 'in_progress', label: '处理中' },
        { value: 'resolved', label: '已解决' },
        { value: 'closed', label: '已关闭' },
      ],
    },
  ];

  const detailFields = [
    { key: 'title', label: '标题' },
    { key: 'description', label: '描述' },
    {
      key: 'severity',
      label: '严重性',
      render: (value: string) => getSeverityBadge(value),
    },
    {
      key: 'status',
      label: '状态',
      render: (value: string) => getStatusBadge(value),
    },
    { key: 'source', label: '来源' },
    { key: 'assigned_to', label: '指派给' },
    { key: 'priority', label: '优先级' },
    {
      key: 'created_at',
      label: '创建时间',
      render: (value: string) => value ? new Date(value).toLocaleString() : '-',
    },
    {
      key: 'updated_at',
      label: '更新时间',
      render: (value: string) => value ? new Date(value).toLocaleString() : '-',
    },
  ];

  if (loading && issues.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (error && issues.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">质量问题</h1>
          <p className="mt-2 text-sm text-gray-700">跟踪和管理所有质量问题</p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            type="button"
            onClick={handleCreate}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
          >
            报告问题
          </button>
        </div>
      </div>

      <div className="mt-6">
        <SearchBar
          onSearch={handleSearch}
          onFilterChange={handleFilterChange}
          filters={filterOptions}
          placeholder="搜索问题标题..."
        />
      </div>

      <div className="mt-4 flex flex-col">
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
                      严重性
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      状态
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      来源
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      指派给
                    </th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">操作</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {issues.map((issue) => (
                    <tr key={issue.id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                        <button
                          type="button"
                          onClick={() => handleViewDetail(issue)}
                          className="font-medium text-blue-600 hover:text-blue-900 text-left"
                        >
                          {issue.title}
                        </button>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        {getSeverityBadge(issue.severity)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        {getStatusBadge(issue.status)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {issue.source || '-'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {issue.assigned_to || '-'}
                      </td>
                      <td className="relative py-4 pl-3 pr-4 text-sm whitespace-nowrap sm:pr-6">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(issue)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            编辑
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteClick(issue)}
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

              {issues.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500">暂无质量问题数据</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {total > 0 && (
        <Pagination
          currentPage={page}
          pageSize={pageSize}
          total={total}
          onChange={handlePageChange}
        />
      )}

      <DetailDrawer
        isOpen={detailDrawerOpen}
        onClose={() => setDetailDrawerOpen(false)}
        title="质量问题详情"
        data={selectedIssue || {}}
        fields={detailFields}
      />

      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="确认删除"
        message={`确定要删除问题"${issueToDelete?.title}"吗？此操作不可恢复。`}
        confirmText="删除"
        cancelText="取消"
        loading={deleteLoading}
        type="danger"
      />

      <FormModal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        title={editingIssue ? '编辑质量问题' : '报告质量问题'}
        onSubmit={() => {
          const form = document.getElementById('issue-form') as HTMLFormElement;
          if (form) {
            form.dispatchEvent(new Event('submit', { cancelable: true }));
          }
        }}
        loading={formLoading}
        submitText={editingIssue ? '保存' : '创建'}
        size="lg"
      >
        <IssueForm
          initialData={editingIssue || {}}
          onSubmit={handleFormSubmit}
        />
      </FormModal>
    </div>
  );
};

export default QualityIssueList;
