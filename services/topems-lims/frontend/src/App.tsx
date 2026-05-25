import { useState, useEffect } from 'react';

interface Sample {
  id: string;
  sample_id: string;
  name: string;
  description: string;
  sample_type: string;
  status: string;
  received_date: string;
  analysis_date: string | null;
  created_by: string;
  created_at: string;
}

interface TestRecord {
  id: string;
  sample_id: string;
  test_name: string;
  test_method: string;
  status: string;
  result: string | null;
  unit: string | null;
  standard: string | null;
  tested_by: string | null;
  tested_date: string | null;
  created_at: string;
}

interface Equipment {
  id: string;
  name: string;
  model: string;
  serial_number: string;
  status: string;
  location: string;
  last_calibration_date: string | null;
  next_calibration_date: string | null;
  created_at: string;
}

function App() {
  const [activeTab, setActiveTab] = useState<'samples' | 'tests' | 'equipments'>('samples');
  const [samples, setSamples] = useState<Sample[]>([]);
  const [testRecords, setTestRecords] = useState<TestRecord[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [samplesRes, testsRes, equipmentsRes] = await Promise.all([
        fetch('/api/v1/samples'),
        fetch('/api/v1/test-records'),
        fetch('/api/v1/equipments'),
      ]);

      const samplesData = await samplesRes.json();
      const testsData = await testsRes.json();
      const equipmentsData = await equipmentsRes.json();

      if (samplesData.success) setSamples(samplesData.data);
      if (testsData.success) setTestRecords(testsData.data);
      if (equipmentsData.success) setEquipments(equipmentsData.data);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case '已完成':
      case '正常':
        return '#059669';
      case '待检测':
        return '#2563eb';
      case '检测中':
        return '#f59e0b';
      default:
        return '#6b7280';
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>加载中...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '2rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ color: '#0f172a', margin: 0, fontSize: '2rem' }}>
            🔬 TOPEMS-LIMS 实验室信息管理系统
          </h1>
          <p style={{ color: '#64748b', marginTop: '0.5rem' }}>
            样品管理、测试记录、设备管理一体化平台
          </p>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
          <button
            onClick={() => setActiveTab('samples')}
            style={{
              padding: '0.75rem 1.5rem',
              border: activeTab === 'samples' ? '2px solid #7c3aed' : '2px solid #e2e8f0',
              borderRadius: '0.5rem',
              background: activeTab === 'samples' ? '#f5f3ff' : '#fff',
              color: activeTab === 'samples' ? '#7c3aed' : '#475569',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            🧫 样品管理
          </button>
          <button
            onClick={() => setActiveTab('tests')}
            style={{
              padding: '0.75rem 1.5rem',
              border: activeTab === 'tests' ? '2px solid #7c3aed' : '2px solid #e2e8f0',
              borderRadius: '0.5rem',
              background: activeTab === 'tests' ? '#f5f3ff' : '#fff',
              color: activeTab === 'tests' ? '#7c3aed' : '#475569',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            📊 测试记录
          </button>
          <button
            onClick={() => setActiveTab('equipments')}
            style={{
              padding: '0.75rem 1.5rem',
              border: activeTab === 'equipments' ? '2px solid #7c3aed' : '2px solid #e2e8f0',
              borderRadius: '0.5rem',
              background: activeTab === 'equipments' ? '#f5f3ff' : '#fff',
              color: activeTab === 'equipments' ? '#7c3aed' : '#475569',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            ⚙️ 设备管理
          </button>
        </div>

        {activeTab === 'samples' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ color: '#1e293b', margin: 0 }}>样品列表</h2>
              <button
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#7c3aed',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                + 新增样品
              </button>
            </div>

            <div style={{ display: 'grid', gap: '1rem' }}>
              {samples.map((sample) => (
                <div
                  key={sample.id}
                  style={{
                    background: '#fff',
                    padding: '1.5rem',
                    borderRadius: '0.75rem',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.1rem' }}>
                          {sample.name}
                        </h3>
                        <span style={{ fontSize: '0.875rem', color: '#64748b', fontFamily: 'monospace' }}>
                          {sample.sample_id}
                        </span>
                      </div>
                      <p style={{ color: '#64748b', margin: '0.5rem 0 0 0' }}>
                        {sample.description}
                      </p>
                      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem' }}>
                        <span
                          style={{
                            background: getStatusColor(sample.status),
                            color: '#fff',
                            padding: '0.25rem 0.75rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                          }}
                        >
                          {sample.status}
                        </span>
                        <span
                          style={{
                            background: '#e0e7ff',
                            color: '#4f46e5',
                            padding: '0.25rem 0.75rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                          }}
                        >
                          {sample.sample_type}
                        </span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '0.875rem', color: '#64748b' }}>
                      <div>收样: {sample.received_date}</div>
                      {sample.analysis_date && <div>检测: {sample.analysis_date}</div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'tests' && (
          <div>
            <h2 style={{ color: '#1e293b', marginBottom: '1.5rem' }}>测试记录</h2>
            <div style={{ display: 'grid', gap: '1rem' }}>
              {testRecords.map((record) => (
                <div
                  key={record.id}
                  style={{
                    background: '#fff',
                    padding: '1.5rem',
                    borderRadius: '0.75rem',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div>
                      <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.1rem' }}>
                        {record.test_name}
                      </h3>
                      <p style={{ color: '#64748b', margin: '0.5rem 0 0 0' }}>
                        方法: {record.test_method}
                      </p>
                      <div style={{ marginTop: '1rem' }}>
                        {record.result && (
                          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                            <div style={{ 
                              background: '#f0fdf4', 
                              padding: '0.5rem 1rem', 
                              borderRadius: '0.375rem',
                              border: '1px solid #86efac'
                            }}>
                              <span style={{ fontSize: '0.75rem', color: '#166534', display: 'block' }}>结果</span>
                              <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#166534' }}>
                                {record.result} {record.unit}
                              </span>
                            </div>
                            <div style={{ 
                              background: '#fffbeb', 
                              padding: '0.5rem 1rem', 
                              borderRadius: '0.375rem',
                              border: '1px solid #fcd34d'
                            }}>
                              <span style={{ fontSize: '0.75rem', color: '#92400e', display: 'block' }}>标准</span>
                              <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#92400e' }}>
                                {record.standard}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
                        <span
                          style={{
                            background: getStatusColor(record.status),
                            color: '#fff',
                            padding: '0.25rem 0.75rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                          }}
                        >
                          {record.status}
                        </span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '0.875rem', color: '#64748b' }}>
                      {record.tested_date && <div>检测日期: {record.tested_date}</div>}
                      {record.tested_by && <div>检测员: {record.tested_by}</div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'equipments' && (
          <div>
            <h2 style={{ color: '#1e293b', marginBottom: '1.5rem' }}>设备管理</h2>
            <div style={{ display: 'grid', gap: '1rem' }}>
              {equipments.map((equip) => (
                <div
                  key={equip.id}
                  style={{
                    background: '#fff',
                    padding: '1.5rem',
                    borderRadius: '0.75rem',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div>
                      <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.1rem' }}>
                        {equip.name}
                      </h3>
                      <p style={{ color: '#64748b', margin: '0.25rem 0 0 0' }}>
                        {equip.model} · {equip.serial_number}
                      </p>
                      <p style={{ color: '#64748b', margin: '0.5rem 0 0 0', fontSize: '0.875rem' }}>
                        位置: {equip.location}
                      </p>
                      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
                        <span
                          style={{
                            background: getStatusColor(equip.status),
                            color: '#fff',
                            padding: '0.25rem 0.75rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                          }}
                        >
                          {equip.status}
                        </span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '0.875rem', color: '#64748b' }}>
                      {equip.last_calibration_date && (
                        <div>上次校准: {equip.last_calibration_date}</div>
                      )}
                      {equip.next_calibration_date && (
                        <div style={{ marginTop: '0.25rem' }}>下次校准: {equip.next_calibration_date}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

