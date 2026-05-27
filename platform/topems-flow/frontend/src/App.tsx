import { useState, useEffect } from 'react';
import {
  Workflow,
  WorkflowInstance,
  Approval,
  ApprovalRecord,
  InstanceDetailsResponse,
  CreateWorkflowRequest,
  StartInstanceRequest,
  ProcessApprovalRequest,
  WorkflowDefinition,
  ApprovalNode,
} from './types';
import {
  getWorkflows,
  getInstances,
  getApprovals,
  getInstanceDetails,
  startInstance,
  createWorkflow,
  processApproval,
  healthCheck,
} from './api';

const MOCK_USER_ID = '550e8400-e29b-41d4-a716-446655440000';
const MOCK_USER_NAME = '当前用户';

function App() {
  const [activeTab, setActiveTab] = useState<'workflows' | 'instances' | 'approvals' | 'todos'>('workflows');
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [instances, setInstances] = useState<WorkflowInstance[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [myTodos, setMyTodos] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInstance, setSelectedInstance] = useState<InstanceDetailsResponse | null>(null);
  const [showCreateWorkflow, setShowCreateWorkflow] = useState(false);
  const [healthStatus, setHealthStatus] = useState<string>('检查中...');

  useEffect(() => {
    loadData();
    checkHealth();
  }, []);

  const checkHealth = async () => {
    try {
      const status = await healthCheck();
      setHealthStatus(`✅ ${status}`);
    } catch (err) {
      setHealthStatus('❌ 无法连接');
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [wfRes, instRes, appRes, todoRes] = await Promise.all([
        getWorkflows(),
        getInstances(),
        getApprovals(),
        getApprovals(undefined, MOCK_USER_ID, 'pending'),
      ]);
      if (wfRes.success) setWorkflows(wfRes.data || []);
      if (instRes.success) setInstances(instRes.data || []);
      if (appRes.success) setApprovals(appRes.data || []);
      if (todoRes.success) setMyTodos(todoRes.data || []);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadInstanceDetails = async (id: string) => {
    try {
      const res = await getInstanceDetails(id);
      if (res.success) {
        setSelectedInstance(res.data || null);
      }
    } catch (err) {
      console.error('Failed to load instance details:', err);
    }
  };

  const handleCreateWorkflow = async (data: CreateWorkflowRequest) => {
    try {
      const res = await createWorkflow(data);
      if (res.success) {
        setShowCreateWorkflow(false);
        loadData();
      }
    } catch (err) {
      console.error('Failed to create workflow:', err);
    }
  };

  const handleStartInstance = async (workflowId: string, data?: any) => {
    try {
      const req: StartInstanceRequest = {
        workflow_id: workflowId,
        initiator_id: MOCK_USER_ID,
        data,
      };
      const res = await startInstance(req);
      if (res.success) {
        loadData();
      }
    } catch (err) {
      console.error('Failed to start instance:', err);
    }
  };

  const handleProcessApproval = async (
    approvalId: string,
    action: string,
    comment?: string
  ) => {
    try {
      const req: ProcessApprovalRequest = {
        action,
        comment,
        actor_id: MOCK_USER_ID,
        actor_name: MOCK_USER_NAME,
      };
      const res = await processApproval(approvalId, req);
      if (res.success) {
        loadData();
        if (selectedInstance) {
          loadInstanceDetails(selectedInstance.instance.id);
        }
      }
    } catch (err) {
      console.error('Failed to process approval:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
      case 'running':
      case 'approved':
        return '#4CAF50';
      case 'pending':
        return '#FF9800';
      case 'rejected':
      case 'failed':
      case 'cancelled':
        return '#F44336';
      case 'completed':
        return '#2196F3';
      default:
        return '#666';
    }
  };

  return (
    <div style={{ 
      padding: '2rem', 
      fontFamily: 'system-ui, sans-serif', 
      maxWidth: '1400px', 
      margin: '0 auto',
      minHeight: '100vh',
      background: '#f5f7fa'
    }}>
      <header style={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '2rem',
        borderRadius: '1rem',
        marginBottom: '2rem',
        color: 'white',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 700 }}>
          ⚙️ TOPEMS-FLOW 工作流引擎
        </h1>
        <p style={{ margin: '0.5rem 0 0', opacity: 0.9 }}>
          服务状态：{healthStatus}
        </p>
      </header>

      <div style={{ 
        display: 'flex', 
        gap: '0.5rem', 
        marginBottom: '2rem',
        background: 'white',
        padding: '0.5rem',
        borderRadius: '0.5rem',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
      }}>
        {(['workflows', 'instances', 'approvals', 'todos'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              setSelectedInstance(null);
            }}
            style={{
              padding: '0.75rem 1.5rem',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              background: activeTab === tab ? '#667eea' : 'transparent',
              color: activeTab === tab ? 'white' : '#333',
              fontWeight: 500,
              transition: 'all 0.2s ease'
            }}
          >
            {tab === 'workflows' && '📋 工作流'}
            {tab === 'instances' && '🔄 实例'}
            {tab === 'approvals' && '✅ 审批'}
            {tab === 'todos' && `📝 我的待办 ${myTodos.length > 0 ? `(${myTodos.length})` : ''}`}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '3rem' }}>⏳</div>
          <p style={{ color: '#666' }}>加载中...</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: selectedInstance ? '1fr 1fr' : '1fr', gap: '2rem' }}>
          <div>
            {activeTab === 'workflows' && (
              <WorkflowsTab
                workflows={workflows}
                onStartInstance={handleStartInstance}
                onCreateWorkflow={() => setShowCreateWorkflow(true)}
                getStatusColor={getStatusColor}
              />
            )}
            {activeTab === 'instances' && (
              <InstancesTab
                instances={instances}
                onSelectInstance={loadInstanceDetails}
                getStatusColor={getStatusColor}
              />
            )}
            {activeTab === 'approvals' && (
              <ApprovalsTab
                approvals={approvals}
                onProcessApproval={handleProcessApproval}
                getStatusColor={getStatusColor}
              />
            )}
            {activeTab === 'todos' && (
              <ApprovalsTab
                approvals={myTodos}
                onProcessApproval={handleProcessApproval}
                getStatusColor={getStatusColor}
                title="我的待办任务"
              />
            )}
          </div>

          {selectedInstance && (
            <InstanceDetails
              instanceDetails={selectedInstance}
              onProcessApproval={handleProcessApproval}
              onClose={() => setSelectedInstance(null)}
              getStatusColor={getStatusColor}
            />
          )}
        </div>
      )}

      {showCreateWorkflow && (
        <CreateWorkflowModal
          onSubmit={handleCreateWorkflow}
          onClose={() => setShowCreateWorkflow(false)}
        />
      )}
    </div>
  );
}

function WorkflowsTab({
  workflows,
  onStartInstance,
  onCreateWorkflow,
  getStatusColor,
}: {
  workflows: Workflow[];
  onStartInstance: (id: string, data?: any) => void;
  onCreateWorkflow: () => void;
  getStatusColor: (status: string) => string;
}) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0, color: '#333' }}>工作流列表</h2>
        <button
          onClick={onCreateWorkflow}
          style={{
            padding: '0.5rem 1rem',
            background: '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '0.375rem',
            cursor: 'pointer',
            fontWeight: 500
          }}
        >
          + 新建工作流
        </button>
      </div>

      <div style={{ display: 'grid', gap: '1rem' }}>
        {workflows.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', background: 'white', borderRadius: '0.5rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
            <p style={{ color: '#666' }}>暂无工作流</p>
          </div>
        ) : (
          workflows.map((wf) => (
            <div key={wf.id} style={{
              background: 'white',
              padding: '1.5rem',
              borderRadius: '0.5rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 0.5rem', color: '#333' }}>{wf.name}</h3>
                  <p style={{ margin: '0 0 0.5rem', color: '#666', fontSize: '0.875rem' }}>
                    {wf.description || '暂无描述'}
                  </p>
                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: '#888' }}>
                    <span>创建: {new Date(wf.created_at).toLocaleDateString()}</span>
                    <span>更新: {new Date(wf.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
                  <span style={{
                    background: getStatusColor(wf.is_active ? 'active' : 'inactive'),
                    color: 'white',
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.75rem',
                    borderRadius: '0.25rem'
                  }}>
                    {wf.is_active ? '启用' : '禁用'}
                  </span>
                  {wf.is_active && (
                    <button
                      onClick={() => onStartInstance(wf.id)}
                      style={{
                        padding: '0.5rem 1rem',
                        background: '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.375rem',
                        cursor: 'pointer',
                        fontSize: '0.875rem'
                      }}
                    >
                      启动实例
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function InstancesTab({
  instances,
  onSelectInstance,
  getStatusColor,
}: {
  instances: WorkflowInstance[];
  onSelectInstance: (id: string) => void;
  getStatusColor: (status: string) => string;
}) {
  return (
    <div>
      <h2 style={{ margin: '0 0 1rem', color: '#333' }}>实例列表</h2>
      <div style={{ display: 'grid', gap: '1rem' }}>
        {instances.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', background: 'white', borderRadius: '0.5rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
            <p style={{ color: '#666' }}>暂无实例</p>
          </div>
        ) : (
          instances.map((inst) => (
            <div
              key={inst.id}
              onClick={() => onSelectInstance(inst.id)}
              style={{
                background: 'white',
                padding: '1.5rem',
                borderRadius: '0.5rem',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                cursor: 'pointer',
                transition: 'transform 0.2s ease',
                ':hover': { transform: 'translateY(-2px)' }
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ margin: '0 0 0.5rem', color: '#333' }}>
                    实例 #{inst.id.slice(0, 8)}
                  </h3>
                  <p style={{ margin: '0 0 0.5rem', color: '#666', fontSize: '0.875rem' }}>
                    当前节点: {inst.current_node || 'N/A'}
                  </p>
                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: '#888' }}>
                    <span>创建: {new Date(inst.created_at).toLocaleString()}</span>
                    {inst.started_at && <span>启动: {new Date(inst.started_at).toLocaleString()}</span>}
                  </div>
                </div>
                <span style={{
                  background: getStatusColor(inst.status),
                  color: 'white',
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.75rem',
                  borderRadius: '0.25rem'
                }}>
                  {inst.status}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ApprovalsTab({
  approvals,
  onProcessApproval,
  getStatusColor,
  title = '审批列表',
}: {
  approvals: Approval[];
  onProcessApproval: (id: string, action: string, comment?: string) => void;
  getStatusColor: (status: string) => string;
  title?: string;
}) {
  const [selectedApproval, setSelectedApproval] = useState<string | null>(null);
  const [comment, setComment] = useState('');

  return (
    <div>
      <h2 style={{ margin: '0 0 1rem', color: '#333' }}>{title}</h2>
      <div style={{ display: 'grid', gap: '1rem' }}>
        {approvals.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', background: 'white', borderRadius: '0.5rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
            <p style={{ color: '#666' }}>暂无审批</p>
          </div>
        ) : (
          approvals.map((app) => (
            <div key={app.id} style={{
              background: 'white',
              padding: '1.5rem',
              borderRadius: '0.5rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 0.5rem', color: '#333' }}>{app.task_name}</h3>
                  <p style={{ margin: '0 0 0.5rem', color: '#666', fontSize: '0.875rem' }}>
                    节点: {app.node_id || 'N/A'}
                  </p>
                  <p style={{ margin: '0 0 0.5rem', color: '#666', fontSize: '0.875rem' }}>
                    {app.comment || '暂无评论'}
                  </p>
                  <div style={{ fontSize: '0.75rem', color: '#888' }}>
                    创建: {new Date(app.created_at).toLocaleString()}
                    {app.approved_at && ` · 处理: ${new Date(app.approved_at).toLocaleString()}`}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
                  <span style={{
                    background: getStatusColor(app.status),
                    color: 'white',
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.75rem',
                    borderRadius: '0.25rem'
                  }}>
                    {app.status}
                  </span>
                  {app.status === 'pending' && (
                    <>
                      <button
                        onClick={() => setSelectedApproval(selectedApproval === app.id ? null : app.id)}
                        style={{
                          padding: '0.5rem 1rem',
                          background: '#667eea',
                          color: 'white',
                          border: 'none',
                          borderRadius: '0.375rem',
                          cursor: 'pointer',
                          fontSize: '0.875rem'
                        }}
                      >
                        处理
                      </button>
                    </>
                  )}
                </div>
              </div>
              {selectedApproval === app.id && (
                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #eee' }}>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="添加评论..."
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #ddd',
                      borderRadius: '0.375rem',
                      marginBottom: '0.5rem',
                      minHeight: '60px',
                      resize: 'vertical'
                    }}
                  />
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => {
                        onProcessApproval(app.id, 'approve', comment || undefined);
                        setSelectedApproval(null);
                        setComment('');
                      }}
                      style={{
                        padding: '0.5rem 1rem',
                        background: '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.375rem',
                        cursor: 'pointer'
                      }}
                    >
                      ✅ 通过
                    </button>
                    <button
                      onClick={() => {
                        onProcessApproval(app.id, 'reject', comment || undefined);
                        setSelectedApproval(null);
                        setComment('');
                      }}
                      style={{
                        padding: '0.5rem 1rem',
                        background: '#F44336',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.375rem',
                        cursor: 'pointer'
                      }}
                    >
                      ❌ 拒绝
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function InstanceDetails({
  instanceDetails,
  onProcessApproval,
  onClose,
  getStatusColor,
}: {
  instanceDetails: InstanceDetailsResponse;
  onProcessApproval: (id: string, action: string, comment?: string) => void;
  onClose: () => void;
  getStatusColor: (status: string) => string;
}) {
  const [comment, setComment] = useState('');

  return (
    <div style={{
      background: 'white',
      padding: '1.5rem',
      borderRadius: '0.5rem',
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
      height: 'fit-content'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0, color: '#333' }}>实例详情</h2>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '1.5rem',
            cursor: 'pointer',
            color: '#666'
          }}
        >
          ×
        </button>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ marginBottom: '0.5rem' }}>
          <span style={{ fontWeight: 500, color: '#666' }}>状态：</span>
          <span style={{
            background: getStatusColor(instanceDetails.instance.status),
            color: 'white',
            padding: '0.25rem 0.5rem',
            fontSize: '0.75rem',
            borderRadius: '0.25rem'
          }}>
            {instanceDetails.instance.status}
          </span>
        </div>
        <div style={{ marginBottom: '0.5rem', color: '#666' }}>
          <span style={{ fontWeight: 500 }}>当前节点：</span>{instanceDetails.instance.current_node || 'N/A'}
        </div>
        <div style={{ marginBottom: '0.5rem', color: '#666' }}>
          <span style={{ fontWeight: 500 }}>创建时间：</span>
          {new Date(instanceDetails.instance.created_at).toLocaleString()}
        </div>
        {instanceDetails.instance.data && (
          <div style={{ color: '#666' }}>
            <span style={{ fontWeight: 500 }}>数据：</span>
            <pre style={{
              background: '#f5f7fa',
              padding: '0.5rem',
              borderRadius: '0.25rem',
              fontSize: '0.75rem',
              overflow: 'auto'
            }}>
              {JSON.stringify(instanceDetails.instance.data, null, 2)}
            </pre>
          </div>
        )}
      </div>

      <h3 style={{ margin: '1rem 0 0.5rem', color: '#333' }}>审批任务</h3>
      <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {instanceDetails.approvals.map((app) => (
          <div key={app.id} style={{
            background: '#f5f7fa',
            padding: '1rem',
            borderRadius: '0.375rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 500 }}>{app.task_name}</div>
                <div style={{ fontSize: '0.75rem', color: '#888' }}>
                  节点: {app.node_id || 'N/A'}
                </div>
              </div>
              <span style={{
                background: getStatusColor(app.status),
                color: 'white',
                padding: '0.25rem 0.5rem',
                fontSize: '0.75rem',
                borderRadius: '0.25rem'
              }}>
                {app.status}
              </span>
            </div>
            {app.status === 'pending' && (
              <div style={{ marginTop: '0.75rem' }}>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="添加评论..."
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ddd',
                    borderRadius: '0.375rem',
                    marginBottom: '0.5rem',
                    minHeight: '50px',
                    resize: 'vertical',
                    fontSize: '0.875rem'
                  }}
                />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => {
                      onProcessApproval(app.id, 'approve', comment || undefined);
                      setComment('');
                    }}
                    style={{
                      padding: '0.375rem 0.75rem',
                      background: '#4CAF50',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.25rem',
                      cursor: 'pointer',
                      fontSize: '0.875rem'
                    }}
                  >
                    ✅ 通过
                  </button>
                  <button
                    onClick={() => {
                      onProcessApproval(app.id, 'reject', comment || undefined);
                      setComment('');
                    }}
                    style={{
                      padding: '0.375rem 0.75rem',
                      background: '#F44336',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.25rem',
                      cursor: 'pointer',
                      fontSize: '0.875rem'
                    }}
                  >
                    ❌ 拒绝
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <h3 style={{ margin: '1rem 0 0.5rem', color: '#333' }}>审批记录</h3>
      <div style={{ display: 'grid', gap: '0.5rem' }}>
        {instanceDetails.records.length === 0 ? (
          <p style={{ color: '#888', fontSize: '0.875rem' }}>暂无记录</p>
        ) : (
          instanceDetails.records.map((record) => (
            <div key={record.id} style={{
              background: '#f9f9f9',
              padding: '0.75rem',
              borderRadius: '0.375rem',
              fontSize: '0.875rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{record.actor_name || record.actor_id}</strong>
                  <span style={{ marginLeft: '0.5rem', color: '#666' }}>
                    {record.action === 'approve' ? '通过了' :
                      record.action === 'reject' ? '拒绝了' :
                        record.action === 'delegate' ? '转派了' : record.action}
                  </span>
                </div>
                <span style={{ fontSize: '0.75rem', color: '#888' }}>
                  {new Date(record.created_at).toLocaleString()}
                </span>
              </div>
              {record.comment && (
                <div style={{ marginTop: '0.25rem', color: '#666' }}>
                  {record.comment}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function CreateWorkflowModal({
  onSubmit,
  onClose,
}: {
  onSubmit: (data: CreateWorkflowRequest) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [definitionJson, setDefinitionJson] = useState<string>(JSON.stringify({
    version: '1.0',
    nodes: [
      {
        node_id: 'start',
        name: '开始审批',
        approvers: [MOCK_USER_ID],
        approval_type: 'single',
        timeout_hours: 24,
        auto_action: 'reject'
      }
    ],
    start_node: 'start',
    end_nodes: ['start']
  }, null, 2));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const definition = JSON.parse(definitionJson);
      onSubmit({
        name,
        description: description || undefined,
        definition,
        created_by: MOCK_USER_ID,
      });
    } catch (err) {
      alert('JSON 格式错误');
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'white',
        padding: '2rem',
        borderRadius: '0.5rem',
        width: '90%',
        maxWidth: '600px',
        maxHeight: '90vh',
        overflow: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, color: '#333' }}>新建工作流</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: '#666'
            }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
              工作流名称
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '0.375rem'
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
              描述
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '0.375rem',
                minHeight: '60px'
              }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
              工作流定义 (JSON)
            </label>
            <textarea
              value={definitionJson}
              onChange={(e) => setDefinitionJson(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '0.375rem',
                minHeight: '300px',
                fontFamily: 'monospace',
                fontSize: '0.875rem'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.5rem 1rem',
                background: '#e0e0e0',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: 'pointer'
              }}
            >
              取消
            </button>
            <button
              type="submit"
              style={{
                padding: '0.5rem 1rem',
                background: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: 'pointer'
              }}
            >
              创建
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default App;
