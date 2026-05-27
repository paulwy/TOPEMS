import React, { useState, useCallback } from 'react';

export interface DatabaseConfig {
  type: 'postgresql' | 'mysql' | 'sqlite' | 'mongodb';
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  path?: string;
}

export interface ConnectionResult {
  success: boolean;
  message: string;
  latency?: number;
  version?: string;
}

export const DatabaseConnector: React.FC = () => {
  const [config, setConfig] = useState<DatabaseConfig>({
    type: 'postgresql',
    host: 'localhost',
    port: 5432,
    database: 'postgres',
    username: 'postgres',
    password: '',
  });
  const [status, setStatus] = useState<'idle' | 'connecting' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<ConnectionResult | null>(null);

  const handleConfigChange = useCallback((key: keyof DatabaseConfig, value: unknown) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setStatus('idle');
    setResult(null);
  }, []);

  const testConnection = useCallback(async () => {
    setStatus('connecting');
    
    const startTime = Date.now();
    
    try {
      const response = await fetch('/api/db/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });
      
      const data = await response.json();
      const latency = Date.now() - startTime;
      
      setResult({
        success: data.success,
        message: data.message,
        latency,
        version: data.version,
      });
      setStatus(data.success ? 'success' : 'error');
    } catch (error) {
      setResult({
        success: false,
        message: (error as Error).message,
        latency: Date.now() - startTime,
      });
      setStatus('error');
    }
  }, [config]);

  const databases = [
    { value: 'postgresql', label: 'PostgreSQL', port: 5432 },
    { value: 'mysql', label: 'MySQL', port: 3306 },
    { value: 'sqlite', label: 'SQLite', port: 0 },
    { value: 'mongodb', label: 'MongoDB', port: 27017 },
  ];

  const showHostPort = config.type !== 'sqlite';

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b">
          <h3 className="text-lg font-semibold text-gray-900">数据库连接测试</h3>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">数据库类型</label>
              <select
                value={config.type}
                onChange={(e) => handleConfigChange('type', e.target.value as DatabaseConfig['type'])}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {databases.map((db) => (
                  <option key={db.value} value={db.value}>
                    {db.label}
                  </option>
                ))}
              </select>
            </div>
            {showHostPort && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">主机</label>
                  <input
                    type="text"
                    value={config.host}
                    onChange={(e) => handleConfigChange('host', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">端口</label>
                  <input
                    type="number"
                    value={config.port}
                    onChange={(e) => handleConfigChange('port', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </>
            )}
            {config.type === 'sqlite' && (
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">文件路径</label>
                <input
                  type="text"
                  value={config.path}
                  onChange={(e) => handleConfigChange('path', e.target.value)}
                  placeholder="/path/to/database.db"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            )}
            {showHostPort && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">数据库名称</label>
                  <input
                    type="text"
                    value={config.database}
                    onChange={(e) => handleConfigChange('database', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">用户名</label>
                  <input
                    type="text"
                    value={config.username}
                    onChange={(e) => handleConfigChange('username', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
                  <input
                    type="password"
                    value={config.password}
                    onChange={(e) => handleConfigChange('password', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </>
            )}
          </div>
        </div>
        <div className="px-4 py-4 bg-gray-50 border-t flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {status === 'connecting' && (
              <>
                <svg className="animate-spin h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="text-sm text-blue-600">连接中...</span>
              </>
            )}
            {status === 'success' && (
              <>
                <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm text-green-600">连接成功</span>
              </>
            )}
            {status === 'error' && (
              <>
                <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm text-red-600">连接失败</span>
              </>
            )}
          </div>
          <button
            onClick={testConnection}
            disabled={status === 'connecting'}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            测试连接
          </button>
        </div>
      </div>
      {result && (
        <div className={`mt-4 p-4 rounded-lg border ${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-start justify-between">
            <div>
              <p className={`font-medium ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                {result.success ? '连接成功' : '连接失败'}
              </p>
              <p className={`text-sm mt-1 ${result.success ? 'text-green-600' : 'text-red-600'}`}>
                {result.message}
              </p>
              {result.latency && (
                <p className="text-sm mt-1 text-gray-500">
                  延迟: {result.latency}ms
                </p>
              )}
              {result.version && (
                <p className="text-sm mt-1 text-gray-500">
                  版本: {result.version}
                </p>
              )}
            </div>
            {result.success ? (
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DatabaseConnector;
