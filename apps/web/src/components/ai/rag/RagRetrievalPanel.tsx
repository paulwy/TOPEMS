import React, { useState } from 'react';
import { Card, Input, Button, List, Tag, Progress, Empty, Spin, Tabs, Divider, Rate, Tooltip, message } from 'antd';
import { SearchOutlined, FileTextOutlined, ThunderboltOutlined, ReloadOutlined, LikeOutlined, DislikeOutlined, CopyOutlined } from '@ant-design/icons';

// 检索结果文档
export interface RetrievedDocument {
  id: string;
  title: string;
  content: string;
  source: string;
  sourceType: string;
  similarity: number;
  relevanceScore: number;
  metadata?: Record<string, any>;
  chunks?: RetrievedChunk[];
  createdAt?: string;
  updatedAt?: string;
}

// 检索片段
export interface RetrievedChunk {
  id: string;
  content: string;
  similarity: number;
  startIndex: number;
  endIndex: number;
}

// 检索过程步骤
export interface RetrievalStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  duration?: number;
  details?: string;
}

// 检索配置
export interface RetrievalConfig {
  topK: number;
  similarityThreshold: number;
  rerankingEnabled: boolean;
  queryExpansionEnabled: boolean;
  hybridSearchEnabled: boolean;
  searchStrategies: string[];
}

// 检索请求
export interface RetrievalRequest {
  query: string;
  config?: Partial<RetrievalConfig>;
  filters?: Record<string, any>;
}

// 检索响应
export interface RetrievalResponse {
  query: string;
  expandedQuery?: string;
  results: RetrievedDocument[];
  totalResults: number;
  retrievalTime: number;
  steps: RetrievalStep[];
  config: RetrievalConfig;
}

// 反馈类型
type FeedbackType = 'like' | 'dislike' | null;

// 组件属性
interface RagRetrievalPanelProps {
  onSearch?: (request: RetrievalRequest) => Promise<RetrievalResponse>;
  defaultConfig?: Partial<RetrievalConfig>;
  height?: number;
  title?: string;
}

const RagRetrievalPanel: React.FC<RagRetrievalPanelProps> = ({
  onSearch,
  defaultConfig,
  height = 600,
  title = 'RAG 检索面板',
}) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<RetrievalResponse | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<RetrievedDocument | null>(null);
  const [feedback, setFeedback] = useState<Record<string, FeedbackType>>({});
  const [config, setConfig] = useState<RetrievalConfig>({
    topK: 5,
    similarityThreshold: 0.5,
    rerankingEnabled: true,
    queryExpansionEnabled: true,
    hybridSearchEnabled: true,
    searchStrategies: ['semantic', 'keyword', 'hybrid'],
    ...defaultConfig,
  });

  // 执行检索
  const handleSearch = async () => {
    if (!query.trim()) {
      message.warning('请输入检索查询');
      return;
    }

    setLoading(true);
    setSelectedDoc(null);

    try {
      if (onSearch) {
        const result = await onSearch({ query, config });
        setResponse(result);
      } else {
        // Mock 数据
        await new Promise(resolve => setTimeout(resolve, 1000));
        const mockResponse: RetrievalResponse = {
          query,
          expandedQuery: `${query} 相关信息`,
          results: [
            {
              id: '1',
              title: 'TOPEMS 系统架构设计文档',
              content: 'TOPEMS 采用微服务架构，包含统一核心服务、AI 智能服务、业务模块服务等。系统支持水平扩展和高可用性...',
              source: 'docs/architecture.md',
              sourceType: 'document',
              similarity: 0.92,
              relevanceScore: 0.95,
              metadata: { author: '架构组', version: '2.0' },
              createdAt: '2026-01-15',
            },
            {
              id: '2',
              title: 'AI 智能运维最佳实践',
              content: '基于 AI 的智能运维系统可以自动识别异常、预测故障、优化资源配置。通过机器学习算法分析历史数据...',
              source: 'docs/best-practices/ai-ops.md',
              sourceType: 'document',
              similarity: 0.87,
              relevanceScore: 0.89,
              metadata: { author: '运维组', category: '最佳实践' },
              createdAt: '2026-02-20',
            },
            {
              id: '3',
              title: '微服务通信协议规范',
              content: 'TOPEMS 微服务之间采用 gRPC 和 RESTful API 两种通信方式。内部服务优先使用 gRPC，外部接口使用 RESTful API...',
              source: 'docs/protocols/microservice-communication.md',
              sourceType: 'document',
              similarity: 0.78,
              relevanceScore: 0.82,
              metadata: { author: '技术委员会' },
              createdAt: '2026-01-10',
            },
          ],
          totalResults: 3,
          retrievalTime: 1250,
          steps: [
            { id: '1', name: '查询理解', description: '分析查询意图和关键词', status: 'completed', duration: 50 },
            { id: '2', name: '查询扩展', description: '扩展查询以提高召回率', status: 'completed', duration: 100 },
            { id: '3', name: '向量检索', description: '语义相似度检索', status: 'completed', duration: 450 },
            { id: '4', name: '关键词检索', description: 'BM25 关键词匹配', status: 'completed', duration: 200 },
            { id: '5', name: '结果融合', description: '混合检索结果融合', status: 'completed', duration: 150 },
            { id: '6', name: '重排序', description: '基于相关性重排序', status: 'completed', duration: 300 },
          ],
          config,
        };
        setResponse(mockResponse);
      }
    } catch (error) {
      message.error('检索失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 处理反馈
  const handleFeedback = (docId: string, type: 'like' | 'dislike') => {
    setFeedback(prev => ({
      ...prev,
      [docId]: prev[docId] === type ? null : type,
    }));
    message.success(type === 'like' ? '已标记为有用' : '已标记为无用');
  };

  // 复制内容
  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    message.success('已复制到剪贴板');
  };

  // 渲染检索过程
  const renderRetrievalProcess = () => {
    if (!response) return null;

    return (
      <Card size="small" title="检索过程" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {response.steps.map((step, index) => (
            <div
              key={step.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 8px',
                background: step.status === 'completed' ? '#f6ffed' : '#f5f5f5',
                borderRadius: 4,
                fontSize: 12,
              }}
            >
              <span style={{ color: step.status === 'completed' ? '#52c41a' : '#bfbfbf' }}>
                {step.status === 'completed' ? '✓' : index + 1}
              </span>
              <span>{step.name}</span>
              {step.duration && <span style={{ color: '#8c8c8c' }}>{step.duration}ms</span>}
            </div>
          ))}
        </div>
        <Divider style={{ margin: '12px 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#666' }}>
          <span>总耗时: <strong>{response.retrievalTime}ms</strong></span>
          <span>召回结果: <strong>{response.totalResults}</strong> 条</span>
          {response.expandedQuery && (
            <span>扩展查询: <Tag color="blue">{response.expandedQuery}</Tag></span>
          )}
        </div>
      </Card>
    );
  };

  // 渲染检索结果列表
  const renderResultsList = () => {
    if (!response) return null;

    return (
      <List
        dataSource={response.results}
        renderItem={(doc, index) => (
          <List.Item
            key={doc.id}
            onClick={() => setSelectedDoc(doc)}
            style={{
              cursor: 'pointer',
              background: selectedDoc?.id === doc.id ? '#e6f7ff' : 'transparent',
              padding: 12,
              borderRadius: 4,
              marginBottom: 8,
              border: selectedDoc?.id === doc.id ? '1px solid #1890ff' : '1px solid #f0f0f0',
            }}
            actions={[
              <Tooltip key="like" title="有用">
                <Button
                  type="text"
                  size="small"
                  icon={<LikeOutlined />}
                  onClick={e => { e.stopPropagation(); handleFeedback(doc.id, 'like'); }}
                  style={{ color: feedback[doc.id] === 'like' ? '#52c41a' : undefined }}
                />
              </Tooltip>,
              <Tooltip key="dislike" title="无用">
                <Button
                  type="text"
                  size="small"
                  icon={<DislikeOutlined />}
                  onClick={e => { e.stopPropagation(); handleFeedback(doc.id, 'dislike'); }}
                  style={{ color: feedback[doc.id] === 'dislike' ? '#f5222d' : undefined }}
                />
              </Tooltip>,
            ]}
          >
            <List.Item.Meta
              avatar={<Tag color="blue" style={{ fontSize: 14, padding: '4px 8px' }}>#{index + 1}</Tag>}
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileTextOutlined style={{ color: '#1890ff' }} />
                  <span style={{ fontWeight: 500 }}>{doc.title}</span>
                  <Tag color={doc.similarity > 0.8 ? 'green' : doc.similarity > 0.6 ? 'orange' : 'default'}>
                    相似度: {(doc.similarity * 100).toFixed(1)}%
                  </Tag>
                </div>
              }
              description={
                <div>
                  <p style={{ color: '#666', marginBottom: 4 }}>
                    {doc.content.length > 150 ? doc.content.slice(0, 150) + '...' : doc.content}
                  </p>
                  <div style={{ display: 'flex', gap: 8, fontSize: 12, color: '#999' }}>
                    <span>来源: {doc.source}</span>
                    <span>类型: {doc.sourceType}</span>
                    {doc.updatedAt && <span>更新: {doc.updatedAt}</span>}
                  </div>
                </div>
              }
            />
          </List.Item>
        )}
      />
    );
  };

  // 渲染文档详情
  const renderDocDetail = () => {
    if (!selectedDoc) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <Empty description="选择左侧文档查看详情" />
        </div>
      );
    }

    return (
      <div style={{ height: '100%', overflow: 'auto', padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <h3 style={{ marginBottom: 8 }}>{selectedDoc.title}</h3>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Tag color="blue">相似度: {(selectedDoc.similarity * 100).toFixed(1)}%</Tag>
              <Tag color="green">相关性: {(selectedDoc.relevanceScore * 100).toFixed(1)}%</Tag>
              <Tag>{selectedDoc.sourceType}</Tag>
            </div>
          </div>
          <Button icon={<CopyOutlined />} onClick={() => handleCopy(selectedDoc.content)}>
            复制
          </Button>
        </div>

        <Divider style={{ margin: '12px 0' }} />

        <div style={{ marginBottom: 16 }}>
          <h4>文档内容</h4>
          <div
            style={{
              background: '#fafafa',
              padding: 16,
              borderRadius: 4,
              lineHeight: 1.8,
              whiteSpace: 'pre-wrap',
            }}
          >
            {selectedDoc.content}
          </div>
        </div>

        {selectedDoc.metadata && Object.keys(selectedDoc.metadata).length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <h4>元数据</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {Object.entries(selectedDoc.metadata).map(([key, value]) => (
                <div key={key} style={{ fontSize: 13 }}>
                  <span style={{ color: '#666' }}>{key}: </span>
                  <span>{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <h4>来源信息</h4>
          <div style={{ fontSize: 13, color: '#666' }}>
            <div>来源路径: {selectedDoc.source}</div>
            {selectedDoc.createdAt && <div>创建时间: {selectedDoc.createdAt}</div>}
            {selectedDoc.updatedAt && <div>更新时间: {selectedDoc.updatedAt}</div>}
          </div>
        </div>

        <Divider style={{ margin: '12px 0' }} />

        <div>
          <h4>反馈评价</h4>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              icon={<LikeOutlined />}
              type={feedback[selectedDoc.id] === 'like' ? 'primary' : 'default'}
              onClick={() => handleFeedback(selectedDoc.id, 'like')}
            >
              有用
            </Button>
            <Button
              icon={<DislikeOutlined />}
              danger={feedback[selectedDoc.id] === 'dislike'}
              onClick={() => handleFeedback(selectedDoc.id, 'dislike')}
            >
              无用
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // 渲染配置面板
  const renderConfigPanel = () => (
    <Card size="small" title="检索配置" style={{ marginBottom: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={{ fontSize: 12, color: '#666' }}>Top K</label>
          <Input
            type="number"
            value={config.topK}
            onChange={e => setConfig(prev => ({ ...prev, topK: parseInt(e.target.value) || 5 }))}
            size="small"
          />
        </div>
        <div>
          <label style={{ fontSize: 12, color: '#666' }}>相似度阈值</label>
          <Input
            type="number"
            step="0.1"
            value={config.similarityThreshold}
            onChange={e => setConfig(prev => ({ ...prev, similarityThreshold: parseFloat(e.target.value) || 0.5 }))}
            size="small"
          />
        </div>
        <div>
          <label style={{ fontSize: 12, color: '#666' }}>
            <input
              type="checkbox"
              checked={config.rerankingEnabled}
              onChange={e => setConfig(prev => ({ ...prev, rerankingEnabled: e.target.checked }))}
            /> 重排序
          </label>
        </div>
        <div>
          <label style={{ fontSize: 12, color: '#666' }}>
            <input
              type="checkbox"
              checked={config.queryExpansionEnabled}
              onChange={e => setConfig(prev => ({ ...prev, queryExpansionEnabled: e.target.checked }))}
            /> 查询扩展
          </label>
        </div>
        <div>
          <label style={{ fontSize: 12, color: '#666' }}>
            <input
              type="checkbox"
              checked={config.hybridSearchEnabled}
              onChange={e => setConfig(prev => ({ ...prev, hybridSearchEnabled: e.target.checked }))}
            /> 混合检索
          </label>
        </div>
      </div>
    </Card>
  );

  return (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ThunderboltOutlined style={{ color: '#1890ff' }} />
          <span>{title}</span>
        </div>
      }
      style={{ height }}
      bodyStyle={{ padding: 16, height: 'calc(100% - 57px)', overflow: 'hidden' }}
    >
      <div style={{ display: 'flex', gap: 16, height: '100%' }}>
        {/* 左侧：搜索和结果 */}
        <div style={{ width: '50%', display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Input.Search
            placeholder="输入检索查询..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onSearch={handleSearch}
            enterButton={<Button type="primary" icon={<SearchOutlined />}>检索</Button>}
            loading={loading}
            size="large"
            style={{ marginBottom: 16 }}
          />

          <Tabs
            defaultActiveKey="results"
            items={[
              {
                key: 'results',
                label: '检索结果',
                children: (
                  <div style={{ overflow: 'auto', maxHeight: 'calc(100vh - 300px)' }}>
                    {loading ? (
                      <div style={{ textAlign: 'center', padding: 40 }}>
                        <Spin size="large" tip="检索中..." />
                      </div>
                    ) : response ? (
                      <>
                        {renderRetrievalProcess()}
                        {renderResultsList()}
                      </>
                    ) : (
                      <Empty description="输入查询开始检索" />
                    )}
                  </div>
                ),
              },
              {
                key: 'config',
                label: '检索配置',
                children: renderConfigPanel(),
              },
            ]}
          />
        </div>

        {/* 右侧：文档详情 */}
        <div style={{ width: '50%', borderLeft: '1px solid #f0f0f0', paddingLeft: 16, height: '100%' }}>
          {renderDocDetail()}
        </div>
      </div>
    </Card>
  );
};

export default RagRetrievalPanel;
