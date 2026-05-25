import { useState, useEffect } from 'react';

interface Hazard {
  id: string;
  hazard_id: string;
  description: string;
  risk_level: string;
  location: string;
  status: string;
  reported_date: string;
}

interface Incident {
  id: string;
  incident_id: string;
  title: string;
  type_: string;
  severity: string;
  status: string;
  occurred_date: string;
  department: string;
}

interface EquipmentInspection {
  id: string;
  equipment_name: string;
  equipment_id: string;
  inspection_date: string;
  inspector: string;
  status: string;
  remarks: string;
  next_check_date?: string;
}

function App() {
  const [activeTab, setActiveTab] = useState<'hazards' | 'incidents' | 'inspections'>('hazards');
  const [hazards, setHazards] = useState<Hazard[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [inspections, setInspections] = useState<EquipmentInspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [hazardForm, setHazardForm] = useState({
    description: '',
    risk_level: '中风险',
    location: '',
  });

  const [incidentForm, setIncidentForm] = useState({
    title: '',
    type_: '安全事件',
    severity: '中等',
    department: '',
  });

  const [inspectionForm, setInspectionForm] = useState({
    equipment_name: '',
    equipment_id: '',
    inspector: '',
    status: '合格',
    remarks: '',
    next_check_date: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [hazardsRes, incidentsRes, inspectionsRes] = await Promise.all([
        fetch('/api/v1/hazards'),
        fetch('/api/v1/incidents'),
        fetch('/api/v1/equipment-inspections'),
      ]);

      const hazardsData = await hazardsRes.json();
      const incidentsData = await incidentsRes.json();
      const inspectionsData = await inspectionsRes.json();

      if (hazardsData.success) setHazards(hazardsData.data);
      if (incidentsData.success) setIncidents(incidentsData.data);
      if (inspectionsData.success) setInspections(inspectionsData.data);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddHazard = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/hazards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hazardForm),
      });
      const data = await res.json();
      if (data.success) {
        setShowForm(false);
        setHazardForm({
          description: '',
          risk_level: '中风险',
          location: '',
        });
        fetchData();
      }
    } catch (err) {
      console.error('Failed to add hazard:', err);
    }
  };

  const handleAddIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(incidentForm),
      });
      const data = await res.json();
      if (data.success) {
        setShowForm(false);
        setIncidentForm({
          title: '',
          type_: '安全事件',
          severity: '中等',
          department: '',
        });
        fetchData();
      }
    } catch (err) {
      console.error('Failed to add incident:', err);
    }
  };

  const handleAddInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const dataToSend = {
        ...inspectionForm,
        next_check_date: inspectionForm.next_check_date || undefined,
      };
      const res = await fetch('/api/v1/equipment-inspections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend),
      });
      const data = await res.json();
      if (data.success) {
        setShowForm(false);
        setInspectionForm({
          equipment_name: '',
          equipment_id: '',
          inspector: '',
          status: '合格',
          remarks: '',
          next_check_date: '',
        });
        fetchData();
      }
    } catch (err) {
      console.error('Failed to add inspection:', err);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case '高风险':
      case '严重':
        return 'bg-red-100 text-red-800';
      case '中风险':
      case '中等':
        return 'bg-yellow-100 text-yellow-800';
      case '低风险':
      case '轻微':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case '合格':
      case '已处理':
      case '已关闭':
        return 'bg-green-100 text-green-800';
      case '整改中':
      case '处理中':
      case '调查中':
      case '待检':
        return 'bg-yellow-100 text-yellow-800';
      case '不合格':
        return 'bg-red-100 text-red-800';
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
            🛡️ TOPEMS-EHS 安全环保职业健康系统
          </h1>
          <p className="text-gray-600">
            危险源辨识、事故管理、设备检查一体化平台
          </p>
        </div>

        <div className="flex gap-4 mb-6">
          <button
            onClick={() => { setActiveTab('hazards'); setShowForm(false); }}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'hazards'
                ? 'bg-orange-600 text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            ⚠️ 危险源管理
          </button>
          <button
            onClick={() => { setActiveTab('incidents'); setShowForm(false); }}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'incidents'
                ? 'bg-orange-600 text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            🔥 事故管理
          </button>
          <button
            onClick={() => { setActiveTab('inspections'); setShowForm(false); }}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'inspections'
                ? 'bg-orange-600 text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            🔧 设备检查
          </button>
        </div>

        {activeTab === 'hazards' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">危险源列表</h2>
              <button
                onClick={() => setShowForm(!showForm)}
                className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700"
              >
                {showForm ? '取消' : '添加危险源'}
              </button>
            </div>

            {showForm && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-medium mb-4">添加危险源</h3>
                <form onSubmit={handleAddHazard} className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">危险源描述</label>
                    <textarea
                      value={hazardForm.description}
                      onChange={(e) => setHazardForm({...hazardForm, description: e.target.value})}
                      className="w-full border border-gray-300 rounded-md p-2"
                      rows={3}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">风险等级</label>
                    <select
                      value={hazardForm.risk_level}
                      onChange={(e) => setHazardForm({...hazardForm, risk_level: e.target.value})}
                      className="w-full border border-gray-300 rounded-md p-2"
                    >
                      <option value="低风险">低风险</option>
                      <option value="中风险">中风险</option>
                      <option value="高风险">高风险</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">位置</label>
                    <input
                      type="text"
                      value={hazardForm.location}
                      onChange={(e) => setHazardForm({...hazardForm, location: e.target.value})}
                      className="w-full border border-gray-300 rounded-md p-2"
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <button
                      type="submit"
                      className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700"
                    >
                      提交
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="space-y-4">
                {hazards.map((hazard) => (
                  <div
                    key={hazard.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {hazard.hazard_id}
                        </h3>
                        <p className="text-gray-600 mt-1">{hazard.description}</p>
                        <p className="text-sm text-gray-500 mt-2">
                          位置: {hazard.location} · 报告日期: {hazard.reported_date}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(hazard.risk_level)}`}
                        >
                          {hazard.risk_level}
                        </span>
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(hazard.status)}`}
                        >
                          {hazard.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'incidents' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">事故记录</h2>
              <button
                onClick={() => setShowForm(!showForm)}
                className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700"
              >
                {showForm ? '取消' : '添加事故'}
              </button>
            </div>

            {showForm && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-medium mb-4">添加事故记录</h3>
                <form onSubmit={handleAddIncident} className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">事故标题</label>
                    <input
                      type="text"
                      value={incidentForm.title}
                      onChange={(e) => setIncidentForm({...incidentForm, title: e.target.value})}
                      className="w-full border border-gray-300 rounded-md p-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">类型</label>
                    <select
                      value={incidentForm.type_}
                      onChange={(e) => setIncidentForm({...incidentForm, type_: e.target.value})}
                      className="w-full border border-gray-300 rounded-md p-2"
                    >
                      <option value="安全事件">安全事件</option>
                      <option value="环保事件">环保事件</option>
                      <option value="设备故障">设备故障</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">严重程度</label>
                    <select
                      value={incidentForm.severity}
                      onChange={(e) => setIncidentForm({...incidentForm, severity: e.target.value})}
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
                      value={incidentForm.department}
                      onChange={(e) => setIncidentForm({...incidentForm, department: e.target.value})}
                      className="w-full border border-gray-300 rounded-md p-2"
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <button
                      type="submit"
                      className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700"
                    >
                      提交
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="space-y-4">
                {incidents.map((incident) => (
                  <div
                    key={incident.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {incident.title}
                          <span className="ml-3 text-sm text-gray-500 font-mono">
                            {incident.incident_id}
                          </span>
                        </h3>
                        <p className="text-gray-600 mt-1">{incident.type_}</p>
                        <p className="text-sm text-gray-500 mt-2">
                          发生日期: {incident.occurred_date} · 部门: {incident.department}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(incident.severity)}`}
                        >
                          {incident.severity}
                        </span>
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(incident.status)}`}
                        >
                          {incident.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'inspections' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">设备检查记录</h2>
              <button
                onClick={() => setShowForm(!showForm)}
                className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700"
              >
                {showForm ? '取消' : '添加检查'}
              </button>
            </div>

            {showForm && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-medium mb-4">添加设备检查</h3>
                <form onSubmit={handleAddInspection} className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">设备名称</label>
                    <input
                      type="text"
                      value={inspectionForm.equipment_name}
                      onChange={(e) => setInspectionForm({...inspectionForm, equipment_name: e.target.value})}
                      className="w-full border border-gray-300 rounded-md p-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">设备编号</label>
                    <input
                      type="text"
                      value={inspectionForm.equipment_id}
                      onChange={(e) => setInspectionForm({...inspectionForm, equipment_id: e.target.value})}
                      className="w-full border border-gray-300 rounded-md p-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">检查人</label>
                    <input
                      type="text"
                      value={inspectionForm.inspector}
                      onChange={(e) => setInspectionForm({...inspectionForm, inspector: e.target.value})}
                      className="w-full border border-gray-300 rounded-md p-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">检查结果</label>
                    <select
                      value={inspectionForm.status}
                      onChange={(e) => setInspectionForm({...inspectionForm, status: e.target.value})}
                      className="w-full border border-gray-300 rounded-md p-2"
                    >
                      <option value="合格">合格</option>
                      <option value="不合格">不合格</option>
                      <option value="待复检">待复检</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
                    <textarea
                      value={inspectionForm.remarks}
                      onChange={(e) => setInspectionForm({...inspectionForm, remarks: e.target.value})}
                      className="w-full border border-gray-300 rounded-md p-2"
                      rows={3}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">下次检查日期</label>
                    <input
                      type="date"
                      value={inspectionForm.next_check_date}
                      onChange={(e) => setInspectionForm({...inspectionForm, next_check_date: e.target.value})}
                      className="w-full border border-gray-300 rounded-md p-2"
                    />
                  </div>
                  <div></div>
                  <div className="col-span-2">
                    <button
                      type="submit"
                      className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700"
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
                        <h3 className="font-medium text-gray-900">{inspection.equipment_name}</h3>
                        <p className="text-gray-600 mt-1">{inspection.remarks}</p>
                        <p className="text-sm text-gray-500 mt-2">
                          检查日期: {inspection.inspection_date} · 
                          检查人: {inspection.inspector}
                          {inspection.next_check_date && (
                            <> · 下次检查: {inspection.next_check_date}</>
                          )}
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(inspection.status)}`}
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
      </div>
    </div>
  );
}

export default App;
