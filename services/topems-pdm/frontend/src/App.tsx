import { useState, useEffect } from 'react';
import {
  ProductionProcess,
  ProductionFormula,
  ProductionBatch,
  ProductionStatistics,
  getProcesses,
  createProcess,
  updateProcess,
  deleteProcess,
  getFormulas,
  createFormula,
  updateFormula,
  deleteFormula,
  getBatches,
  createBatch,
  updateBatch,
  deleteBatch,
  getStatistics,
  createStatistics,
  CreateProductionProcessRequest,
  UpdateProductionProcessRequest,
  CreateProductionFormulaRequest,
  UpdateProductionFormulaRequest,
  CreateProductionBatchRequest,
  UpdateProductionBatchRequest,
  CreateProductionStatisticsRequest
} from './api';

function App() {
  const [activeTab, setActiveTab] = useState('processes');
  const [processes, setProcesses] = useState<ProductionProcess[]>([]);
  const [formulas, setFormulas] = useState<ProductionFormula[]>([]);
  const [batches, setBatches] = useState<ProductionBatch[]>([]);
  const [statistics, setStatistics] = useState<ProductionStatistics[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [processData, formulaData, batchData, statData] = await Promise.all([
        getProcesses(),
        getFormulas(),
        getBatches(),
        getStatistics()
      ]);
      setProcesses(processData);
      setFormulas(formulaData);
      setBatches(batchData);
      setStatistics(statData);
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100">
      <header className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <span className="text-4xl">⚙️</span>
            TOPEMS PDM - 产品数据管理
          </h1>
          <p className="text-indigo-200 mt-2">生产流程、配方管理与批次追踪系统</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <nav className="flex gap-2 mb-8">
          {[
            { id: 'processes', label: '生产流程', icon: '🔀' },
            { id: 'formulas', label: '配方管理', icon: '📋' },
            { id: 'batches', label: '生产批次', icon: '📦' },
            { id: 'statistics', label: '生产统计', icon: '📊' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-white text-indigo-600 shadow-lg'
                  : 'bg-white/50 text-gray-700 hover:bg-white/80'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
          </div>
        ) : (
          <>
            {activeTab === 'processes' && (
              <ProcessesTab
                processes={processes}
                onRefresh={loadData}
                onCreate={createProcess}
                onUpdate={updateProcess}
                onDelete={deleteProcess}
              />
            )}
            {activeTab === 'formulas' && (
              <FormulasTab
                formulas={formulas}
                processes={processes}
                onRefresh={loadData}
                onCreate={createFormula}
                onUpdate={updateFormula}
                onDelete={deleteFormula}
              />
            )}
            {activeTab === 'batches' && (
              <BatchesTab
                batches={batches}
                formulas={formulas}
                processes={processes}
                onRefresh={loadData}
                onCreate={createBatch}
                onUpdate={updateBatch}
                onDelete={deleteBatch}
              />
            )}
            {activeTab === 'statistics' && (
              <StatisticsTab
                statistics={statistics}
                batches={batches}
                onRefresh={loadData}
                onCreate={createStatistics}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}

function ProcessesTab({
  processes,
  onRefresh,
  onCreate,
  onUpdate,
  onDelete
}: {
  processes: ProductionProcess[];
  onRefresh: () => void;
  onCreate: (data: CreateProductionProcessRequest) => Promise<ProductionProcess>;
  onUpdate: (id: string, data: UpdateProductionProcessRequest) => Promise<ProductionProcess>;
  onDelete: (id: string) => Promise<boolean>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateProductionProcessRequest>({
    process_no: '',
    name: '',
    description: '',
    version: '1.0',
    status: 'active'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await onUpdate(editingId, formData);
      } else {
        await onCreate(formData);
      }
      onRefresh();
      setShowForm(false);
      setEditingId(null);
      setFormData({
        process_no: '',
        name: '',
        description: '',
        version: '1.0',
        status: 'active'
      });
    } catch (error) {
      alert('操作失败');
      console.error(error);
    }
  };

  const handleEdit = (process: ProductionProcess) => {
    setEditingId(process.id);
    setFormData({
      process_no: process.process_no,
      name: process.name,
      description: process.description || '',
      version: process.version,
      status: process.status
    });
    setShowForm(true);
  };

  const handleDeleteClick = async (id: string) => {
    if (confirm('确定删除此生产流程?')) {
      await onDelete(id);
      onRefresh();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">生产流程管理</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2"
        >
          {showForm ? '✕ 取消' : '➕ 新建流程'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4">
            {editingId ? '编辑生产流程' : '新建生产流程'}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">流程编号</label>
              <input
                type="text"
                required
                value={formData.process_no}
                onChange={(e) => setFormData({ ...formData, process_no: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">流程名称</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">版本</label>
              <input
                type="text"
                required
                value={formData.version}
                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="active">激活</option>
                <option value="inactive">停用</option>
                <option value="draft">草稿</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
                rows={3}
              />
            </div>
            <div className="col-span-2 flex gap-3">
              <button
                type="submit"
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
              >
                保存
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
                className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600"
              >
                取消
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">流程编号</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">名称</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">版本</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">创建时间</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {processes.map((process) => (
              <tr key={process.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-mono text-sm">{process.process_no}</td>
                <td className="px-6 py-4 font-medium">{process.name}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{process.version}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    process.status === 'active' ? 'bg-green-100 text-green-800' :
                    process.status === 'inactive' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {process.status === 'active' ? '激活' : process.status === 'inactive' ? '停用' : '草稿'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {new Date(process.created_at).toLocaleString('zh-CN')}
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(process)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => handleDeleteClick(process.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      删除
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {processes.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            暂无生产流程数据
          </div>
        )}
      </div>
    </div>
  );
}

function FormulasTab({
  formulas,
  processes,
  onRefresh,
  onCreate,
  onUpdate,
  onDelete
}: {
  formulas: ProductionFormula[];
  processes: ProductionProcess[];
  onRefresh: () => void;
  onCreate: (data: CreateProductionFormulaRequest) => Promise<ProductionFormula>;
  onUpdate: (id: string, data: UpdateProductionFormulaRequest) => Promise<ProductionFormula>;
  onDelete: (id: string) => Promise<boolean>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateProductionFormulaRequest>({
    formula_no: '',
    name: '',
    description: '',
    version: '1.0',
    status: 'active'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await onUpdate(editingId, formData);
      } else {
        await onCreate(formData);
      }
      onRefresh();
      setShowForm(false);
      setEditingId(null);
      setFormData({
        formula_no: '',
        name: '',
        description: '',
        version: '1.0',
        status: 'active'
      });
    } catch (error) {
      alert('操作失败');
      console.error(error);
    }
  };

  const handleEdit = (formula: ProductionFormula) => {
    setEditingId(formula.id);
    setFormData({
      formula_no: formula.formula_no,
      name: formula.name,
      description: formula.description || '',
      version: formula.version,
      process_id: formula.process_id || undefined,
      status: formula.status
    });
    setShowForm(true);
  };

  const handleDeleteClick = async (id: string) => {
    if (confirm('确定删除此配方?')) {
      await onDelete(id);
      onRefresh();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">配方管理</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2"
        >
          {showForm ? '✕ 取消' : '➕ 新建配方'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4">
            {editingId ? '编辑配方' : '新建配方'}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">配方编号</label>
              <input
                type="text"
                required
                value={formData.formula_no}
                onChange={(e) => setFormData({ ...formData, formula_no: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">配方名称</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">版本</label>
              <input
                type="text"
                required
                value={formData.version}
                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">关联流程</label>
              <select
                value={formData.process_id || ''}
                onChange={(e) => setFormData({ ...formData, process_id: e.target.value || undefined })}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">-- 无关联 --</option>
                {processes.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.process_no})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="active">激活</option>
                <option value="inactive">停用</option>
                <option value="draft">草稿</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
                rows={3}
              />
            </div>
            <div className="col-span-2 flex gap-3">
              <button
                type="submit"
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
              >
                保存
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
                className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600"
              >
                取消
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">配方编号</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">名称</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">版本</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">创建时间</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {formulas.map((formula) => (
              <tr key={formula.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-mono text-sm">{formula.formula_no}</td>
                <td className="px-6 py-4 font-medium">{formula.name}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{formula.version}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    formula.status === 'active' ? 'bg-green-100 text-green-800' :
                    formula.status === 'inactive' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {formula.status === 'active' ? '激活' : formula.status === 'inactive' ? '停用' : '草稿'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {new Date(formula.created_at).toLocaleString('zh-CN')}
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(formula)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => handleDeleteClick(formula.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      删除
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {formulas.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            暂无配方数据
          </div>
        )}
      </div>
    </div>
  );
}

function BatchesTab({
  batches,
  formulas,
  processes,
  onRefresh,
  onCreate,
  onUpdate,
  onDelete
}: {
  batches: ProductionBatch[];
  formulas: ProductionFormula[];
  processes: ProductionProcess[];
  onRefresh: () => void;
  onCreate: (data: CreateProductionBatchRequest) => Promise<ProductionBatch>;
  onUpdate: (id: string, data: UpdateProductionBatchRequest) => Promise<ProductionBatch>;
  onDelete: (id: string) => Promise<boolean>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateProductionBatchRequest | UpdateProductionBatchRequest>({
    batch_no: '',
    product_name: '',
    status: 'pending'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await onUpdate(editingId, formData);
      } else {
        await onCreate(formData as CreateProductionBatchRequest);
      }
      onRefresh();
      setShowForm(false);
      setEditingId(null);
      setFormData({
        batch_no: '',
        product_name: '',
        status: 'pending'
      });
    } catch (error) {
      alert('操作失败');
      console.error(error);
    }
  };

  const handleEdit = (batch: ProductionBatch) => {
    setEditingId(batch.id);
    setFormData({
      batch_no: batch.batch_no,
      product_name: batch.product_name,
      formula_id: batch.formula_id || undefined,
      process_id: batch.process_id || undefined,
      planned_quantity: batch.planned_quantity || undefined,
      actual_quantity: batch.actual_quantity || undefined,
      unit: batch.unit || undefined,
      start_date: batch.start_date ? new Date(batch.start_date).toISOString().split('T')[0] : undefined,
      end_date: batch.end_date ? new Date(batch.end_date).toISOString().split('T')[0] : undefined,
      status: batch.status,
      operator: batch.operator || undefined,
      remarks: batch.remarks || undefined
    });
    setShowForm(true);
  };

  const handleDeleteClick = async (id: string) => {
    if (confirm('确定删除此批次?')) {
      await onDelete(id);
      onRefresh();
    }
  };

  const getStatusText = (status: string) => {
    const map: Record<string, string> = {
      pending: '待生产',
      in_progress: '生产中',
      completed: '已完成',
      cancelled: '已取消'
    };
    return map[status] || status;
  };

  const getStatusColor = (status: string) => {
    const map: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return map[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">生产批次管理</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2"
        >
          {showForm ? '✕ 取消' : '➕ 新建批次'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4">
            {editingId ? '编辑生产批次' : '新建生产批次'}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">批次编号</label>
              <input
                type="text"
                required
                value={formData.batch_no || ''}
                onChange={(e) => setFormData({ ...formData, batch_no: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">产品名称</label>
              <input
                type="text"
                required
                value={formData.product_name || ''}
                onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">配方</label>
              <select
                value={formData.formula_id || ''}
                onChange={(e) => setFormData({ ...formData, formula_id: e.target.value || undefined })}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">-- 无配方 --</option>
                {formulas.map((f) => (
                  <option key={f.id} value={f.id}>{f.name} ({f.formula_no})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">生产流程</label>
              <select
                value={formData.process_id || ''}
                onChange={(e) => setFormData({ ...formData, process_id: e.target.value || undefined })}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">-- 无流程 --</option>
                {processes.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.process_no})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">计划数量</label>
              <input
                type="number"
                value={formData.planned_quantity || ''}
                onChange={(e) => setFormData({ ...formData, planned_quantity: e.target.value ? parseFloat(e.target.value) : undefined })}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">实际数量</label>
              <input
                type="number"
                value={formData.actual_quantity || ''}
                onChange={(e) => setFormData({ ...formData, actual_quantity: e.target.value ? parseFloat(e.target.value) : undefined })}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">单位</label>
              <input
                type="text"
                value={formData.unit || ''}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
                placeholder="如: kg, 个"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">操作员</label>
              <input
                type="text"
                value={formData.operator || ''}
                onChange={(e) => setFormData({ ...formData, operator: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">开始日期</label>
              <input
                type="date"
                value={formData.start_date || ''}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">结束日期</label>
              <input
                type="date"
                value={formData.end_date || ''}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
              <select
                value={formData.status || 'pending'}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="pending">待生产</option>
                <option value="in_progress">生产中</option>
                <option value="completed">已完成</option>
                <option value="cancelled">已取消</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
              <textarea
                value={formData.remarks || ''}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
                rows={2}
              />
            </div>
            <div className="col-span-2 flex gap-3">
              <button
                type="submit"
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
              >
                保存
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
                className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600"
              >
                取消
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">批次编号</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">产品</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">数量</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">日期</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {batches.map((batch) => (
              <tr key={batch.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-mono text-sm">{batch.batch_no}</td>
                <td className="px-6 py-4 font-medium">{batch.product_name}</td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {batch.planned_quantity} {batch.unit || ''}
                  {batch.actual_quantity && <span className="text-green-600 ml-2">实际: {batch.actual_quantity}</span>}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(batch.status)}`}>
                    {getStatusText(batch.status)}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {batch.start_date ? new Date(batch.start_date).toLocaleDateString('zh-CN') : '-'}
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(batch)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => handleDeleteClick(batch.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      删除
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {batches.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            暂无生产批次数据
          </div>
        )}
      </div>
    </div>
  );
}

function StatisticsTab({
  statistics,
  batches,
  onRefresh,
  onCreate
}: {
  statistics: ProductionStatistics[];
  batches: ProductionBatch[];
  onRefresh: () => void;
  onCreate: (data: CreateProductionStatisticsRequest) => Promise<ProductionStatistics>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<CreateProductionStatisticsRequest>({
    stat_date: new Date().toISOString().split('T')[0]
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onCreate(formData);
      onRefresh();
      setShowForm(false);
      setFormData({
        stat_date: new Date().toISOString().split('T')[0]
      });
    } catch (error) {
      alert('操作失败');
      console.error(error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">生产统计</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2"
        >
          {showForm ? '✕ 取消' : '➕ 添加统计'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4">添加生产统计</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">统计日期</label>
              <input
                type="date"
                required
                value={formData.stat_date}
                onChange={(e) => setFormData({ ...formData, stat_date: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">关联批次</label>
              <select
                value={formData.batch_id || ''}
                onChange={(e) => setFormData({ ...formData, batch_id: e.target.value || undefined })}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">-- 无批次 --</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>{b.product_name} ({b.batch_no})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">产出数量</label>
              <input
                type="number"
                value={formData.output_quantity || ''}
                onChange={(e) => setFormData({ ...formData, output_quantity: e.target.value ? parseFloat(e.target.value) : undefined })}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">不良数量</label>
              <input
                type="number"
                value={formData.reject_quantity || ''}
                onChange={(e) => setFormData({ ...formData, reject_quantity: e.target.value ? parseFloat(e.target.value) : undefined })}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">合格率 (%)</label>
              <input
                type="number"
                step="0.01"
                value={formData.pass_rate || ''}
                onChange={(e) => setFormData({ ...formData, pass_rate: e.target.value ? parseFloat(e.target.value) : undefined })}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">周期 (分钟)</label>
              <input
                type="number"
                value={formData.cycle_time || ''}
                onChange={(e) => setFormData({ ...formData, cycle_time: e.target.value ? parseFloat(e.target.value) : undefined })}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
              <textarea
                value={formData.remarks || ''}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
                rows={2}
              />
            </div>
            <div className="col-span-2 flex gap-3">
              <button
                type="submit"
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
              >
                保存
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600"
              >
                取消
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">日期</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">产出</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">不良</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">合格率</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">周期</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {statistics.map((stat) => (
              <tr key={stat.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium">
                  {new Date(stat.stat_date).toLocaleDateString('zh-CN')}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{stat.output_quantity || '-'}</td>
                <td className="px-6 py-4 text-sm text-red-600">{stat.reject_quantity || '-'}</td>
                <td className="px-6 py-4">
                  {stat.pass_rate ? (
                    <span className={`font-medium ${stat.pass_rate >= 90 ? 'text-green-600' : stat.pass_rate >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {stat.pass_rate}%
                    </span>
                  ) : '-'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {stat.cycle_time ? `${stat.cycle_time} 分钟` : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {statistics.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            暂无统计数据
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
