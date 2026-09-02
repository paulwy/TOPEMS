import React, { useState, useEffect } from 'react';
import { Card, Tag, Progress, Timeline, List, Badge, Statistic, Row, Col, Empty, Spin, Tooltip, Button, Tabs, Divider } from 'antd';
import {
  RobotOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  SyncOutlined,
  MessageOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  ReloadOutlined,
} from '@ant-design/icons';

// Agent 状态
export type AgentStatus = 'idle' | 'running' | 'waiting' | 'completed' | 'failed' | 'paused';

// Agent 定义
export interface AgentInfo {
  id: string;
  name: string;
  role: string;
  description: string;
  status: AgentStatus;
  avatar?: string;
  capabilities: string[];
  currentTask?: string;
  progress?: number;
  startTime?: string;
  endTime?: string;
  messageCount: number;
  tokenUsage: number;
  errorMessage?: string;
}

// 任务定义
export interface AgentTask {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'assigned' | 'running' | 'completed' | 'failed';
  assignedAgentId?: string;
  assignedAgentName?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  progress: number;
  startTime?: string;
  endTime?: string;
  estimatedDuration?: number;
  actualDuration?: number;
  dependencies?: string[];
  result?: any;
  errorMessage?: string;
}

// 消息定义
export interface AgentMessage {
  id: string;
  fromAgentId: string;
  fromAgentName: string;
  toAgentId?: string;
  toAgentName?: string;
  content: string;
  messageType: 'text' | 'task' | 'result' | 'error' | 'system';
  timestamp: string;
  metadata?: Record<string, any>;
}

// 协作模式
export type CollaborationMode = 'sequential' | 'parallel' | 'hierarchical' | 'debate' | 'consensus';

// 协作会话
export interface CollaborationSession {
  id: string;
  name: string;
  description: string;
  mode: CollaborationMode;
  status: 'running' | 'completed' | 'failed' | 'paused';
  agents: AgentInfo[];
  tasks: AgentTask[];
  messages: AgentMessage[];
  startTime: string;
  endTime?: string;
  totalDuration?: number;
  overallProgress: number;
  result?: any;
}

// 组件属性
interface MultiAgentMonitorProps {
  session?: CollaborationSession;
  loading?: boolean;
  height?: number;
  title?: string;
  onRefresh?: () => void;
  onAgentClick?: (agent: AgentInfo) => void;
  onTaskClick?: (task: AgentTask) => void;
}

// 状态颜色映射
const STATUS_COLORS: Record<AgentStatus, string> = {
  idle: 'default',
  running: 'processing',
  waiting: 'warning',
  completed: 'success',
  failed: 'error',
  paused: 'default',
};

// 状态图标映射
const STATUS_ICONS: Record<AgentStatus, React.ReactNode> = {
  idle: <ClockCircleOutlined />,
  running: <SyncOutlined spin />,
  waiting: <PauseCircleOutlined />,
  completed: <CheckCircleOutlined />,
  failed: <CloseCircleOutlined />,
  paused: <PauseCircleOutlined />,
};

// 优先级颜色
const PRIORITY_COLORS: Record<string, string> = {
  low: 'default',
  medium: 'blue',
  high: 'orange',
  critical: 'red',
};

const MultiAgentMonitor: React.FC<MultiAgentMonitorProps> = ({
  session,
  loading = false,
  height = 600,
  title = '多 Agent 协作监控',
  onRefresh,
  onAgentClick,
  onTaskClick,
}) => {
  const [selectedAgent, setSelectedAgent] = useState<AgentInfo | null>(null);
  const [selectedTask, setSelectedTask] = useState<AgentTask | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // 自动刷新
  useEffect(() => {
    if (autoRefresh && onRefresh) {
      const interval = setInterval(onRefresh, 5000);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [autoRefresh, onRefresh]);

  // 计算统计数据
  const stats = session ? {
    totalAgents: session.agents.length,
    runningAgents: session.agents.filter(a => a.status === 'running').length,
    completedAgents: session.agents.filter(a => a.status === 'completed').length,
    failedAgents: session.agents.filter(a => a.status === 'failed').length,
    totalTasks: session.tasks.length,
    completedTasks: session.tasks.filter(t => t.status === 'completed').length,
    failedTasks: session.tasks.filter(t => t.status === 'failed').length,
    totalMessages: session.messages.length,
    totalTokens: session.agents.reduce((sum, a) => sum + a.tokenUsage, 0),
  } : null;

  // 渲染 Agent 卡片
  const renderAgentCard = (agent: AgentInfo) => (
    <Card
      key={agent.id}
      size="small"
      hoverable
      onClick={() => {
        setSelectedAgent(agent);
        onAgentClick?.(agent);
      }}
      style={{
        marginBottom: 8,
        borderLeft: `3px solid ${agent.status === 'running' ? '#1890ff' : agent.status === 'completed' ? '#52c41a' : agent.status === 'failed' ? '#f5222d' : '#d9d9d9'}`,
        background: selectedAgent?.id === agent.id ? '#e6f7ff' : '#fff',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <RobotOutlined style={{ color: '#1890ff', fontSize: 16 }} />
            <strong>{agent.name}</strong>
            <Badge status={STATUS_COLORS[agent.status] as any} text={agent.status} />
          </div>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>{agent.role}</div>
          {agent.currentTask && (
            <div style={{ fontSize: 12, color: '#1890ff', marginBottom: 4 }}>
              当前任务: {agent.currentTask}
            </div>
          )}
          {agent.progress !== undefined && (
            <Progress percent={agent.progress} size="small" showInfo={false} />
          )}
        </div>
        <div style={{ textAlign: 'right', fontSize: 11, color: '#999' }}>
          <div>消息: {agent.messageCount}</div>
          <div>Token: {agent.tokenUsage}</div>
        </div>
      </div>
    </Card>
  );

  // 渲染任务时间线
  const renderTaskTimeline = () => {
    if (!session) return null;

    return (
      <Timeline
        items={session.tasks.map(task => ({
          color: task.status === 'completed' ? 'green' : task.status === 'failed' ? 'red' : task.status === 'running' ? 'blue' : 'gray',
          dot: task.status === 'running' ? <SyncOutlined spin style={{ fontSize: 16 }} /> : undefined,
          children: (
            <div
              onClick={() => {
                setSelectedTask(task);
                onTaskClick?.(task);
              }}
              style={{
                cursor: 'pointer',
                padding: '8px 12px',
                background: selectedTask?.id === task.id ? '#e6f7ff' : '#fafafa',
                borderRadius: 4,
                border: selectedTask?.id === task.id ? '1px solid #1890ff' : '1px solid #f0f0f0',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <strong>{task.name}</strong>
                <div style={{ display: 'flex', gap: 4 }}>
                  <Tag color={PRIORITY_COLORS[task.priority]}>{task.priority}</Tag>
                  <Tag color={task.status === 'completed' ? 'green' : task.status === 'failed' ? 'red' : task.status === 'running' ? 'blue' : 'default'}>
                    {task.status}
                  </Tag>
                </div>
              </div>
              <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>{task.description}</div>
              {task.assignedAgentName && (
                <div style={{ fontSize: 11, color: '#1890ff' }}>
                  执行者: {task.assignedAgentName}
                </div>
              )}
              {task.status === 'running' && (
                <Progress percent={task.progress} size="small" style={{ marginTop: 4 }} />
              )}
            </div>
          ),
        }))}
      />
    );
  };

  // 渲染消息流
  const renderMessageFlow = () => {
    if (!session || session.messages.length === 0) {
      return <Empty description="暂无消息" style={{ marginTop: 40 }} />;
    }

    return (
      <List
        dataSource={[...session.messages].reverse().slice(0, 50)}
        renderItem={msg => (
          <List.Item style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
            <List.Item.Meta
              avatar={
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: msg.messageType === 'system' ? '#faad14' : '#1890ff',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 14,
                  }}
                >
                  {msg.messageType === 'system' ? '⚙️' : '🤖'}
                </div>
              }
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                  <strong>{msg.fromAgentName}</strong>
                  {msg.toAgentName && (
                    <>
                      <MessageOutlined style={{ color: '#999' }} />
                      <span style={{ color: '#666' }}>{msg.toAgentName}</span>
                    </>
                  )}
                  <Tag color={msg.messageType === 'error' ? 'red' : msg.messageType === 'result' ? 'green' : 'default'}>
                    {msg.messageType}
                  </Tag>
                  <span style={{ fontSize: 11, color: '#999' }}>{msg.timestamp}</span>
                </div>
              }
              description={
                <div style={{ fontSize: 13, color: '#333', whiteSpace: 'pre-wrap' }}>
                  {msg.content}
                </div>
              }
            />
          </List.Item>
        )}
      />
    );
  };

  // 渲染统计面板
  const renderStatsPanel = () => {
    if (!stats) return null;

    return (
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Agent 总数"
              value={stats.totalAgents}
              prefix={<TeamOutlined />}
              suffix={`/ ${stats.runningAgents} 运行中`}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="任务进度"
              value={stats.completedTasks}
              prefix={<CheckCircleOutlined />}
              suffix={`/ ${stats.totalTasks}`}
              valueStyle={{ color: stats.completedTasks === stats.totalTasks ? '#52c41a' : '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="消息总数"
              value={stats.totalMessages}
              prefix={<MessageOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Token 消耗"
              value={stats.totalTokens}
              prefix={<ThunderboltOutlined />}
            />
          </Card>
        </Col>
      </Row>
    );
  };

  if (loading) {
    return (
      <Card title={title} style={{ height }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <Spin size="large" tip="加载协作会话..." />
        </div>
      </Card>
    );
  }

  if (!session) {
    return (
      <Card title={title} style={{ height }}>
        <Empty description="暂无协作会话数据" />
      </Card>
    );
  }

  return (
    <Card
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <TeamOutlined style={{ color: '#1890ff' }} />
            <span>{title}</span>
            <Tag color={session.status === 'running' ? 'processing' : session.status === 'completed' ? 'success' : 'error'}>
              {session.status}
            </Tag>
            <Tag>{session.mode}</Tag>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Tooltip title={autoRefresh ? '停止自动刷新' : '自动刷新'}>
              <Button
                size="small"
                icon={<ReloadOutlined spin={autoRefresh} />}
                type={autoRefresh ? 'primary' : 'default'}
                onClick={() => setAutoRefresh(!autoRefresh)}
              />
            </Tooltip>
            {onRefresh && (
              <Button size="small" icon={<ReloadOutlined />} onClick={onRefresh}>
                刷新
              </Button>
            )}
          </div>
        </div>
      }
      style={{ height }}
      bodyStyle={{ padding: 16, height: 'calc(100% - 57px)', overflow: 'hidden' }}
    >
      {renderStatsPanel()}

      {/* 总体进度 */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 13, color: '#666' }}>总体进度</span>
          <span style={{ fontSize: 13, fontWeight: 'bold' }}>{session.overallProgress}%</span>
        </div>
        <Progress percent={session.overallProgress} status={session.status === 'failed' ? 'exception' : session.status === 'completed' ? 'success' : 'active'} />
      </div>

      <Tabs
        defaultActiveKey="agents"
        items={[
          {
            key: 'agents',
            label: `Agent 状态 (${session.agents.length})`,
            children: (
              <div style={{ maxHeight: 'calc(100vh - 400px)', overflow: 'auto' }}>
                {session.agents.map(renderAgentCard)}
              </div>
            ),
          },
          {
            key: 'tasks',
            label: `任务执行 (${session.tasks.length})`,
            children: (
              <div style={{ maxHeight: 'calc(100vh - 400px)', overflow: 'auto' }}>
                {renderTaskTimeline()}
              </div>
            ),
          },
          {
            key: 'messages',
            label: `消息流 (${session.messages.length})`,
            children: (
              <div style={{ maxHeight: 'calc(100vh - 400px)', overflow: 'auto' }}>
                {renderMessageFlow()}
              </div>
            ),
          },
        ]}
      />

      {/* 选中 Agent 详情 */}
      {selectedAgent && (
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: '#fff',
            padding: 24,
            borderRadius: 8,
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            zIndex: 1000,
            minWidth: 400,
            maxWidth: 600,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0 }}>{selectedAgent.name} 详情</h3>
            <Button type="text" onClick={() => setSelectedAgent(null)}>×</Button>
          </div>
          <Divider style={{ margin: '12px 0' }} />
          <div style={{ fontSize: 13 }}>
            <p><strong>角色:</strong> {selectedAgent.role}</p>
            <p><strong>描述:</strong> {selectedAgent.description}</p>
            <p><strong>状态:</strong> <Tag color={STATUS_COLORS[selectedAgent.status] as any}>{selectedAgent.status}</Tag></p>
            <p><strong>能力:</strong> {selectedAgent.capabilities.join(', ')}</p>
            {selectedAgent.currentTask && <p><strong>当前任务:</strong> {selectedAgent.currentTask}</p>}
            <p><strong>消息数:</strong> {selectedAgent.messageCount}</p>
            <p><strong>Token 消耗:</strong> {selectedAgent.tokenUsage}</p>
            {selectedAgent.errorMessage && <p style={{ color: '#f5222d' }}><strong>错误:</strong> {selectedAgent.errorMessage}</p>}
          </div>
        </div>
      )}
    </Card>
  );
};

export default MultiAgentMonitor;
