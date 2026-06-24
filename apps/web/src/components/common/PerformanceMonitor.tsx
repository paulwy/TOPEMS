import React, { useEffect, useState, useRef } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  TrendingUp,
  Send,
  History,
  X,
} from 'lucide-react';

interface PerformanceMetrics {
  fps: number;
  memory: number;
  cpu: number;
  networkLatency: number;
  renderTime: number;
  fcp: number;
  lcp: number;
  cls: number;
  fid: number;
  navigationTime: number;
}

interface HistoryItem {
  timestamp: number;
  metrics: PerformanceMetrics;
}

interface ReportData {
  timestamp: number;
  metrics: PerformanceMetrics;
  issues: string[];
  pageUrl: string;
  userAgent: string;
}

const PerformanceMonitor: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    memory: 0,
    cpu: 0,
    networkLatency: 0,
    renderTime: 0,
    fcp: 0,
    lcp: 0,
    cls: 0,
    fid: 0,
    navigationTime: 0,
  });

  const [isVisible, setIsVisible] = useState(false);
  const [performanceIssues, setPerformanceIssues] = useState<string[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isReporting, setIsReporting] = useState(false);
  const [reportStatus, setReportStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const animationFrameRef = useRef<number | undefined>(undefined);
  const lastTimeRef = useRef<number>(performance.now());
  const frameCountRef = useRef<number>(0);
  const lastReportTimeRef = useRef<number>(0);

  useEffect(() => {
    const measurePerformance = () => {
      const now = performance.now();
      frameCountRef.current++;

      if (now - lastTimeRef.current >= 1000) {
        const fps = Math.round((frameCountRef.current * 1000) / (now - lastTimeRef.current));
        frameCountRef.current = 0;
        lastTimeRef.current = now;

        const memory =
          (
            performance as unknown as {
              memory?: { usedJSHeapSize: number };
            }
          ).memory?.usedJSHeapSize || 0;
        const memoryMB = (memory / (1024 * 1024)).toFixed(1);

        const entries = performance.getEntriesByType('navigation');
        const navigationEntry = entries[0] as PerformanceNavigationTiming;

        const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
        const lcpEntry = lcpEntries[lcpEntries.length - 1] as any;

        const clsEntries = performance.getEntriesByType('layout-shift');
        const cls = clsEntries.reduce((acc, entry: any) => acc + entry.value, 0);

        const newMetrics: PerformanceMetrics = {
          fps,
          memory: parseFloat(memoryMB),
          cpu: Math.round((60 - fps) * 2),
          networkLatency: navigationEntry?.connectEnd - navigationEntry?.connectStart || 0,
          renderTime: Math.round(
            navigationEntry?.domContentLoadedEventEnd -
              navigationEntry?.domContentLoadedEventStart || 0
          ),
          fcp: Math.round(navigationEntry?.domContentLoadedEventEnd || 0),
          lcp: Math.round(lcpEntry?.startTime || 0),
          cls: Math.round(cls * 1000) / 1000,
          fid: Math.round(navigationEntry?.domInteractive - navigationEntry?.fetchStart || 0),
          navigationTime: Math.round(navigationEntry?.loadEventEnd || 0),
        };

        setMetrics(newMetrics);
        setHistory((prev) => {
          const updated = [...prev, { timestamp: Date.now(), metrics: newMetrics }];
          return updated.slice(-60);
        });

        const issues: string[] = [];
        if (fps < 30) issues.push('帧率过低 (<30 FPS)');
        if (parseFloat(memoryMB) > 500) issues.push('内存占用过高 (>500 MB)');
        if (newMetrics.networkLatency > 1000) issues.push('网络延迟过高 (>1s)');
        if (newMetrics.lcp > 2500) issues.push('LCP 缓慢 (>2.5s)');
        if (newMetrics.cls > 0.25) issues.push('布局偏移过大 (>0.25)');
        if (newMetrics.fid > 100) issues.push('首次输入延迟高 (>100ms)');
        setPerformanceIssues(issues);

        if (now - lastReportTimeRef.current >= 30000) {
          if (issues.length > 0) {
            reportPerformance({
              timestamp: Date.now(),
              metrics: newMetrics,
              issues,
              pageUrl: window.location.href,
              userAgent: navigator.userAgent,
            });
          }
          lastReportTimeRef.current = now;
        }
      }

      animationFrameRef.current = requestAnimationFrame(measurePerformance);
    };

    animationFrameRef.current = requestAnimationFrame(measurePerformance);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const reportPerformance = async (data: ReportData) => {
    setIsReporting(true);
    try {
      const response = await fetch('/api/performance/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        setReportStatus('success');
      } else {
        setReportStatus('error');
      }
    } catch {
      setReportStatus('error');
    } finally {
      setIsReporting(false);
      setTimeout(() => setReportStatus('idle'), 3000);
    }
  };

  const handleManualReport = () => {
    reportPerformance({
      timestamp: Date.now(),
      metrics,
      issues: performanceIssues,
      pageUrl: window.location.href,
      userAgent: navigator.userAgent,
    });
  };

  const getStatusColor = (value: number, thresholds: [number, number]) => {
    if (value < thresholds[0]) return 'text-green-500';
    if (value < thresholds[1]) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getPerformanceScore = () => {
    let score = 100;
    if (metrics.fps < 45) score -= 20;
    if (metrics.fps < 30) score -= 20;
    if (metrics.memory > 500) score -= 15;
    if (metrics.lcp > 2500) score -= 20;
    if (metrics.cls > 0.25) score -= 15;
    if (metrics.fid > 100) score -= 15;
    return Math.max(0, score);
  };

  const getScoreColor = () => {
    const score = getPerformanceScore();
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <>
      {isVisible && (
        <div
          style={{
            position: 'fixed',
            bottom: '16px',
            right: '16px',
            zIndex: 50,
            width: '384px',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid #e2e8f0',
            padding: '16px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity sx={{ width: 20, height: 20, color: '#2563eb' }} />
              <h3 style={{ fontWeight: 600, color: '#0f172a' }}>性能监控</h3>
            </div>
            <button
              onClick={() => setIsVisible(false)}
              style={{
                color: '#94a3b8',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <X sx={{ width: 20, height: 20 }} />
            </button>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
              padding: '16px',
              background: 'linear-gradient(to bottom right, #eff6ff, #faf5ff)',
              borderRadius: '12px',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  fontSize: '36px',
                  fontWeight: 700,
                  ...(getScoreColor() === 'text-green-500'
                    ? { color: '#22c55e' }
                    : getScoreColor() === 'text-yellow-500'
                      ? { color: '#eab308' }
                      : { color: '#ef4444' }),
                }}
              >
                {getPerformanceScore()}
              </div>
              <div style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>性能评分</div>
            </div>
          </div>

          {performanceIssues.length > 0 && (
            <div
              style={{
                marginBottom: '16px',
                padding: '12px',
                backgroundColor: '#fef2f2',
                borderRadius: '8px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#dc2626',
                  fontSize: '14px',
                }}
              >
                <AlertTriangle sx={{ width: 16, height: 16 }} />
                <span>检测到 {performanceIssues.length} 个性能问题</span>
              </div>
              <ul
                style={{
                  marginTop: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  maxHeight: '96px',
                  overflowY: 'auto',
                }}
              >
                {performanceIssues.map((issue, index) => (
                  <li
                    key={index}
                    style={{
                      fontSize: '12px',
                      color: '#ef4444',
                      marginLeft: '24px',
                    }}
                  >
                    • {issue}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap
                sx={{
                  width: 16,
                  height: 16,
                  color:
                    getStatusColor(metrics.fps, [45, 55]) === 'text-green-500'
                      ? '#22c55e'
                      : getStatusColor(metrics.fps, [45, 55]) === 'text-yellow-500'
                        ? '#eab308'
                        : '#ef4444',
                }}
              />
              <div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>帧率</div>
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 500,
                    color:
                      getStatusColor(metrics.fps, [45, 55]) === 'text-green-500'
                        ? '#22c55e'
                        : getStatusColor(metrics.fps, [45, 55]) === 'text-yellow-500'
                          ? '#eab308'
                          : '#ef4444',
                  }}
                >
                  {metrics.fps} FPS
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity
                sx={{
                  width: 16,
                  height: 16,
                  color:
                    getStatusColor(metrics.cpu, [20, 50]) === 'text-green-500'
                      ? '#22c55e'
                      : getStatusColor(metrics.cpu, [20, 50]) === 'text-yellow-500'
                        ? '#eab308'
                        : '#ef4444',
                }}
              />
              <div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>CPU</div>
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 500,
                    color:
                      getStatusColor(metrics.cpu, [20, 50]) === 'text-green-500'
                        ? '#22c55e'
                        : getStatusColor(metrics.cpu, [20, 50]) === 'text-yellow-500'
                          ? '#eab308'
                          : '#ef4444',
                  }}
                >
                  {metrics.cpu}%
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock
                sx={{
                  width: 16,
                  height: 16,
                  color:
                    getStatusColor(metrics.networkLatency, [200, 500]) === 'text-green-500'
                      ? '#22c55e'
                      : getStatusColor(metrics.networkLatency, [200, 500]) === 'text-yellow-500'
                        ? '#eab308'
                        : '#ef4444',
                }}
              />
              <div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>网络延迟</div>
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 500,
                    color:
                      getStatusColor(metrics.networkLatency, [200, 500]) === 'text-green-500'
                        ? '#22c55e'
                        : getStatusColor(metrics.networkLatency, [200, 500]) === 'text-yellow-500'
                          ? '#eab308'
                          : '#ef4444',
                  }}
                >
                  {metrics.networkLatency}ms
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp
                sx={{
                  width: 16,
                  height: 16,
                  color:
                    getStatusColor(metrics.lcp, [1200, 2500]) === 'text-green-500'
                      ? '#22c55e'
                      : getStatusColor(metrics.lcp, [1200, 2500]) === 'text-yellow-500'
                        ? '#eab308'
                        : '#ef4444',
                }}
              />
              <div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>LCP</div>
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 500,
                    color:
                      getStatusColor(metrics.lcp, [1200, 2500]) === 'text-green-500'
                        ? '#22c55e'
                        : getStatusColor(metrics.lcp, [1200, 2500]) === 'text-yellow-500'
                          ? '#eab308'
                          : '#ef4444',
                  }}
                >
                  {metrics.lcp}ms
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              borderTop: '1px solid #f1f5f9',
              paddingTop: '12px',
              marginBottom: '16px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '8px',
              }}
            >
              <History sx={{ width: 16, height: 16, color: '#64748b' }} />
              <span style={{ fontSize: '12px', color: '#64748b' }}>实时趋势</span>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: '4px',
                height: '32px',
              }}
            >
              {history.map((item, index) => (
                <div
                  key={index}
                  style={{
                    flex: 1,
                    borderRadius: '4px 4px 0 0',
                    transition: 'all 0.2s',
                    height: `${(item.metrics.fps / 60) * 100}%`,
                    backgroundColor:
                      item.metrics.fps >= 45
                        ? '#22c55e'
                        : item.metrics.fps >= 30
                          ? '#eab308'
                          : '#ef4444',
                  }}
                  title={`${item.metrics.fps} FPS`}
                />
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              onClick={handleManualReport}
              disabled={isReporting}
              sx={{
                flex: 1,
                backgroundColor: '#2563eb',
                color: '#ffffff',
                fontSize: '14px',
              }}
            >
              <Send sx={{ width: 16, height: 16, marginRight: '8px' }} />
              {isReporting ? '上报中...' : '上报数据'}
            </Button>
            {reportStatus === 'success' && (
              <CheckCircle
                sx={{
                  width: 20,
                  height: 20,
                  color: '#22c55e',
                  alignSelf: 'center',
                }}
              />
            )}
            {reportStatus === 'error' && (
              <AlertTriangle
                sx={{
                  width: 20,
                  height: 20,
                  color: '#ef4444',
                  alignSelf: 'center',
                }}
              />
            )}
          </div>

          <div
            style={{
              marginTop: '12px',
              paddingTop: '12px',
              borderTop: '1px solid #f1f5f9',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '8px',
                fontSize: '12px',
                color: '#64748b',
              }}
            >
              <div>
                <div>FCP</div>
                <div style={{ fontWeight: 500, color: '#475569' }}>{metrics.fcp}ms</div>
              </div>
              <div>
                <div>CLS</div>
                <div style={{ fontWeight: 500, color: '#475569' }}>{metrics.cls}</div>
              </div>
              <div>
                <div>FID</div>
                <div style={{ fontWeight: 500, color: '#475569' }}>{metrics.fid}ms</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setIsVisible(!isVisible)}
        style={{
          position: 'fixed',
          bottom: '16px',
          right: '16px',
          zIndex: 40,
          width: '56px',
          height: '56px',
          borderRadius: '9999px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s',
          backgroundColor: isVisible
            ? '#2563eb'
            : performanceIssues.length > 0
              ? '#ef4444'
              : '#334155',
          color: '#ffffff',
          animation: performanceIssues.length > 0 && !isVisible ? 'pulse 2s infinite' : 'none',
          cursor: 'pointer',
          border: 'none',
        }}
        title={
          performanceIssues.length > 0
            ? `检测到 ${performanceIssues.length} 个性能问题`
            : '打开性能监控'
        }
      >
        <Activity sx={{ width: 24, height: 24 }} />
      </button>
    </>
  );
};

const Button = ({
  children,
  onClick,
  disabled,
  className,
  sx,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  sx?: React.CSSProperties;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
      disabled ? 'opacity-50 cursor-not-allowed' : ''
    } ${className}`}
    style={sx}
  >
    {children}
  </button>
);

export default PerformanceMonitor;
