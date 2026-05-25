import { useState, useEffect } from 'react';

interface Project {
  id: string;
  name: string;
  description: string;
  status: string;
  priority: string;
  start_date: string;
  end_date: string | null;
  created_by: string;
  created_at: string;
}

interface Experiment {
  id: string;
  project_id: string;
  name: string;
  description: string;
  status: string;
  experiment_type: string;
  created_by: string;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

interface Formula {
  id: string;
  project_id: string;
  name: string;
  version: string;
  ingredients: Array<{
    id: string;
    name: string;
    quantity: number;
    unit: string;
    percentage: number;
  }>;
  created_by: string;
  created_at: string;
}

function App() {
  const [activeTab, setActiveTab] = useState<'projects' | 'experiments' | 'formulas'>('projects');
  const [projects, setProjects] = useState<Project[]>([]);
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState<'project' | 'experiment' | null>(null);
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    priority: '中',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [projectsRes, experimentsRes, formulasRes] = await Promise.all([
        fetch('/api/v1/projects'),
        fetch('/api/v1/experiments'),
        fetch('/api/v1/formulas'),
      ]);

      const projectsData = await projectsRes.json();
      const experimentsData = await experimentsRes.json();
      const formulasData = await formulasRes.json();

      if (projectsData.success) setProjects(projectsData.data);
      if (experimentsData.success) setExperiments(experimentsData.data);
      if (formulasData.success) setFormulas(formulasData.data);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newProject,
          end_date: newProject.end_date || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
        setShowModal(null);
        setNewProject({
          name: '',
          description: '',
          priority: '中',
          start_date: new Date().toISOString().split('T')[0],
          end_date: '',
        });
      }
    } catch (err) {
      console.error('Failed to create project:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case '进行中': return '#059669';
      case '待开始': return '#2563eb';
      case '已完成': return '#059669';
      case '暂停': return '#dc2626';
      default: return '#6b7280';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case '高': return '#dc2626';
      case '中': return '#f59e0b';
      case '低': return '#10b981';
      default: return '#6b7280';
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
            🧪 TOPEMS-RS 科研研发管理系统
          </h1>
          <p style={{ color: '#64748b', marginTop: '0.5rem' }}>
            研发项目管理、实验数据管理、配方管理一体化平台
          </p>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
          <button
            onClick={() => setActiveTab('projects')}
            style={{
              padding: '0.75rem 1.5rem',
              border: activeTab === 'projects' ? '2px solid #059669' : '2px solid #e2e8f0',
              borderRadius: '0.5rem',
              background: activeTab === 'projects' ? '#ecfdf5' : '#fff',
              color: activeTab === 'projects' ? '#059669' : '#475569',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            📋 研发项目
          </button>
          <button
            onClick={() => setActiveTab('experiments')}
            style={{
              padding: '0.75rem 1.5rem',
              border: activeTab === 'experiments' ? '2px solid #059669' : '2px solid #e2e8f0',
              borderRadius: '0.5rem',
              background: activeTab === 'experiments' ? '#ecfdf5' : '#fff',
              color: activeTab === 'experiments' ? '#059669' : '#475569',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            🔬 实验管理
          </button>
          <button
            onClick={() => setActiveTab('formulas')}
            style={{
              padding: '0.75rem 1.5rem',
              border: activeTab === 'formulas' ? '2px solid #059669' : '2px solid #e2e8f0',
              borderRadius: '0.5rem',
              background: activeTab === 'formulas' ? '#ecfdf5' : '#fff',
              color: activeTab === 'formulas' ? '#059669' : '#475569',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            🧪 配方管理
          </button>
        </div>

        {activeTab === 'projects' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ color: '#1e293b', margin: 0 }}>研发项目列表</h2>
              <button
                onClick={() => setShowModal('project')}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#059669',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                + 新建项目
              </button>
            </div>

            <div style={{ display: 'grid', gap: '1rem' }}>
              {projects.map((project) => (
                <div
                  key={project.id}
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
                        {project.name}
                      </h3>
                      <p style={{ color: '#64748b', margin: '0.5rem 0 0 0' }}>
                        {project.description}
                      </p>
                      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem' }}>
                        <span
                          style={{
                            background: getStatusColor(project.status),
                            color: '#fff',
                            padding: '0.25rem 0.75rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                          }}
                        >
                          {project.status}
                        </span>
                        <span
                          style={{
                            background: getPriorityColor(project.priority),
                            color: '#fff',
                            padding: '0.25rem 0.75rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                          }}
                        >
                          优先级: {project.priority}
                        </span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '0.875rem', color: '#64748b' }}>
                      <div>开始: {project.start_date}</div>
                      {project.end_date && <div>结束: {project.end_date}</div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'experiments' && (
          <div>
            <h2 style={{ color: '#1e293b', marginBottom: '1.5rem' }}>实验管理</h2>
            <div style={{ display: 'grid', gap: '1rem' }}>
              {experiments.map((exp) => (
                <div
                  key={exp.id}
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
                        {exp.name}
                      </h3>
                      <p style={{ color: '#64748b', margin: '0.5rem 0 0 0' }}>
                        {exp.description}
                      </p>
                      <div style={{ marginTop: '0.75rem' }}>
                        <span
                          style={{
                            background: getStatusColor(exp.status),
                            color: '#fff',
                            padding: '0.25rem 0.75rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                          }}
                        >
                          {exp.status}
                        </span>
                        <span
                          style={{
                            background: '#e0e7ff',
                            color: '#4f46e5',
                            padding: '0.25rem 0.75rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            marginLeft: '0.5rem',
                          }}
                        >
                          {exp.experiment_type}
                        </span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '0.875rem', color: '#64748b' }}>
                      {exp.started_at && <div>开始: {exp.started_at.split('T')[0]}</div>}
                      {exp.completed_at && <div>完成: {exp.completed_at.split('T')[0]}</div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'formulas' && (
          <div>
            <h2 style={{ color: '#1e293b', marginBottom: '1.5rem' }}>配方管理</h2>
            <div style={{ display: 'grid', gap: '1rem' }}>
              {formulas.map((formula) => (
                <div
                  key={formula.id}
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
                        {formula.name}
                      </h3>
                      <p style={{ color: '#64748b', margin: '0.25rem 0 0 0' }}>
                        版本: {formula.version}
                      </p>
                      <div style={{ marginTop: '1rem' }}>
                        <h4 style={{ margin: '0 0 0.5rem 0', color: '#475569', fontSize: '0.875rem' }}>
                          成分:
                        </h4>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                          {formula.ingredients.map((ing) => (
                            <div
                              key={ing.id}
                              style={{
                                background: '#f8fafc',
                                padding: '0.5rem 0.75rem',
                                borderRadius: '0.375rem',
                                border: '1px solid #e2e8f0',
                                fontSize: '0.875rem',
                              }}
                            >
                              {ing.name}: {ing.percentage}%
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                      创建: {formula.created_at.split('T')[0]}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {showModal === 'project' && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}
          >
            <div style={{ background: '#fff', padding: '2rem', borderRadius: '0.75rem', maxWidth: '500px', width: '100%' }}>
              <h3 style={{ margin: '0 0 1.5rem 0', color: '#1e293b' }}>新建研发项目</h3>
              <form onSubmit={handleCreateProject}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: '#475569', fontWeight: 600 }}>
                    项目名称
                  </label>
                  <input
                    type="text"
                    required
                    value={newProject.name}
                    onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #e2e8f0',
                      borderRadius: '0.375rem',
                      fontSize: '1rem',
                    }}
                  />
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: '#475569', fontWeight: 600 }}>
                    项目描述
                  </label>
                  <textarea
                    required
                    value={newProject.description}
                    onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #e2e8f0',
                      borderRadius: '0.375rem',
                      fontSize: '1rem',
                    }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#475569', fontWeight: 600 }}>
                      优先级
                    </label>
                    <select
                      value={newProject.priority}
                      onChange={(e) => setNewProject({ ...newProject, priority: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #e2e8f0',
                        borderRadius: '0.375rem',
                        fontSize: '1rem',
                      }}
                    >
                      <option value="高">高</option>
                      <option value="中">中</option>
                      <option value="低">低</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#475569', fontWeight: 600 }}>
                      开始日期
                    </label>
                    <input
                      type="date"
                      required
                      value={newProject.start_date}
                      onChange={(e) => setNewProject({ ...newProject, start_date: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #e2e8f0',
                        borderRadius: '0.375rem',
                        fontSize: '1rem',
                      }}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setShowModal(null)}
                    style={{
                      padding: '0.75rem 1.5rem',
                      border: '1px solid #e2e8f0',
                      background: '#fff',
                      color: '#475569',
                      borderRadius: '0.375rem',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: '#059669',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '0.375rem',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    创建项目
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

