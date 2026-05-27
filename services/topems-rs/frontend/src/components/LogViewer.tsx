import React, { useState, useCallback, useEffect, useRef } from 'react';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
}

export interface LogViewerProps {
  logs: LogEntry[];
  autoScroll?: boolean;
  filterLevel?: LogLevel;
  searchTerm?: string;
}

export const LogViewer: React.FC<LogViewerProps> = ({
  logs,
  autoScroll = true,
  filterLevel,
  searchTerm = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<LogLevel | 'all'>('all');
  const [search, setSearch] = useState(searchTerm);
  const [showContext, setShowContext] = useState<string | null>(null);

  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const filteredLogs = logs.filter((log) => {
    if (filter !== 'all' && log.level !== filter) return false;
    if (search && !log.message.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const getLevelStyles = (level: LogLevel) => {
    switch (level) {
      case 'debug':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'info':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'warn':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'error':
        return 'bg-red-50 text-red-700 border-red-200';
    }
  };

  const getLevelLabel = (level: LogLevel) => {
    switch (level) {
      case 'debug':
        return 'DEBUG';
      case 'info':
        return 'INFO';
      case 'warn':
        return 'WARN';
      case 'error':
        return 'ERROR';
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  const toggleContext = useCallback((id: string) => {
    setShowContext((prev) => (prev === id ? null : id));
  }, []);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-gray-50 border-b">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">日志</span>
          <span className="text-xs text-gray-500">({filteredLogs.length} 条)</span>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as LogLevel | 'all')}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg"
          >
            <option value="all">全部级别</option>
            <option value="debug">DEBUG</option>
            <option value="info">INFO</option>
            <option value="warn">WARN</option>
            <option value="error">ERROR</option>
          </select>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索日志..."
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg w-40"
          />
        </div>
      </div>
      <div
        ref={containerRef}
        className="h-[400px] overflow-auto p-2 space-y-1"
      >
        {filteredLogs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            暂无日志
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div
              key={log.id}
              className={`p-3 rounded-lg border ${getLevelStyles(log.level)} cursor-pointer hover:opacity-80 transition-opacity`}
            >
              <div className="flex items-start space-x-3">
                <span className="text-xs font-bold uppercase">{getLevelLabel(log.level)}</span>
                <span className="text-xs opacity-70">{formatTime(log.timestamp)}</span>
                <span className="flex-1 text-sm">{log.message}</span>
              </div>
              {log.context && Object.keys(log.context).length > 0 && (
                <>
                  <button
                    onClick={() => toggleContext(log.id)}
                    className="mt-2 text-xs opacity-70 hover:opacity-100"
                  >
                    {showContext === log.id ? '隐藏详情' : '显示详情'}
                  </button>
                  {showContext === log.id && (
                    <pre className="mt-2 p-2 bg-white bg-opacity-50 rounded text-xs overflow-auto">
                      {JSON.stringify(log.context, null, 2)}
                    </pre>
                  )}
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export interface LiveLogViewerProps {
  endpoint: string;
  autoReconnect?: boolean;
}

export const LiveLogViewer: React.FC<LiveLogViewerProps> = ({
  endpoint,
  autoReconnect = true,
}) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const connect = () => {
      const es = new EventSource(endpoint);

      es.onopen = () => {
        setConnected(true);
        setReconnectAttempts(0);
      };

      es.onmessage = (event) => {
        try {
          const log: LogEntry = JSON.parse(event.data);
          setLogs((prev) => [...prev, log]);
        } catch (error) {
          console.error('Failed to parse log:', error);
        }
      };

      es.onerror = () => {
        setConnected(false);
        es.close();
        
        if (autoReconnect) {
          const attempts = reconnectAttempts + 1;
          setReconnectAttempts(attempts);
          setTimeout(connect, Math.min(attempts * 1000, 10000));
        }
      };

      eventSourceRef.current = es;

      return () => {
        es.close();
      };
    };

    connect();

    return () => {
      eventSourceRef.current?.close();
    };
  }, [endpoint, autoReconnect, reconnectAttempts]);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-700">实时日志</span>
        <div className="flex items-center space-x-2">
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-xs text-gray-500">
            {connected ? '已连接' : `断开连接 (重试 ${reconnectAttempts})`}
          </span>
        </div>
      </div>
      <LogViewer logs={logs} autoScroll />
    </div>
  );
};

export const useLog = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const addLog = useCallback((level: LogLevel, message: string, context?: Record<string, unknown>) => {
    const entry: LogEntry = {
      id: Date.now().toString(),
      timestamp: new Date(),
      level,
      message,
      context,
    };
    setLogs((prev) => [...prev, entry]);
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  const debug = useCallback((message: string, context?: Record<string, unknown>) => {
    addLog('debug', message, context);
  }, [addLog]);

  const info = useCallback((message: string, context?: Record<string, unknown>) => {
    addLog('info', message, context);
  }, [addLog]);

  const warn = useCallback((message: string, context?: Record<string, unknown>) => {
    addLog('warn', message, context);
  }, [addLog]);

  const error = useCallback((message: string, context?: Record<string, unknown>) => {
    addLog('error', message, context);
  }, [addLog]);

  return {
    logs,
    clearLogs,
    debug,
    info,
    warn,
    error,
  };
};

export default LogViewer;
