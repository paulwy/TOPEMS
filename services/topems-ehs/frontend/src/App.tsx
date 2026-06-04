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

interface EmergencyPlan {
  id: string;
  plan_id: string;
  title: string;
  type_: string;
  scope: string;
  version: string;
  status: string;
  effective_date: string;
  department: string;
}

interface DrillRecord {
  id: string;
  drill_id: string;
  title: string;
  type_: string;
  planned_date: string;
  actual_date?: string;
  participants: number;
  duration: number;
  score?: number;
  status: string;
  evaluator?: string;
  remarks?: string;
}

function App() {
  const [activeTab, setActiveTab] = useState<'hazards' | 'incidents' | 'inspections' | 'plans' | 'drills'>('hazards');
  const [hazards, setHazards] = useState<Hazard[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [inspections, setInspections] = useState<EquipmentInspection[]>([]);
  const [emergencyPlans, setEmergencyPlans] = useState<EmergencyPlan[]>([]);
  const [drillRecords, setDrillRecords] = useState<DrillRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

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

  const [planForm, setPlanForm] = useState({
    title: '',
    type_: '火灾预案',
    scope: '',
    version: 'V1.0',
    effective_date: '',
    department: '',
  });

  const [drillForm, setDrillForm] = useState({
    title: '',
    type_: '消防演练',
    planned_date: '',
    actual_date: '',
    participants: 0,
    duration: 0,
    status: '待执行',
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

      if (hazardsData.success) setHazards(hazardsData.data || []);
      if (incidentsData.success) setIncidents(incidentsData.data || []);
      if (inspectionsData.success) setInspections(inspectionsData.data || []);

      const [plansRes, drillsRes] = await Promise.all([
        fetch('/api/v1/emergency-plans'),
        fetch('/api/v1/drill-records'),
      ]);
      const plansData = await plansRes.json();
      const drillsData = await drillsRes.json();
      if (plansData.success) setEmergencyPlans(plansData.data || []);
      if (drillsData.success) setDrillRecords(drillsData.data || []);
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

  const handleAddPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    const newPlan: EmergencyPlan = {
      id: Date.now().toString(),
      plan_id: `EP-2024-${String(emergencyPlans.length + 1).padStart(3, '0')}`,
      title: planForm.title,
      type_: planForm.type_,
      scope: planForm.scope,
      version: planForm.version,
      status: '有效',
      effective_date: planForm.effective_date,
      department: planForm.department,
    };
    setEmergencyPlans([...emergencyPlans, newPlan]);
    setShowForm(false);
    setPlanForm({ title: '', type_: '火灾预案', scope: '', version: 'V1.0', effective_date: '', department: '' });
  };

  const handleAddDrill = async (e: React.FormEvent) => {
    e.preventDefault();
    const newDrill: DrillRecord = {
      id: Date.now().toString(),
      drill_id: `DR-2024-${String(drillRecords.length + 1).padStart(3, '0')}`,
      title: drillForm.title,
      type_: drillForm.type_,
      planned_date: drillForm.planned_date,
      actual_date: drillForm.actual_date,
      participants: drillForm.participants,
      duration: drillForm.duration,
      status: drillForm.status,
    };
    setDrillRecords([...drillRecords, newDrill]);
    setShowForm(false);
    setDrillForm({ title: '', type_: '消防演练', planned_date: '', actual_date: '', participants: 0, duration: 0, status: '待执行' });
  };

  const handleDeletePlan = (id: string) => {
    setEmergencyPlans(emergencyPlans.filter(p => p.id !== id));
  };

  const handleDeleteDrill = (id: string) => {
    setDrillRecords(drillRecords.filter(d => d.id !== id));
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
          <button
            onClick={() => { setActiveTab('plans'); setShowForm(false); }}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'plans'
                ? 'bg-orange-600 text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            📋 应急预案
          </button>
          <button
            onClick={() => { setActiveTab('drills'); setShowForm(false); }}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'drills'
                ? 'bg-orange-600 text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            🚨 演练记录
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

        {activeTab === 'plans' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">应急预案列表</h2>
              <button
                onClick={() => setShowForm(!showForm)}
                className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700"
              >
                {showForm ? '取消' : '添加预案'}
              </button>
            </div>

            {showForm && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-medium mb-4">添加应急预案</h3>
                <form onSubmit={handleAddPlan} className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">预案标题</label>
                    <input
                      type="text"
                      value={planForm.title}
                      onChange={(e) => setPlanForm({...planForm, title: e.target.value})}
                      className="w-full border border-gray-300 rounded-md p-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">预案类型</label>
                    <select
                      value={planForm.type_}
                      onChange={(e) => setPlanForm({...planForm, type_: e.target.value})}
                      className="w-full border border-gray-300 rounded-md p-2"
                    >
                      <option value="火灾预案">火灾预案</option>
                      <option value="泄漏预案">泄漏预案</option>
                      <option value="急救预案">急救预案</option>
                      <option value="其他预案">其他预案</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">适用范围</label>
                    <input
                      type="text"
                      value={planForm.scope}
                      onChange={(e) => setPlanForm({...planForm, scope: e.target.value})}
                      className="w-full border border-gray-300 rounded-md p-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">版本号</label>
                    <input
                      type="text"
                      value={planForm.version}
                      onChange={(e) => setPlanForm({...planForm, version: e.target.value})}
                      className="w-full border border-gray-300 rounded-md p-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">生效日期</label>
                    <input
                      type="date"
                      value={planForm.effective_date}
                      onChange={(e) => setPlanForm({...planForm, effective_date: e.target.value})}
                      className="w-full border border-gray-300 rounded-md p-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">负责部门</label>
                    <input
                      type="text"
                      value={planForm.department}
                      onChange={(e) => setPlanForm({...planForm, department: e.target.value})}
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

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">预案编号</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">标题</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">类型</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">适用范围</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">版本</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {emergencyPlans.map((plan) => (
                    <tr key={plan.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">{plan.plan_id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{plan.title}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{plan.type_}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{plan.scope}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{plan.version}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${plan.status === '有效' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          {plan.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          onClick={() => handleDeletePlan(plan.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          删除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'drills' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">演练记录列表</h2>
              <button
                onClick={() => setShowForm(!showForm)}
                className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700"
              >
                {showForm ? '取消' : '添加演练'}
              </button>
            </div>

            {showForm && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-medium mb-4">添加演练记录</h3>
                <form onSubmit={handleAddDrill} className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">演练标题</label>
                    <input
                      type="text"
                      value={drillForm.title}
                      onChange={(e) => setDrillForm({...drillForm, title: e.target.value})}
                      className="w-full border border-gray-300 rounded-md p-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">演练类型</label>
                    <select
                      value={drillForm.type_}
                      onChange={(e) => setDrillForm({...drillForm, type_: e.target.value})}
                      className="w-full border border-gray-300 rounded-md p-2"
                    >
                      <option value="消防演练">消防演练</option>
                      <option value="泄漏演练">泄漏演练</option>
                      <option value="急救演练">急救演练</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">计划日期</label>
                    <input
                      type="date"
                      value={drillForm.planned_date}
                      onChange={(e) => setDrillForm({...drillForm, planned_date: e.target.value})}
                      className="w-full border border-gray-300 rounded-md p-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">实际日期</label>
                    <input
                      type="date"
                      value={drillForm.actual_date}
                      onChange={(e) => setDrillForm({...drillForm, actual_date: e.target.value})}
                      className="w-full border border-gray-300 rounded-md p-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">参与人数</label>
                    <input
                      type="number"
                      value={drillForm.participants}
                      onChange={(e) => setDrillForm({...drillForm, participants: parseInt(e.target.value) || 0})}
                      className="w-full border border-gray-300 rounded-md p-2"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">持续时长(分钟)</label>
                    <input
                      type="number"
                      value={drillForm.duration}
                      onChange={(e) => setDrillForm({...drillForm, duration: parseInt(e.target.value) || 0})}
                      className="w-full border border-gray-300 rounded-md p-2"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                    <select
                      value={drillForm.status}
                      onChange={(e) => setDrillForm({...drillForm, status: e.target.value})}
                      className="w-full border border-gray-300 rounded-md p-2"
                    >
                      <option value="待执行">待执行</option>
                      <option value="已完成">已完成</option>
                      <option value="已取消">已取消</option>
                    </select>
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

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">演练编号</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">标题</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">类型</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">计划日期</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">参与人数</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">评分</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {drillRecords.map((drill) => (
                    <tr key={drill.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">{drill.drill_id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{drill.title}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{drill.type_}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{drill.planned_date}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{drill.participants}人</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {drill.score ? `${drill.score}分` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          drill.status === '已完成' ? 'bg-green-100 text-green-800' :
                          drill.status === '待执行' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {drill.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          onClick={() => handleDeleteDrill(drill.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          删除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
