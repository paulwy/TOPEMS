import { useState, useEffect } from 'react';

interface Workflow {
  id: string;
  name: string;
  description: string | null;
  status: string;
  created_at: string;
}

interface Approval {
  id: string;
  title: string;
  status: string;
  applicant: string;
  created_at: string;
}

function App() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWorkflows();
    fetchApprovals();
  }, []);

  const fetchWorkflows = async () => {
    try {
      const res = await fetch('/api/v1/workflows');
      const data = await res.json();
      if (data.success) {
        setWorkflows(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch workflows:', err);
    }
  };

  const fetchApprovals = async () => {
    try {
      const res = await fetch('/api/v1/approvals');
      const data = await res.json();
      if (data.success) {
        setApprovals(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch approvals:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'active': return '#4CAF50';
      case 'pending': return '#FF9800';
      default: return '#666';
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif', maxWidth: '900px', margin: '0 auto' }}>
      <h1 style={{ color: '#689F38', marginBottom: '1rem' }}>
        ⚙️ TOPEMS-FLOW 工作流服务
      </h1>
      
      <div style={{ background: '#f5f7fa', padding: '1.5rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>
        <p style={{ margin: '0.25rem 0' }}><strong>服务状态：</strong> <span style={{ color: '#4CAF50' }}>✅ 运行中</span></p>
        <p style={{ margin: '0.25rem 0' }}><strong>功能：</strong> OA 审批、工作流引擎、流程管理</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
        <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid #eee' }}>
          <h2 style={{ color: '#333', marginTop: 0 }}>工作流</h2>
          {loading ? (
            <p>加载中...</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, marginTop: '1rem' }}>
              {workflows.map((wf) => (
                <li key={wf.id} style={{ 
                  padding: '0.75rem', 
                  borderBottom: '1px solid #eee',
                  borderRadius: '0.25rem',
                  marginBottom: '0.5rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 'bold' }}>{wf.name}</div>
                    <span style={{ 
                      background: getStatusColor(wf.status), 
                      color: '#fff', 
                      padding: '0.25rem 0.5rem', 
                      fontSize: '0.75rem',
                      borderRadius: '0.25rem'
                    }}>
                      {wf.status}
                    </span>
                  </div>
                  <div style={{ color: '#666', fontSize: '0.875rem' }}>{wf.description || ''}</div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid #eee' }}>
          <h2 style={{ color: '#333', marginTop: 0 }}>待审批事项</h2>
          {loading ? (
            <p>加载中...</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, marginTop: '1rem' }}>
              {approvals.map((app) => (
                <li key={app.id} style={{ 
                  padding: '0.75rem', 
                  borderBottom: '1px solid #eee',
                  borderRadius: '0.25rem',
                  marginBottom: '0.5rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 'bold' }}>{app.title}</div>
                    <span style={{ 
                      background: getStatusColor(app.status), 
                      color: '#fff', 
                      padding: '0.25rem 0.5rem', 
                      fontSize: '0.75rem',
                      borderRadius: '0.25rem'
                    }}>
                      {app.status}
                    </span>
                  </div>
                  <div style={{ color: '#666', fontSize: '0.875rem' }}>
                    申请人: {app.applicant}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
