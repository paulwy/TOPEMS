import React, { useState, useEffect, useCallback } from 'react';

export interface APIEndpoint {
  id: string;
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  summary: string;
  description?: string;
  parameters?: {
    name: string;
    type: string;
    required: boolean;
    description?: string;
  }[];
  requestBody?: {
    type: 'json' | 'form';
    schema?: Record<string, unknown>;
    example?: Record<string, unknown>;
  };
  responses?: {
    status: number;
    description: string;
    example?: Record<string, unknown>;
  }[];
  tags?: string[];
}

export interface APIDocProps {
  endpoints: APIEndpoint[];
}

export const APIDoc: React.FC<APIDocProps> = ({ endpoints }) => {
  const [activeEndpoint, setActiveEndpoint] = useState<string | null>(null);
  const [filterTag, setFilterTag] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const tags = ['all', ...new Set(endpoints.flatMap((e) => e.tags || []))];

  const filteredEndpoints = endpoints.filter((endpoint) => {
    if (filterTag !== 'all' && !endpoint.tags?.includes(filterTag)) return false;
    if (searchTerm && !endpoint.path.toLowerCase().includes(searchTerm.toLowerCase()) && !endpoint.summary.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    return true;
  });

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET':
        return 'bg-green-100 text-green-700';
      case 'POST':
        return 'bg-blue-100 text-blue-700';
      case 'PUT':
        return 'bg-yellow-100 text-yellow-700';
      case 'DELETE':
        return 'bg-red-100 text-red-700';
      case 'PATCH':
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="flex h-full">
      <div className="w-80 border-r border-gray-200 p-4 overflow-y-auto">
        <div className="mb-4">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="搜索 API..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
        <div className="mb-4">
          <select
            value={filterTag}
            onChange={(e) => setFilterTag(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            {tags.map((tag) => (
              <option key={tag} value={tag}>
                {tag === 'all' ? '全部' : tag}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          {filteredEndpoints.map((endpoint) => (
            <button
              key={endpoint.id}
              onClick={() => setActiveEndpoint(endpoint.id)}
              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                activeEndpoint === endpoint.id
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${getMethodColor(endpoint.method)}`}>
                  {endpoint.method}
                </span>
                <span className="text-sm font-medium text-gray-900 truncate">
                  {endpoint.path}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1 truncate">
                {endpoint.summary}
              </p>
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 p-6 overflow-y-auto">
        {activeEndpoint ? (
          <EndpointDetail
            endpoint={endpoints.find((e) => e.id === activeEndpoint)!}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <svg className="w-16 h-16 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p>选择一个 API 端点查看详情</p>
          </div>
        )}
      </div>
    </div>
  );
};

interface EndpointDetailProps {
  endpoint: APIEndpoint;
}

const EndpointDetail: React.FC<EndpointDetailProps> = ({ endpoint }) => {
  const [activeTab, setActiveTab] = useState<'request' | 'response'>('request');

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET':
        return 'bg-green-500';
      case 'POST':
        return 'bg-blue-500';
      case 'PUT':
        return 'bg-yellow-500';
      case 'DELETE':
        return 'bg-red-500';
      case 'PATCH':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <div className="flex items-center space-x-3">
          <span className={`px-3 py-1 rounded-lg text-white font-medium ${getMethodColor(endpoint.method)}`}>
            {endpoint.method}
          </span>
          <span className="text-xl font-semibold text-gray-900">{endpoint.path}</span>
        </div>
        <p className="mt-2 text-gray-600">{endpoint.summary}</p>
        {endpoint.description && (
          <p className="mt-2 text-gray-500">{endpoint.description}</p>
        )}
        {endpoint.tags && (
          <div className="flex flex-wrap gap-2 mt-4">
            {endpoint.tags.map((tag) => (
              <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
      {endpoint.parameters && endpoint.parameters.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">参数</h3>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">参数名</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">类型</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">必填</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">描述</th>
                </tr>
              </thead>
              <tbody>
                {endpoint.parameters.map((param) => (
                  <tr key={param.name} className="border-t border-gray-100">
                    <td className="px-4 py-2 text-sm font-medium text-gray-900">{param.name}</td>
                    <td className="px-4 py-2 text-sm text-gray-600">{param.type}</td>
                    <td className="px-4 py-2">
                      {param.required ? (
                        <span className="text-green-600">是</span>
                      ) : (
                        <span className="text-gray-400">否</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500">{param.description || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {(endpoint.requestBody || endpoint.responses) && (
        <div className="mb-6">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('request')}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === 'request'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              请求体
            </button>
            <button
              onClick={() => setActiveTab('response')}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === 'response'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              响应
            </button>
          </div>
          <div className="mt-4">
            {activeTab === 'request' && endpoint.requestBody?.example && (
              <pre className="bg-gray-50 p-4 rounded-lg overflow-auto">
                <code className="text-sm text-gray-800">
                  {JSON.stringify(endpoint.requestBody.example, null, 2)}
                </code>
              </pre>
            )}
            {activeTab === 'request' && !endpoint.requestBody?.example && (
              <p className="text-gray-500">暂无请求体示例</p>
            )}
            {activeTab === 'response' && endpoint.responses && (
              <div className="space-y-4">
                {endpoint.responses.map((response) => (
                  <div key={response.status} className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="px-4 py-2 bg-gray-50 border-b">
                      <span className="text-sm font-medium">状态码 {response.status}</span>
                      <span className="ml-2 text-sm text-gray-500">{response.description}</span>
                    </div>
                    {response.example && (
                      <pre className="p-4 bg-gray-50 overflow-auto">
                        <code className="text-sm text-gray-800">
                          {JSON.stringify(response.example, null, 2)}
                        </code>
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            )}
            {activeTab === 'response' && !endpoint.responses && (
              <p className="text-gray-500">暂无响应示例</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const useApiDocs = (endpoint: string) => {
  const [docs, setDocs] = useState<APIEndpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const response = await fetch(endpoint);
        const data = await response.json();
        setDocs(data);
        setError(null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchDocs();
  }, [endpoint]);

  return { docs, loading, error };
};

export default APIDoc;
