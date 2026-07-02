import React, { useEffect, useState, useCallback } from 'react';
import {
  Package,
  HardDrive,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { logger } from '@/utils/logger';

interface BundleEntry {
  name: string;
  size: number;
  type: 'js' | 'css' | 'img' | 'font' | 'other';
}

interface BundleStats {
  totalSize: number;
  jsSize: number;
  cssSize: number;
  imgSize: number;
  fontSize: number;
  entryCount: number;
  entries: BundleEntry[];
  loadTime: number;
}

interface BundleSizeMonitorProps {
  threshold?: number;
  enabled?: boolean;
}

const formatSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const _getTypeColor = (type: BundleEntry['type']): string => {
  const colors: Record<BundleEntry['type'], string> = {
    js: 'text-blue-500',
    css: 'text-purple-500',
    img: 'text-green-500',
    font: 'text-orange-500',
    other: 'text-gray-500',
  };
  return colors[type];
};

const _getTypeLabel = (type: BundleEntry['type']): string => {
  const labels: Record<BundleEntry['type'], string> = {
    js: 'JavaScript',
    css: 'CSS',
    img: '图片',
    font: '字体',
    other: '其他',
  };
  return labels[type];
};

export const BundleSizeMonitor: React.FC<BundleSizeMonitorProps> = ({
  threshold = 1024 * 1024 * 2,
  enabled = process.env.NODE_ENV === 'development',
}) => {
  const [stats, setStats] = useState<BundleStats | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasWarning, setHasWarning] = useState(false);

  const analyzeBundle = useCallback(async () => {
    if (!enabled) return;

    try {
      const startTime = performance.now();
      const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];

      const bundleEntries: BundleEntry[] = entries.map((entry) => {
        const url = new URL(entry.name);
        const path = url.pathname;
        let type: BundleEntry['type'] = 'other';

        if (path.endsWith('.js') || path.includes('.js?')) {
          type = 'js';
        } else if (path.endsWith('.css') || path.includes('.css?')) {
          type = 'css';
        } else if (path.match(/\.(png|jpg|jpeg|gif|svg|webp|ico)$/)) {
          type = 'img';
        } else if (path.match(/\.(woff|woff2|ttf|eot|otf)$/)) {
          type = 'font';
        }

        return {
          name: url.pathname.split('/').pop() || entry.name,
          size: entry.transferSize || entry.encodedBodySize || 0,
          type,
        };
      });

      const totalSize = bundleEntries.reduce((sum, entry) => sum + entry.size, 0);
      const jsSize = bundleEntries
        .filter((e) => e.type === 'js')
        .reduce((sum, e) => sum + e.size, 0);
      const cssSize = bundleEntries
        .filter((e) => e.type === 'css')
        .reduce((sum, e) => sum + e.size, 0);
      const imgSize = bundleEntries
        .filter((e) => e.type === 'img')
        .reduce((sum, e) => sum + e.size, 0);
      const fontSize = bundleEntries
        .filter((e) => e.type === 'font')
        .reduce((sum, e) => sum + e.size, 0);

      const loadTime = performance.now() - startTime;

      const newStats: BundleStats = {
        totalSize,
        jsSize,
        cssSize,
        imgSize,
        fontSize,
        entryCount: bundleEntries.length,
        entries: bundleEntries.sort((a, b) => b.size - a.size).slice(0, 20),
        loadTime,
      };

      setStats(newStats);
      setHasWarning(totalSize > threshold);

      logger.info(
        `[Bundle Monitor] Total size: ${formatSize(totalSize)}, Entries: ${bundleEntries.length}`
      );
    } catch (error) {
      logger.error('[Bundle Monitor] Failed to analyze bundle:', error);
    }
  }, [enabled, threshold]);

  useEffect(() => {
    if (!enabled) return;

    const handleLoad = () => {
      setTimeout(analyzeBundle, 1000);
    };

    if (document.readyState === 'complete') {
      handleLoad();
      return;
    } else {
      window.addEventListener('load', handleLoad);
      return () => window.removeEventListener('load', handleLoad);
    }
  }, [enabled, analyzeBundle]);

  if (!enabled || !stats) return null;

  const getScore = () => {
    const maxSize = threshold * 2;
    const score = Math.max(0, 100 - (stats.totalSize / maxSize) * 100);
    return Math.round(score);
  };

  const getScoreColor = () => {
    const score = getScore();
    if (score >= 70) return 'text-green-500';
    if (score >= 40) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <>
      {isVisible && (
        <div
          className='fixed bottom-24 right-4 z-50 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden'
          style={{
            position: 'fixed',
            bottom: '88px',
            right: '16px',
            zIndex: 50,
            width: '384px',
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid grey.200',
            overflow: 'hidden',
          }}
        >
          <div
            className='flex items-center justify-between p-4 border-b border-gray-100'
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px',
              borderBottom: '1px solid grey.100',
            }}
          >
            <div className='flex items-center gap-2'>
              <Package
                className='w-5 h-5'
                style={{ color: '#6366f1' }}
              />
              <h3 className='font-semibold text-gray-900'>包体积监控</h3>
            </div>
            <button
              onClick={() => setIsVisible(false)}
              className='p-1 hover:bg-gray-100 rounded transition-colors'
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '4px',
              }}
            >
              <X className='w-5 h-5 text-gray-400' />
            </button>
          </div>

          <div
            className='p-4'
            style={{ padding: '16px' }}
          >
            <div
              className='flex items-center justify-center mb-4 p-4 rounded-xl'
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
                padding: '16px',
                background: 'linear-gradient(to bottom right, #e0e7ff, #f0fdf4)',
                borderRadius: '12px',
              }}
            >
              <div className='text-center'>
                <div
                  className='text-3xl font-bold'
                  style={{
                    fontSize: '36px',
                    fontWeight: 700,
                    color:
                      getScoreColor() === 'text-green-500'
                        ? '#16a34a'
                        : getScoreColor() === 'text-yellow-500'
                          ? '#ca8a04'
                          : 'error.700',
                  }}
                >
                  {getScore()}
                </div>
                <div className='text-sm text-gray-600 mt-1'>包体积评分</div>
              </div>
            </div>

            {hasWarning && (
              <div
                className='mb-4 p-3 rounded-lg'
                style={{
                  marginBottom: '16px',
                  padding: '12px',
                  backgroundColor: 'warning.100',
                  borderRadius: '8px',
                }}
              >
                <div className='flex items-center gap-2 text-amber-800 text-sm'>
                  <AlertTriangle className='w-4 h-4' />
                  <span>包体积超过阈值 ({formatSize(threshold)})</span>
                </div>
              </div>
            )}

            <div
              className='grid grid-cols-2 gap-3 mb-4'
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px',
                marginBottom: '16px',
              }}
            >
              <div className='p-3 bg-gray-50 rounded-lg'>
                <div className='flex items-center gap-2 mb-1'>
                  <HardDrive className='w-4 h-4 text-blue-500' />
                  <span className='text-xs text-gray-600'>总大小</span>
                </div>
                <div className='font-semibold text-gray-900'>{formatSize(stats.totalSize)}</div>
              </div>
              <div className='p-3 bg-gray-50 rounded-lg'>
                <div className='flex items-center gap-2 mb-1'>
                  <BarChart3 className='w-4 h-4 text-purple-500' />
                  <span className='text-xs text-gray-600'>资源数量</span>
                </div>
                <div className='font-semibold text-gray-900'>{stats.entryCount}</div>
              </div>
            </div>

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className='w-full flex items-center justify-between text-sm text-gray-600 hover:text-gray-900 mb-2'
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              <span className='font-medium'>资源详情</span>
              {isExpanded ? <ChevronUp className='w-4 h-4' /> : <ChevronDown className='w-4 h-4' />}
            </button>

            {isExpanded && (
              <div
                className='space-y-2 max-h-64 overflow-y-auto mb-4'
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  maxHeight: '256px',
                  overflowY: 'auto',
                  marginBottom: '16px',
                }}
              >
                {stats.entries.map((entry, index) => (
                  <div
                    key={index}
                    className='flex items-center justify-between p-2 bg-gray-50 rounded-lg'
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px',
                      backgroundColor: '#f9fafb',
                      borderRadius: '8px',
                    }}
                  >
                    <div className='flex items-center gap-2 flex-1 min-w-0'>
                      <span
                        className={`w-2 h-2 rounded-full ${entry.type === 'js' ? 'bg-blue-500' : entry.type === 'css' ? 'bg-purple-500' : entry.type === 'img' ? 'bg-green-500' : entry.type === 'font' ? 'bg-orange-500' : 'bg-gray-400'}`}
                      />
                      <span
                        className='text-sm truncate'
                        title={entry.name}
                        style={{ flex: 1, minWidth: 0 }}
                      >
                        {entry.name}
                      </span>
                    </div>
                    <span className='text-sm font-medium text-gray-700'>
                      {formatSize(entry.size)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div
              className='pt-3 border-t border-gray-100'
              style={{
                paddingTop: '12px',
                borderTop: '1px solid grey.100',
              }}
            >
              <div className='text-xs text-gray-500 mb-2'>按类型分布</div>
              <div className='flex gap-1'>
                {stats.jsSize > 0 && (
                  <div
                    className='flex-1 bg-blue-500 rounded-full'
                    style={{
                      height: '8px',
                      borderRadius: '9999px',
                      width: `${(stats.jsSize / stats.totalSize) * 100}%`,
                    }}
                    title={`JS: ${formatSize(stats.jsSize)}`}
                  />
                )}
                {stats.cssSize > 0 && (
                  <div
                    className='flex-1 bg-purple-500 rounded-full'
                    style={{
                      height: '8px',
                      borderRadius: '9999px',
                      width: `${(stats.cssSize / stats.totalSize) * 100}%`,
                    }}
                    title={`CSS: ${formatSize(stats.cssSize)}`}
                  />
                )}
                {stats.imgSize > 0 && (
                  <div
                    className='flex-1 bg-green-500 rounded-full'
                    style={{
                      height: '8px',
                      borderRadius: '9999px',
                      width: `${(stats.imgSize / stats.totalSize) * 100}%`,
                    }}
                    title={`Images: ${formatSize(stats.imgSize)}`}
                  />
                )}
                {stats.fontSize > 0 && (
                  <div
                    className='flex-1 bg-orange-500 rounded-full'
                    style={{
                      height: '8px',
                      borderRadius: '9999px',
                      width: `${(stats.fontSize / stats.totalSize) * 100}%`,
                    }}
                    title={`Fonts: ${formatSize(stats.fontSize)}`}
                  />
                )}
              </div>
              <div className='flex gap-3 mt-2'>
                {stats.jsSize > 0 && (
                  <span className='text-xs text-gray-500'>
                    <span className='text-blue-500 font-medium'>JS</span> {formatSize(stats.jsSize)}
                  </span>
                )}
                {stats.cssSize > 0 && (
                  <span className='text-xs text-gray-500'>
                    <span className='text-purple-500 font-medium'>CSS</span>{' '}
                    {formatSize(stats.cssSize)}
                  </span>
                )}
                {stats.imgSize > 0 && (
                  <span className='text-xs text-gray-500'>
                    <span className='text-green-500 font-medium'>Img</span>{' '}
                    {formatSize(stats.imgSize)}
                  </span>
                )}
                {stats.fontSize > 0 && (
                  <span className='text-xs text-gray-500'>
                    <span className='text-orange-500 font-medium'>Font</span>{' '}
                    {formatSize(stats.fontSize)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setIsVisible(!isVisible)}
        className='fixed bottom-24 right-4 z-40 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all'
        style={{
          position: 'fixed',
          bottom: '88px',
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
          backgroundColor: hasWarning ? 'error.700' : '#4f46e5',
          color: 'white',
          border: 'none',
          cursor: 'pointer',
        }}
        title={hasWarning ? `包体积过大: ${formatSize(stats.totalSize)}` : '打开包体积监控'}
      >
        {hasWarning ? (
          <AlertTriangle className='w-6 h-6 animate-pulse' />
        ) : (
          <Package className='w-6 h-6' />
        )}
      </button>
    </>
  );
};

export default BundleSizeMonitor;
