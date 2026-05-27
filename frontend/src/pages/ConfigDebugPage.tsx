import React from 'react';
import config from '../config/runtime';

const ConfigDebugPage: React.FC = () => {
  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>配置诊断页面</h1>
      <h2>服务配置</h2>
      <pre style={{ background: '#f5f5f5', padding: '10px', overflow: 'auto' }}>
        {JSON.stringify(config.services, null, 2)}
      </pre>
      <h2>API 配置</h2>
      <pre style={{ background: '#f5f5f5', padding: '10px', overflow: 'auto' }}>
        {JSON.stringify(config.api, null, 2)}
      </pre>
      <h2>环境变量（前端）</h2>
      <pre style={{ background: '#f5f5f5', padding: '10px', overflow: 'auto' }}>
        {Object.entries(import.meta.env)
          .filter(([key]) => key.startsWith('VITE_'))
          .map(([key, value]) => `${key}: ${value}`)
          .join('\n')}
      </pre>
    </div>
  );
};

export default ConfigDebugPage;
