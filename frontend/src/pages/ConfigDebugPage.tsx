import React from 'react';
import { Settings, Database, Code, Server } from 'lucide-react';
import config from '../config/runtime';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const ConfigDebugPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center space-x-3 mb-8">
          <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
            <Settings className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">配置诊断</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">系统配置信息和环境变量</p>
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-3">
                <Server className="w-5 h-5 text-indigo-600" />
                <CardTitle>服务配置</CardTitle>
              </div>
              <CardDescription>各微服务的连接配置信息</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-900 dark:bg-gray-800 text-gray-300 dark:text-gray-200 p-4 rounded-lg overflow-x-auto text-sm">
                {JSON.stringify(config.services, null, 2)}
              </pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center space-x-3">
                <Database className="w-5 h-5 text-green-600" />
                <CardTitle>API 配置</CardTitle>
              </div>
              <CardDescription>API 端点和请求配置</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-900 dark:bg-gray-800 text-gray-300 dark:text-gray-200 p-4 rounded-lg overflow-x-auto text-sm">
                {JSON.stringify(config.api, null, 2)}
              </pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center space-x-3">
                <Code className="w-5 h-5 text-orange-600" />
                <CardTitle>环境变量</CardTitle>
              </div>
              <CardDescription>前端运行时环境变量</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-900 dark:bg-gray-800 text-gray-300 dark:text-gray-200 p-4 rounded-lg overflow-x-auto text-sm font-mono">
                {Object.entries(import.meta.env)
                  .filter(([key]) => key.startsWith('VITE_'))
                  .map(([key, value]) => `${key}=${value}`)
                  .join('\n')}
              </pre>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ConfigDebugPage;