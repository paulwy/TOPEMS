import React, { useState, useEffect, useRef } from 'react';

export interface PerformanceMetrics {
  fps: number;
  memory: number;
  cpu: number;
  network: number;
}

export const PerformanceMonitor: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    memory: 0,
    cpu: 0,
    network: 0,
  });
  
  const frameTimes = useRef<number[]>([]);
  const lastTime = useRef<number>(performance.now());

  useEffect(() => {
    const measureFPS = () => {
      const currentTime = performance.now();
      const delta = currentTime - lastTime.current;
      lastTime.current = currentTime;
      
      frameTimes.current.push(delta);
      if (frameTimes.current.length > 60) {
        frameTimes.current.shift();
      }
      
      const avgDelta = frameTimes.current.reduce((a, b) => a + b, 0) / frameTimes.current.length;
      const fps = Math.round(1000 / avgDelta);
      
      setMetrics((prev) => ({ ...prev, fps }));
      
      requestAnimationFrame(measureFPS);
    };

    const measureMemory = () => {
      if (navigator.performance?.memory) {
        const memoryUsage = (navigator.performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(0);
        setMetrics((prev) => ({ ...prev, memory: parseInt(memoryUsage) }));
      }
    };

    measureFPS();
    measureMemory();
    
    const memoryInterval = setInterval(measureMemory, 1000);
    
    return () => {
      cancelAnimationFrame(measureFPS);
      clearInterval(memoryInterval);
    };
  }, []);

  const getFpsColor = (fps: number) => {
    if (fps >= 55) return 'text-green-600';
    if (fps >= 30) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="flex items-center space-x-4 text-sm">
      <div className="flex items-center space-x-1">
        <span className="text-gray-500">FPS:</span>
        <span className={`font-medium ${getFpsColor(metrics.fps)}`}>
          {metrics.fps}
        </span>
      </div>
      <div className="flex items-center space-x-1">
        <span className="text-gray-500">内存:</span>
        <span className="font-medium text-gray-700">{metrics.memory}MB</span>
      </div>
    </div>
  );
};

export interface NetworkMonitorProps {
  showDetails?: boolean;
}

export const NetworkMonitor: React.FC<NetworkMonitorProps> = ({ showDetails = false }) => {
  const [requests, setRequests] = useState<PerformanceResourceTiming[]>([]);
  const [totalRequests, setTotalRequests] = useState(0);
  const [totalTime, setTotalTime] = useState(0);

  useEffect(() => {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries() as PerformanceResourceTiming[];
      setRequests((prev) => [...prev, ...entries]);
      setTotalRequests((prev) => prev + entries.length);
      
      const time = entries.reduce((sum, entry) => sum + entry.duration, 0);
      setTotalTime((prev) => prev + time);
    });

    observer.observe({ type: 'resource', buffered: true });

    return () => {
      observer.disconnect();
    };
  }, []);

  if (!showDetails) {
    return (
      <div className="flex items-center space-x-1 text-sm">
        <span className="text-gray-500">请求:</span>
        <span className="font-medium text-gray-700">{totalRequests}</span>
        <span className="text-gray-500">|</span>
        <span className="text-gray-500">耗时:</span>
        <span className="font-medium text-gray-700">{totalTime.toFixed(0)}ms</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-sm font-medium text-gray-700 mb-3">网络请求监控</h3>
      <div className="space-y-2 max-h-40 overflow-auto">
        {requests.slice(-10).map((request, index) => (
          <div key={index} className="flex items-center justify-between text-xs">
            <span className="text-gray-600 truncate max-w-[200px]">{request.name}</span>
            <span className={`font-medium ${
              request.duration < 500 ? 'text-green-600' : 
              request.duration < 1000 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {request.duration.toFixed(0)}ms
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export interface PerformanceTimingProps {
  onComplete?: (timing: PerformanceNavigationTiming) => void;
}

export const PerformanceTiming: React.FC<PerformanceTimingProps> = ({ onComplete }) => {
  const [timing, setTiming] = useState<PerformanceNavigationTiming | null>(null);

  useEffect(() => {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntriesByType('navigation');
      if (entries.length > 0) {
        const navTiming = entries[0] as PerformanceNavigationTiming;
        setTiming(navTiming);
        onComplete?.(navTiming);
      }
    });

    observer.observe({ type: 'navigation' });

    return () => {
      observer.disconnect();
    };
  }, [onComplete]);

  if (!timing) return null;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-sm font-medium text-gray-700 mb-3">页面加载时间</h3>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-500">DNS查询:</span>
          <span className="ml-2 font-medium text-gray-700">{timing.domainLookupTime.toFixed(0)}ms</span>
        </div>
        <div>
          <span className="text-gray-500">TCP连接:</span>
          <span className="ml-2 font-medium text-gray-700">{timing.connectTime.toFixed(0)}ms</span>
        </div>
        <div>
          <span className="text-gray-500">请求响应:</span>
          <span className="ml-2 font-medium text-gray-700">{timing.requestStart.toFixed(0)}ms</span>
        </div>
        <div>
          <span className="text-gray-500">页面渲染:</span>
          <span className="ml-2 font-medium text-gray-700">{timing.domContentLoadedEventEnd.toFixed(0)}ms</span>
        </div>
        <div className="col-span-2 pt-2 border-t border-gray-100">
          <span className="text-gray-500">总加载时间:</span>
          <span className={`ml-2 font-medium ${
            timing.loadEventEnd < 3000 ? 'text-green-600' : 
            timing.loadEventEnd < 5000 ? 'text-yellow-600' : 'text-red-600'
          }`}>
            {timing.loadEventEnd.toFixed(0)}ms
          </span>
        </div>
      </div>
    </div>
  );
};

export default PerformanceMonitor;
