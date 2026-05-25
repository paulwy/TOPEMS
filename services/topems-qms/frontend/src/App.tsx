import { useState, useEffect } from 'react';

interface InspectionRecord {
  id: string;
  batch_id: string;
  product_name: string;
  inspection_date: string;
  inspector: string;
  status: string;
  result_summary: string;
}

interface NonConformance {
  id: string;
  nc_id: string;
  description: string;
  severity: string;
  status: string;
  reported_date: string;
  department: string;
}

interface QualityStandard {
  id: string;
  standard_code: string;
  title: string;
  version: string;
  effective_date: string;
  category: string;
  status: string;
}

function App() {
  const [activeTab, setActiveTab] = useState<'inspections' | 'nonconformances' | 'standards'>('inspections');
  const [inspections, setInspections] = useState<InspectionRecord[]>([]);
  const [nonconformances, setNonconformances] = useState<NonConformance[]>([]);
  const [standards, setQualityStandards] = useState<QualityStandard[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // 表单状态
  const [inspectionForm, setInspectionForm] = useState({
    batch_id: '',
    product_name: '',
    inspector: '',
    status: '合格',
    result_summary: '',
  });

  const [ncForm, setNcForm] = useState({
    description: '',
    severity: '中等',
    department: '',
  });

  const [standardForm, setStandardForm] = useState({
    standard_code: '',
    title: '',
    version: 'V1.0',
    effective_date: new Date().toISOString().split('T')[0],
    category: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [inspectionsRes, ncsRes, standardsRes] = await Promise.all([
        fetch('/api/v1/inspections'),
        fetch('/api/v1/nonconformances'),
        fetch('/api/v1/standards'),
      ]);

      const inspectionsData = await inspectionsRes.json();
      const ncsData = await ncsRes.json();
      const standardsData = await standardsRes.json();

      if (inspectionsData.success) setInspections(inspectionsData.data);
      if (ncsData.success) setNonconformances(ncsData.data);
      if (standardsData.success) setQualityStandards(standardsData.data);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/inspections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inspectionForm),
      });
      const data = await res.json();
      if (data.success) {
        setShowForm(false);
        setInspectionForm({
          batch_id: '',
          product_name: '',
          inspector: '',
          status: '合格',
          result_summary: '',
        });
        fetchData();
      }
    } catch (err) {
      console.error('Failed to add inspection:', err);
    }
  };

  const handleAddNC = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/nonconformances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ncForm),
      });
      const data = await res.json();
      if (data.success) {
        setShowForm(false);
        setNcForm({
          description: '',
          severity: '中等',
          department: '',
        });
        fetchData();
      }
    } catch (err) {
      console.error('Failed to add nonconformance:', err);
    }
  };

  const handleAddStandard = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/standards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(standardForm),
      });
      const data = await res.json();
      if (data.success) {
        setShowForm(false);
        setStandardForm({
          standard_code: '',
          title: '',
          version: 'V1.0',
          effective_date: new Date().toISOString().split('T')[0],
          category: '',
        });
        fetchData();
      }
    } catch (err) {
      console.error('Failed to add standard:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case '合格':
      case '生效中':
        return 'bg-green-100 text-green-800';
      case '不合格':
      case '整改中':
      case '高':
        return 'bg-red-100 text-red-800';
      case '待检':
      case '中等':
      case '待处理':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600 text-lg">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            📋 TOPEMS-QMS 质量合规管理系统
          </h1>
          <p className="text-gray-600">
            产品检验、不合格品控制、质量标准管理一体化平台
          </p>
        </div>

        <div className="flex gap-4 mb-6">
          <button
            onClick={() => { setActiveTab('inspections'); setShowForm(false); }}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'inspections'
                ? 'bg-purple-600 text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            🔍 产品检验
          </button>
          <button
            onClick={() => { setActiveTab('nonconformances'); setShowForm(false); }}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'nonconformances'
                ? 'bg-purple-600 text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            ⚠️ 不合格品
          </button>
          <button
            onClick={() => { setActiveTab('standards'); setShowForm(false); }}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'standards'
                ? 'bg-purple-600 text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            📑 质量标准
          </button>
        </div>

        {activeTab === 'inspections' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">产品检验记录</h2>
              <button
                onClick={() => setShowForm(!showForm)}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
              >
                {showForm ? '取消' : '添加记录'}
              </button>
            </div>

            {showForm && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-medium mb-4">添加检验记录</h3>
                <form onSubmit={handleAddInspection} className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">产品名称</label>
                    <input
                      type="text"
                      value={inspectionForm.product_name}
                      onChange={(e) => setInspectionForm({...inspectionForm, product_name: e.target.value})}
                      className="w-full border border-gray-300 rounded-md p-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">批次号</label>
                    <input
                      type="text"
                      value={inspectionForm.batch_id}
                      onChange={(e) => setInspectionForm({...inspectionForm, batch_id: e.target.value})}
                      className="w-full border border-gray-300 rounded-md p-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">检验员</label>
                    <input
                      type="text"
                      value={inspectionForm.inspector}
                      onChange={(e) => setInspectionForm({...inspectionForm, inspector: e.target.value})}
                      className="w-full border border-gray-300 rounded-md p-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">检验结果</label>
                    <select
                      value={inspectionForm.status}
                      onChange={(e) => setInspectionForm({...inspectionForm, status: e.target.value})}
                      className="w-full border border-gray-300 rounded-md p-2"
                    >
                      <option value="合格">合格</option>
                      <option value="不合格">不合格</option>
                      <option value="待检">待检</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">结果摘要</label>
                    <textarea
                      value={inspectionForm.result_summary}
                      onChange={(e) => setInspectionForm({...inspectionForm, result_summary: e.target.value})}
                      className="w-full border border-gray-300 rounded-md p-2"
                      rows={3}
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <button
                      type="submit"
                      className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700"
                    >
                      提交
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="space-y-4">
                {inspections.map((inspection) => (
                  <div
                    key={inspection.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {inspection.product_name}
                          <span className="ml-3 text-sm text-gray-500 font-mono">
                            {inspection.batch_id}
                          </span>
                        </h3>
                        <p className="text-gray-600 mt-1">{inspection.result_summary}</p>
                        <p className="text-sm text-gray-500 mt-2">
                          检验日期: {inspection.inspection_date} · 
                          检验员: {inspection.inspector}
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                          inspection.status
                        )}`}
                      >
                        {inspection.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'nonconformances' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">不合格品记录</h2>
              <button
                onClick={() => setShowForm(!showForm)}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
              >
                {showForm ? '取消' : '添加记录'}
              </button>
            </div>

            {showForm && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-medium mb-4">添加不合格品</h3>
                <form onSubmit={handleAddNC} className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">问题描述</label>
                    <textarea
                      value={ncForm.description}
                      onChange={(e) => setNcForm({...ncForm, description: e.target.value})}
                      className="w-full border border-gray-300 rounded-md p-2"
                      rows={3}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">严重程度</label>
                    <select
                      value={ncForm.severity}
                      onChange={(e) => setNcForm({...ncForm, severity: e.target.value})}
                      className="w-full border border-gray-300 rounded-md p-2"
                    >
                      <option value="轻微">轻微</option>
                      <option value="中等">中等</option>
                      <option value="严重">严重</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">部门</label>
                    <input
                      type="text"
                      value={ncForm.department}
                      onChange={(e) => setNcForm({...ncForm, department: e.target.value})}
                      className="w-full border border-gray-300 rounded-md p-2"
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <button
                      type="submit"
                      className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700"
                    >
                      提交
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="space-y-4">
                {nonconformances.map((nc) => (
                  <div
                    key={nc.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {nc.nc_id}
                        </h3>
                        <p className="text-gray-600 mt-1">{nc.description}</p>
                        <p className="text-sm text-gray-500 mt-2">
                          报告部门: {nc.department} · 
                          报告日期: {nc.reported_date}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                            nc.severity
                          )}`}
                        >
                          {nc.severity}
                        </span>
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                            nc.status
                          )}`}
                        >
                          {nc.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'standards' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">质量标准文件</h2>
              <button
                onClick={() => setShowForm(!showForm)}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
              >
                {showForm ? '取消' : '添加标准'}
              </button>
            </div>

            {showForm && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-medium mb-4">添加质量标准</h3>
                <form onSubmit={handleAddStandard} className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">标准编号</label>
                    <input
                      type="text"
                      value={standardForm.standard_code}
                      onChange={(e) => setStandardForm({...standardForm, standard_code: e.target.value})}
                      className="w-full border border-gray-300 rounded-md p-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">版本</label>
                    <input
                      type="text"
                      value={standardForm.version}
                      onChange={(e) => setStandardForm({...standardForm, version: e.target.value})}
                      className="w-full border border-gray-300 rounded-md p-2"
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">标准标题</label>
                    <input
                      type="text"
                      value={standardForm.title}
                      onChange={(e) => setStandardForm({...standardForm, title: e.target.value})}
                      className="w-full border border-gray-300 rounded-md p-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">分类</label>
                    <input
                      type="text"
                      value={standardForm.category}
                      onChange={(e) => setStandardForm({...standardForm, category: e.target.value})}
                      className="w-full border border-gray-300 rounded-md p-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">生效日期</label>
                    <input
                      type="date"
                      value={standardForm.effective_date}
                      onChange={(e) => setStandardForm({...standardForm, effective_date: e.target.value})}
                      className="w-full border border-gray-300 rounded-md p-2"
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <button
                      type="submit"
                      className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700"
                    >
                      提交
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="space-y-4">
                {standards.map((standard) => (
                  <div
                    key={standard.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-gray-900">{standard.title}</h3>
                          <span className="text-sm text-gray-500 font-mono">{standard.standard_code}</span>
                          <span className="text-sm text-gray-500">{standard.version}</span>
                        </div>
                        <p className="text-gray-600 mt-1">{standard.category}</p>
                        <p className="text-sm text-gray-500 mt-2">
                          生效日期: {standard.effective_date}
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                          standard.status
                        )}`}
                      >
                        {standard.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
