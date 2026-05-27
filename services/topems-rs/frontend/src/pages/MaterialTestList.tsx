import React, { useState, useEffect } from 'react';
import { materialTestApi, MaterialTest } from '../api/material';

const MaterialTestList: React.FC = () => {
  const [materialTests, setMaterialTests] = useState<MaterialTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  useEffect(() => {
    fetchMaterialTests();
  }, [page, search]);

  const fetchMaterialTests = async () => {
    try {
      setLoading(true);
      const response = await materialTestApi.list({
        page,
        page_size: pageSize,
        search: search || undefined,
      });
      if (response.success && response.data) {
        setMaterialTests(response.data.items);
        setTotal(response.data.total);
      } else {
        setError(response.message);
      }
    } catch (err) {
      setError('获取原料试验列表失败');
    } finally {
      setLoading(false);
    }
  };

  const getConclusionColor = (conclusion: string) => {
    const colors: Record<string, string> = {
      pass: 'bg-green-100 text-green-800',
      fail: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800',
    };
    return colors[conclusion] || colors.pending;
  };

  const getConclusionText = (conclusion: string) => {
    const texts: Record<string, string> = {
      pass: '合格',
      fail: '不合格',
      pending: '待审核',
    };
    return texts[conclusion] || conclusion;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">原料试验管理</h1>
        <p className="text-gray-500 mt-1">管理原料测试记录、跟踪测试结果</p>
      </div>

      <div className="mb-4 flex gap-4">
        <input
          type="text"
          placeholder="搜索原料名称或测试编号..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          新增测试记录
        </button>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                测试名称
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                原料名称
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                测试类型
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                所属项目
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                所属试验
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                测试人
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                测试日期
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                结论
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {materialTests.map((test) => (
              <tr key={test.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{test.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{test.material_name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{test.test_type}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{test.project_name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{test.experiment_name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{test.tester}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">
                    {test.test_date ? new Date(test.test_date).toLocaleDateString() : '-'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getConclusionColor(
                      test.conclusion
                    )}`}
                  >
                    {getConclusionText(test.conclusion)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <button className="text-blue-600 hover:text-blue-900 mr-3">查看</button>
                  <button className="text-gray-600 hover:text-gray-900">编辑</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex justify-between items-center">
        <div className="text-sm text-gray-500">
          共 {total} 条记录，第 {page} / {Math.ceil(total / pageSize)} 页
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
          >
            上一页
          </button>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page >= Math.ceil(total / pageSize)}
            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
          >
            下一页
          </button>
        </div>
      </div>
    </div>
  );
};

export default MaterialTestList;