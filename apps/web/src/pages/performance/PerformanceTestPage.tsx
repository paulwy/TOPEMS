import React, { useEffect, useState, useRef } from 'react';
import { logger } from '@/utils/logger';
import { designTokens, semanticTokens } from '@topems/tokens';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { FormPageTemplate } from '@/components/templates';

interface LayoutShift {
  value: number;
}

const icons: Record<string, React.ReactNode> = {
  zap: <polygon points='13 2 3 14 12 14 11 22 21 10 12 10 13 2'></polygon>,
  timer: (
    <>
      <circle
        cx='12'
        cy='12'
        r='10'
      ></circle>
      <polyline points='12 6 12 12 16 14'></polyline>
    </>
  ),
  gauge: (
    <>
      <circle
        cx='12'
        cy='12'
        r='10'
      ></circle>
      <path d='M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20'></path>
      <path d='M12 2a14.5 14.5 0 0 1 0 20 14.5 14.5 0 0 1 0-20'></path>
    </>
  ),
  layers: (
    <>
      <rect
        x='3'
        y='3'
        width='18'
        height='18'
        rx='2'
        ry='2'
      ></rect>
      <line
        x1='9'
        y1='9'
        x2='15'
        y2='9'
      ></line>
      <line
        x1='9'
        y1='15'
        x2='15'
        y2='15'
      ></line>
    </>
  ),
  shield: <path d='M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10'></path>,
  globe: (
    <>
      <circle
        cx='12'
        cy='10'
        r='3'
      ></circle>
      <path d='M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z'></path>
    </>
  ),
  cpu: (
    <>
      <rect
        x='4'
        y='4'
        width='16'
        height='16'
        rx='2'
      ></rect>
      <line
        x1='9'
        y1='9'
        x2='15'
        y2='9'
      ></line>
      <line
        x1='9'
        y1='15'
        x2='15'
        y2='15'
      ></line>
    </>
  ),
  database: (
    <>
      <ellipse
        cx='12'
        cy='5'
        rx='9'
        ry='3'
      ></ellipse>
      <path d='M21 12c0 1.66-4 3-9 3s-9-1.34-9-3'></path>
      <path d='M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5'></path>
    </>
  ),
};

const iconKeys = ['zap', 'timer', 'gauge', 'layers', 'shield', 'globe', 'cpu', 'database'];

const PerformanceTestPage: React.FC = () => {
  const { t } = useTranslation('performance');
  const [loadTime, setLoadTime] = useState<number | null>(null);
  const [renderComplete, setRenderComplete] = useState(false);
  const [renderCount, setRenderCount] = useState(0);
  const [avgRenderTime, setAvgRenderTime] = useState<number | null>(null);
  const [navigationTime, setNavigationTime] = useState<number | null>(null);
  const [firstPaint, setFirstPaint] = useState<number | null>(null);
  const [firstContentfulPaint, setFirstContentfulPaint] = useState<number | null>(null);
  const [domContentLoaded, setDomContentLoaded] = useState<number | null>(null);
  const [lcpTime, setLcpTime] = useState<number | null>(null);
  const [ttiTime, setTtiTime] = useState<number | null>(null);
  const [fidTime, setFidTime] = useState<number | null>(null);
  const [clsScore, setClsScore] = useState<number | null>(null);
  const [, setWindowLoad] = useState<number | null>(null);
  const renderCountRef = useRef(0);
  const lastRenderTimeRef = useRef<number>(performance.now());
  const renderTimesRef = useRef<number[]>([]);

  useEffect(() => {
    renderCountRef.current += 1;
    const currentTime = performance.now();
    const timeSinceLastRender = currentTime - lastRenderTimeRef.current;
    lastRenderTimeRef.current = currentTime;
    if (renderCountRef.current > 1) {
      renderTimesRef.current.push(timeSinceLastRender);
    }
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setRenderCount(renderCountRef.current);
      if (renderTimesRef.current.length > 0) {
        const avg =
          renderTimesRef.current.reduce((a, b) => a + b, 0) / renderTimesRef.current.length;
        setAvgRenderTime(avg);
      }
    }, 500);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const startTime = performance.now();
    const timer = setTimeout(() => {
      const endTime = performance.now();
      setLoadTime(endTime - startTime);
      setRenderComplete(true);
    }, 100);

    const navTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navTiming) {
      setNavigationTime(navTiming.loadEventEnd - navTiming.startTime);
      setDomContentLoaded(navTiming.domContentLoadedEventEnd - navTiming.startTime);
      setWindowLoad(navTiming.loadEventEnd - navTiming.startTime);
    }

    const checkPaintTiming = () => {
      const paintTiming = performance.getEntriesByType('paint');
      if (paintTiming.length > 0) {
        paintTiming.forEach((entry) => {
          if (entry.name === 'first-paint') {
            setFirstPaint(entry.startTime);
          } else if (entry.name === 'first-contentful-paint') {
            setFirstContentfulPaint(entry.startTime);
          }
        });
      } else {
        const firstPaintTime = performance.now();
        setFirstPaint(firstPaintTime);
        setFirstContentfulPaint(firstPaintTime);
      }
    };

    setTimeout(checkPaintTiming, 50);

    const paintObserver = new PerformanceObserver((entryList) => {
      entryList.getEntries().forEach((entry) => {
        if (entry.entryType === 'paint') {
          if (entry.name === 'first-paint') {
            setFirstPaint(entry.startTime);
          } else if (entry.name === 'first-contentful-paint') {
            setFirstContentfulPaint(entry.startTime);
          }
        }
      });
    });

    try {
      paintObserver.observe({ entryTypes: ['paint'] });
    } catch (e) {
      const fallbackTime = performance.now();
      setFirstPaint(fallbackTime);
      setFirstContentfulPaint(fallbackTime);
    }

    const lcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lcpEntry = entries[entries.length - 1];
      if (lcpEntry) {
        setLcpTime(lcpEntry.startTime);
      }
    });

    try {
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (e) {
      logger.warn('LCP observer not supported');
    }

    const fidObserver = new PerformanceObserver((entryList) => {
      entryList.getEntries().forEach((entry) => {
        if (entry.entryType === 'first-input') {
          const fidEntry = entry as PerformanceEventTiming;
          setFidTime(fidEntry.processingStart - fidEntry.startTime);
        }
      });
    });

    try {
      fidObserver.observe({ entryTypes: ['first-input'] });
    } catch (e) {
      logger.warn('FID observer not supported');
    }

    const clsObserver = new PerformanceObserver((entryList) => {
      let totalScore = 0;
      entryList.getEntries().forEach((entry) => {
        if (entry.entryType === 'layout-shift') {
          const clsEntry = entry as unknown as LayoutShift;
          totalScore += clsEntry.value;
        }
      });
      setClsScore(totalScore);
    });

    try {
      clsObserver.observe({ entryTypes: ['layout-shift'], buffered: true });
    } catch (e) {
      logger.warn('CLS observer not supported');
    }

    const ttiCheckTimer = setInterval(() => {
      const navEntries = performance.getEntriesByType('navigation');
      if (navEntries.length > 0) {
        const nav = navEntries[0] as PerformanceNavigationTiming;
        const tti = nav.domContentLoadedEventEnd || nav.loadEventEnd;
        if (tti) {
          setTtiTime(tti);
          clearInterval(ttiCheckTimer);
        }
      }
    }, 100);

    setTimeout(() => {
      clearInterval(ttiCheckTimer);
      if (!ttiTime) {
        setTtiTime(performance.now());
      }
    }, 5000);

    return () => {
      clearTimeout(timer);
      paintObserver.disconnect();
      lcpObserver.disconnect();
      fidObserver.disconnect();
      clsObserver.disconnect();
      clearInterval(ttiCheckTimer);
    };
  }, []);

  const metrics = [
    {
      label: t('performance.performance_test_page.k0'),
      value: t('performance.performance_test_page.k1'),
      color: 'success.600',
      bgColor: 'success.100',
      description: i18n.t('pages.performance_test_page.lighthouse_0'),
    },
    {
      label: t('performance.performance_test_page.k2'),
      value: loadTime ? `${loadTime.toFixed(2)}ms` : i18n.t('pages.performance_test_page.k1'),
      color:
        loadTime && loadTime < 100
          ? `${designTokens.colors.success.dark}`
          : designTokens.colors.warning.dark,
      bgColor: loadTime && loadTime < 100 ? 'colors.success.100' : 'colors.warning.100',
      description: t('performance.performance_test_page.k3'),
    },
    {
      label: t('performance.performance_test_page.k4'),
      value: lcpTime ? `${lcpTime.toFixed(2)}ms` : i18n.t('pages.performance_test_page.k2'),
      color:
        lcpTime && lcpTime < 2500
          ? `${designTokens.colors.success.dark}`
          : lcpTime && lcpTime < 4000
            ? designTokens.colors.warning.dark
            : designTokens.colors.error.dark,
      bgColor:
        lcpTime && lcpTime < 2500
          ? 'colors.success.100'
          : lcpTime && lcpTime < 4000
            ? 'colors.warning.100'
            : 'colors.error.100',
      description: 'Largest Contentful Paint (LCP)',
    },
    {
      label: t('performance.performance_test_page.k5'),
      value: ttiTime ? `${ttiTime.toFixed(2)}ms` : i18n.t('pages.performance_test_page.k3'),
      color:
        ttiTime && ttiTime < 3800
          ? `${designTokens.colors.success.dark}`
          : ttiTime && ttiTime < 7300
            ? designTokens.colors.warning.dark
            : designTokens.colors.error.dark,
      bgColor:
        ttiTime && ttiTime < 3800
          ? 'colors.success.100'
          : ttiTime && ttiTime < 7300
            ? 'colors.warning.100'
            : 'colors.error.100',
      description: 'Time to Interactive (TTI)',
    },
    {
      label: t('performance.performance_test_page.k6'),
      value: fidTime ? `${fidTime.toFixed(2)}ms` : i18n.t('pages.performance_test_page.k4'),
      color:
        fidTime && fidTime < 100
          ? `${designTokens.colors.success.dark}`
          : fidTime && fidTime < 300
            ? designTokens.colors.warning.dark
            : designTokens.colors.error.dark,
      bgColor:
        fidTime && fidTime < 100
          ? 'colors.success.100'
          : fidTime && fidTime < 300
            ? 'colors.warning.100'
            : 'colors.error.100',
      description: 'First Input Delay (FID)',
    },
    {
      label: t('performance.performance_test_page.k7'),
      value: clsScore !== null ? clsScore.toFixed(2) : i18n.t('pages.performance_test_page.k5'),
      color:
        clsScore !== null && clsScore < 0.1
          ? `${designTokens.colors.success.dark}`
          : clsScore !== null && clsScore < 0.25
            ? designTokens.colors.warning.dark
            : designTokens.colors.error.dark,
      bgColor:
        clsScore !== null && clsScore < 0.1
          ? 'colors.success.100'
          : clsScore !== null && clsScore < 0.25
            ? 'colors.warning.100'
            : 'colors.error.100',
      description: 'Cumulative Layout Shift (CLS)',
    },
    {
      label: t('performance.performance_test_page.k8'),
      value: firstPaint ? `${firstPaint.toFixed(2)}ms` : i18n.t('pages.performance_test_page.k6'),
      color:
        firstPaint && firstPaint < 1000
          ? `${designTokens.colors.success.dark}`
          : designTokens.colors.warning.dark,
      bgColor: firstPaint && firstPaint < 1000 ? 'colors.success.100' : 'colors.warning.100',
      description: 'First Paint (FP)',
    },
    {
      label: t('performance.performance_test_page.k9'),
      value: firstContentfulPaint
        ? `${firstContentfulPaint.toFixed(2)}ms`
        : i18n.t('pages.performance_test_page.k7'),
      color:
        firstContentfulPaint && firstContentfulPaint < 1500
          ? `${designTokens.colors.success.dark}`
          : designTokens.colors.warning.dark,
      bgColor:
        firstContentfulPaint && firstContentfulPaint < 1500
          ? 'colors.success.100'
          : 'colors.warning.100',
      description: 'First Contentful Paint (FCP)',
    },
    {
      label: t('performance.performance_test_page.k10'),
      value: navigationTime
        ? `${navigationTime.toFixed(2)}ms`
        : i18n.t('pages.performance_test_page.k8'),
      color:
        navigationTime && navigationTime < 2000
          ? `${designTokens.colors.success.dark}`
          : designTokens.colors.warning.dark,
      bgColor:
        navigationTime && navigationTime < 2000 ? 'colors.success.100' : 'colors.warning.100',
      description: t('performance.performance_test_page.k11'),
    },
    {
      label: t('performance.performance_test_page.k12'),
      value: `${renderCount}${i18n.t('pages.performance_test_page.k9')}`,
      color: 'primary.600',
      bgColor: 'primary.100',
      description: t('performance.performance_test_page.k13'),
    },
    {
      label: t('performance.performance_test_page.k14'),
      value: avgRenderTime ? `${avgRenderTime.toFixed(2)}ms` : 'N/A',
      color:
        avgRenderTime && avgRenderTime < 16
          ? `${designTokens.colors.success.dark}`
          : designTokens.colors.warning.dark,
      bgColor: avgRenderTime && avgRenderTime < 16 ? 'colors.success.100' : 'colors.warning.100',
      description: t('performance.performance_test_page.k15'),
    },
    {
      label: i18n.t('pages.performance_test_page.dom_10'),
      value: domContentLoaded
        ? `${domContentLoaded.toFixed(2)}ms`
        : i18n.t('pages.performance_test_page.k11'),
      color:
        domContentLoaded && domContentLoaded < 1000
          ? `${designTokens.colors.success.dark}`
          : designTokens.colors.warning.dark,
      bgColor:
        domContentLoaded && domContentLoaded < 1000 ? 'colors.success.100' : 'colors.warning.100',
      description: 'DOM Content Loaded',
    },
    {
      label: i18n.t('pages.performance_test_page.cpu_12'),
      value: t('performance.performance_test_page.k16'),
      color: 'success.600',
      bgColor: 'success.100',
      description: t('performance.performance_test_page.cpu_17'),
    },
    {
      label: i18n.t('pages.performance_test_page.dom_13'),
      value: t('performance.performance_test_page.k18'),
      color: 'success.600',
      bgColor: 'success.100',
      description: t('performance.performance_test_page.dom_19'),
    },
    {
      label: t('performance.performance_test_page.k20'),
      value: t('performance.performance_test_page.k21'),
      color: 'success.600',
      bgColor: 'success.100',
      description: t('performance.performance_test_page.k22'),
    },
    {
      label: t('performance.performance_test_page.k23'),
      value: 'React',
      color: 'primary.600',
      bgColor: 'primary.100',
      description: 'React 19 + Vite',
    },
  ];

  return (
    <FormPageTemplate
      title={i18n.t('pages.performance_test_page.topems_0')}
      subtitle={
        i18n.t('pages.performance_test_page.k1') +
        i18n.t('pages.performance_test_page.k2')
      }
      sections={[]}
      onSubmit={async () => {}}
    >
      <div
        style={{
          minHeight: '100vh',
          background: `linear-gradient(135deg, ${designTokens.colors.primary[900]} 0%, ${designTokens.colors.primary.main} 50%, ${designTokens.colors.primary['400']} 100%)`,
          padding: '2rem',
          animation: 'fadeIn 0.5s ease-out',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>

      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: designTokens.spacing['2xl'] }}>
          <div
            style={{
              width: '80px',
              height: '80px',
              background: 'action.disabledBackground',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
              backdropFilter: 'blur(10px)',
            }}
          >
            <svg
              width='40'
              height='40'
              viewBox='0 0 24 24'
              fill='colors.warning.400'
              stroke='colors.warning.400'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'
            >
              {icons.zap}
            </svg>
          </div>
          <h1
            style={{
              color: 'common.white',
              fontWeight: 700,
              fontSize: designTokens.typography.fontSize.scale['2rem'],
              marginBottom: '0.5rem',
            }}
          >
            {i18n.t('pages.performance_test_page.topems_0')}
          </h1>
          <p
            style={{
              color: 'common.white',
              maxWidth: '600px',
              margin: '0 auto',
              fontSize: designTokens.typography.fontSize.scale['1rem'],
            }}
          >
            {i18n.t('pages.performance_test_page.k1')}
            {i18n.t('pages.performance_test_page.k2')}
          </p>
          <span
            style={{
              display: 'inline-block',
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              background: 'action.disabledBackground',
              color: 'common.white',
              borderRadius: '20px',
              fontSize: designTokens.typography.fontSize.scale['0.875rem'],
            }}
            className={!renderComplete ? 'animate-pulse' : ''}
          >
            {renderComplete
              ? t('performance.performance_test_page.k24')
              : i18n.t('pages.performance_test_page.k14')}
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1rem',
          }}
        >
          {metrics.map((metric, index) => (
            <div
              key={index}
              style={{
                background: 'common.white',
                backdropFilter: 'blur(20px)',
                borderRadius: '16px',
                boxShadow: `0 10px 40px ${designTokens.colors.action.selected}`,
                padding: '1.5rem',
                transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                animation: `fadeIn 0.5s ease-out ${index * 0.1}s both`,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
                (e.currentTarget as HTMLElement).style.boxShadow =
                  `0 15px 50px ${designTokens.colors.action.selected}`;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLElement).style.boxShadow =
                  `0 10px 40px ${designTokens.colors.action.selected}`;
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  marginBottom: '0.75rem',
                }}
              >
                <div
                  style={{
                    width: designTokens.spacing['2xl'],
                    height: designTokens.spacing['2xl'],
                    background: metric.bgColor,
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg
                    width='24'
                    height='24'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke={metric.color}
                    strokeWidth='2'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  >
                    {icons[iconKeys[index]]}
                  </svg>
                </div>
                <span
                  style={{
                    fontWeight: 600,
                    fontSize: designTokens.typography.fontSize.scale['0.875rem'],
                    color: 'grey.700',
                  }}
                >
                  {metric.label}
                </span>
              </div>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: designTokens.typography.fontSize.scale['1.5rem'],
                  marginBottom: '0.25rem',
                  color: 'grey.900',
                }}
              >
                {metric.value}
              </div>
              <div
                style={{
                  fontSize: designTokens.typography.fontSize.scale['0.75rem'],
                  color: 'grey.500',
                }}
              >
                {metric.description}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: designTokens.spacing['2xl'], textAlign: 'center' }}>
          <div
            style={{
              background: 'common.white',
              backdropFilter: 'blur(20px)',
              borderRadius: '16px',
              boxShadow: `0 10px 40px ${designTokens.colors.action.selected}`,
              maxWidth: '600px',
              margin: '0 auto',
              padding: '2rem',
              animation: 'fadeIn 0.5s ease-out 0.5s both',
            }}
          >
            <div
              style={{
                fontWeight: 600,
                fontSize: designTokens.typography.fontSize.scale['1.125rem'],
                marginBottom: '1rem',
                color: 'grey.900',
              }}
            >
              {i18n.t('pages.performance_test_page.k3')}
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: designTokens.spacing.md,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: designTokens.typography.fontSize.scale['0.875rem'],
                    color: 'grey.500',
                  }}
                >
                  {t('performance.performance_test_page.k25')}
                </div>
                <div style={{ fontWeight: 500, color: 'grey.900' }}>/performance</div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: designTokens.typography.fontSize.scale['0.875rem'],
                    color: 'grey.500',
                  }}
                >
                  {t('performance.performance_test_page.k26')}
                </div>
                <div style={{ fontWeight: 500, color: 'grey.900' }}>
                  {t('performance.performance_test_page.k27')}
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: designTokens.typography.fontSize.scale['0.875rem'],
                    color: 'grey.500',
                  }}
                >
                  {t('performance.performance_test_page.k28')}
                </div>
                <div style={{ fontWeight: 500, color: 'success.600' }}>
                  {t('performance.performance_test_page.k29')}
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: designTokens.typography.fontSize.scale['0.875rem'],
                    color: 'grey.500',
                  }}
                >
                  {t('performance.performance_test_page.k30')}
                </div>
                <div style={{ fontWeight: 500, color: 'success.600' }}>
                  {t('performance.performance_test_page.k31')}
                </div>
              </div>
            </div>
            <div
              style={{
                marginTop: '1.5rem',
                display: 'flex',
                gap: '0.75rem',
                justifyContent: 'center',
              }}
            >
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: `linear-gradient(135deg, ${designTokens.colors.primary[900]} 0%, ${designTokens.colors.primary.main} 100%)`,
                  color: 'common.white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: designTokens.typography.fontSize.scale['0.875rem'],
                }}
              >
                {i18n.t('pages.performance_test_page.k4')}
              </button>
              <button
                onClick={() => {
                  if (window.performance && window.performance.mark) {
                    window.performance.mark('navigationStart');
                    alert(t('performance.performance_test_page.k32'));
                  }
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'common.white',
                  color: 'primary.500',
                  border: `1px solid ${designTokens.colors.primary.main}`,
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: designTokens.typography.fontSize.scale['0.875rem'],
                }}
              >
                {i18n.t('pages.performance_test_page.k5')}
              </button>
            </div>
          </div>
        </div>

        <div style={{ marginTop: designTokens.spacing['2xl'], textAlign: 'center' }}>
          <div
            style={{
              fontSize: designTokens.typography.fontSize.scale['0.875rem'],
              color: 'common.white',
            }}
          >
            {i18n.t('pages.performance_test_page.k6')}
          </div>
        </div>
      </div>
      </div>
    </FormPageTemplate>
  );
};

export default PerformanceTestPage;
