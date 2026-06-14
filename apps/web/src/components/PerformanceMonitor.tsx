import React, { useEffect, useState, useRef } from "react";
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
} from "lucide-react";

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
  const [reportStatus, setReportStatus] = useState<
    "idle" | "success" | "error"
  >("idle");

  const animationFrameRef = useRef<number | undefined>(undefined);
  const lastTimeRef = useRef<number>(performance.now());
  const frameCountRef = useRef<number>(0);
  const lastReportTimeRef = useRef<number>(0);

  useEffect(() => {
    const measurePerformance = () => {
      const now = performance.now();
      frameCountRef.current++;

      if (now - lastTimeRef.current >= 1000) {
        const fps = Math.round(
          (frameCountRef.current * 1000) / (now - lastTimeRef.current),
        );
        frameCountRef.current = 0;
        lastTimeRef.current = now;

        const memory =
          (
            performance as unknown as {
              memory?: { usedJSHeapSize: number };
            }
          ).memory?.usedJSHeapSize || 0;
        const memoryMB = (memory / (1024 * 1024)).toFixed(1);

        const entries = performance.getEntriesByType("navigation");
        const navigationEntry = entries[0] as PerformanceNavigationTiming;

        const lcpEntries = performance.getEntriesByType(
          "largest-contentful-paint",
        );
        const lcpEntry = lcpEntries[lcpEntries.length - 1] as any;

        const clsEntries = performance.getEntriesByType("layout-shift");
        const cls = clsEntries.reduce(
          (acc, entry: any) => acc + entry.value,
          0,
        );

        const newMetrics: PerformanceMetrics = {
          fps,
          memory: parseFloat(memoryMB),
          cpu: Math.round((60 - fps) * 2),
          networkLatency:
            navigationEntry?.connectEnd - navigationEntry?.connectStart || 0,
          renderTime: Math.round(
            navigationEntry?.domContentLoadedEventEnd -
              navigationEntry?.domContentLoadedEventStart || 0,
          ),
          fcp: Math.round(navigationEntry?.domContentLoadedEventEnd || 0),
          lcp: Math.round(lcpEntry?.startTime || 0),
          cls: Math.round(cls * 1000) / 1000,
          fid: Math.round(
            navigationEntry?.domInteractive - navigationEntry?.fetchStart || 0,
          ),
          navigationTime: Math.round(navigationEntry?.loadEventEnd || 0),
        };

        setMetrics(newMetrics);
        setHistory((prev) => {
          const updated = [
            ...prev,
            { timestamp: Date.now(), metrics: newMetrics },
          ];
          return updated.slice(-60);
        });

        const issues: string[] = [];
        if (fps < 30) issues.push("帧率过低 (<30 FPS)");
        if (parseFloat(memoryMB) > 500) issues.push("内存占用过高 (>500 MB)");
        if (newMetrics.networkLatency > 1000) issues.push("网络延迟过高 (>1s)");
        if (newMetrics.lcp > 2500) issues.push("LCP 缓慢 (>2.5s)");
        if (newMetrics.cls > 0.25) issues.push("布局偏移过大 (>0.25)");
        if (newMetrics.fid > 100) issues.push("首次输入延迟高 (>100ms)");
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
      const response = await fetch("/api/performance/report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        setReportStatus("success");
      } else {
        setReportStatus("error");
      }
    } catch {
      setReportStatus("error");
    } finally {
      setIsReporting(false);
      setTimeout(() => setReportStatus("idle"), 3000);
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
    if (value < thresholds[0]) return "text-green-500";
    if (value < thresholds[1]) return "text-yellow-500";
    return "text-red-500";
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
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <>
      {isVisible && (
        <div className="fixed bottom-4 right-4 z-50 w-96 bg-white rounded-xl shadow-2xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-slate-900">性能监控</h3>
            </div>
            <button
              onClick={() => setIsVisible(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center justify-center mb-4 p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl">
            <div className="text-center">
              <div className={`text-4xl font-bold ${getScoreColor()}`}>
                {getPerformanceScore()}
              </div>
              <div className="text-sm text-slate-500 mt-1">性能评分</div>
            </div>
          </div>

          {performanceIssues.length > 0 && (
            <div className="mb-4 p-3 bg-red-50 rounded-lg">
              <div className="flex items-center gap-2 text-red-600 text-sm">
                <AlertTriangle className="w-4 h-4" />
                <span>检测到 {performanceIssues.length} 个性能问题</span>
              </div>
              <ul className="mt-2 space-y-1 max-h-24 overflow-y-auto">
                {performanceIssues.map((issue, index) => (
                  <li key={index} className="text-xs text-red-500 ml-6">
                    • {issue}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Zap
                className={`w-4 h-4 ${getStatusColor(metrics.fps, [45, 55])}`}
              />
              <div>
                <div className="text-xs text-slate-500">帧率</div>
                <div
                  className={`text-sm font-medium ${getStatusColor(
                    metrics.fps,
                    [45, 55],
                  )}`}
                >
                  {metrics.fps} FPS
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Activity
                className={`w-4 h-4 ${getStatusColor(metrics.cpu, [20, 50])}`}
              />
              <div>
                <div className="text-xs text-slate-500">CPU</div>
                <div
                  className={`text-sm font-medium ${getStatusColor(
                    metrics.cpu,
                    [20, 50],
                  )}`}
                >
                  {metrics.cpu}%
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock
                className={`w-4 h-4 ${getStatusColor(
                  metrics.networkLatency,
                  [200, 500],
                )}`}
              />
              <div>
                <div className="text-xs text-slate-500">网络延迟</div>
                <div
                  className={`text-sm font-medium ${getStatusColor(
                    metrics.networkLatency,
                    [200, 500],
                  )}`}
                >
                  {metrics.networkLatency}ms
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp
                className={`w-4 h-4 ${getStatusColor(metrics.lcp, [1200, 2500])}`}
              />
              <div>
                <div className="text-xs text-slate-500">LCP</div>
                <div
                  className={`text-sm font-medium ${getStatusColor(
                    metrics.lcp,
                    [1200, 2500],
                  )}`}
                >
                  {metrics.lcp}ms
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <History className="w-4 h-4 text-slate-500" />
              <span className="text-xs text-slate-500">实时趋势</span>
            </div>
            <div className="flex items-end gap-1 h-8">
              {history.map((item, index) => (
                <div
                  key={index}
                  className="flex-1 rounded-t transition-all"
                  style={{
                    height: `${(item.metrics.fps / 60) * 100}%`,
                    backgroundColor:
                      item.metrics.fps >= 45
                        ? "#22c55e"
                        : item.metrics.fps >= 30
                          ? "#eab308"
                          : "#ef4444",
                  }}
                  title={`${item.metrics.fps} FPS`}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleManualReport}
              disabled={isReporting}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm"
            >
              <Send className="w-4 h-4 mr-2" />
              {isReporting ? "上报中..." : "上报数据"}
            </Button>
            {reportStatus === "success" && (
              <CheckCircle className="w-5 h-5 text-green-500 self-center" />
            )}
            {reportStatus === "error" && (
              <AlertTriangle className="w-5 h-5 text-red-500 self-center" />
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100">
            <div className="grid grid-cols-3 gap-2 text-xs text-slate-500">
              <div>
                <div>FCP</div>
                <div className="font-medium text-slate-700">
                  {metrics.fcp}ms
                </div>
              </div>
              <div>
                <div>CLS</div>
                <div className="font-medium text-slate-700">{metrics.cls}</div>
              </div>
              <div>
                <div>FID</div>
                <div className="font-medium text-slate-700">
                  {metrics.fid}ms
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setIsVisible(!isVisible)}
        className={`fixed bottom-4 right-4 z-40 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all ${
          isVisible
            ? "bg-blue-600 text-white"
            : performanceIssues.length > 0
              ? "bg-red-500 text-white animate-pulse"
              : "bg-slate-700 text-white hover:bg-slate-600"
        }`}
        title={
          performanceIssues.length > 0
            ? `检测到 ${performanceIssues.length} 个性能问题`
            : "打开性能监控"
        }
      >
        <Activity className="w-6 h-6" />
      </button>
    </>
  );
};

const Button = ({
  children,
  onClick,
  disabled,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
      disabled ? "opacity-50 cursor-not-allowed" : ""
    } ${className}`}
  >
    {children}
  </button>
);

export default PerformanceMonitor;
