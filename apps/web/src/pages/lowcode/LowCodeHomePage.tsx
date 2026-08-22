import React, { useEffect, useState, useMemo } from 'react';
import { Alert } from '@mui/material';
import { Database, FileText, Globe, Share2, LayoutGrid } from 'lucide-react';
import { lowcodeApi } from '@/api/lowcode';
import type { LowcodeDashboardStats } from '@/api/lowcode';
import { StatsPageTemplate } from '@/components/templates/StatsPageTemplate';
import type { StatCard } from '@/components/templates/StatsPageTemplate';
import { useTranslation } from 'react-i18next';

export const LowCodeHomePage: React.FC = () => {
  const { t } = useTranslation('lowcode');
  const [stats, setStats] = useState<LowcodeDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await lowcodeApi.getDashboardStats();
        if (!cancelled && res.data) {
          setStats(res.data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t('lowcode.low_code_home_page.k0'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [t]);

  const statCards: StatCard[] = useMemo(
    () => [
      {
        id: 'total_apps',
        title: t('lowcode.low_code_home_page.k3'),
        value: stats?.total_apps ?? 0,
        icon: <LayoutGrid size={22} />,
        color: 'primary',
      },
      {
        id: 'published_apps',
        title: t('lowcode.low_code_home_page.k4'),
        value: stats?.published_apps ?? 0,
        icon: <LayoutGrid size={22} />,
        color: 'success',
      },
      {
        id: 'total_data_models',
        title: t('lowcode.low_code_home_page.k5'),
        value: stats?.total_data_models ?? 0,
        icon: <Database size={22} />,
        color: 'info',
      },
      {
        id: 'total_data_sources',
        title: t('lowcode.low_code_home_page.k6'),
        value: stats?.total_data_sources ?? 0,
        icon: <Database size={22} />,
        color: 'warning',
      },
      {
        id: 'total_forms',
        title: t('lowcode.low_code_home_page.k7'),
        value: stats?.total_forms ?? 0,
        icon: <FileText size={22} />,
        color: 'secondary',
      },
      {
        id: 'total_pages',
        title: t('lowcode.low_code_home_page.k8'),
        value: stats?.total_pages ?? 0,
        icon: <Globe size={22} />,
        color: 'primary',
      },
      {
        id: 'total_workflows',
        title: t('lowcode.low_code_home_page.k9'),
        value: stats?.total_workflows ?? 0,
        icon: <Share2 size={22} />,
        color: 'info',
      },
      {
        id: 'recent_active_apps',
        title: t('lowcode.low_code_home_page.7_10'),
        value: stats?.recent_active_apps ?? 0,
        icon: <LayoutGrid size={22} />,
        color: 'success',
      },
    ],
    [stats, t]
  );

  return (
    <StatsPageTemplate
      title={t('lowcode.low_code_home_page.k2')}
      subtitle={t('lowcode.low_code_home_page.e1')}
      statCards={statCards}
      showStatCards={statCards.length > 0}
      loading={loading}
      showSearch={false}
      showTimeRange={false}
      showExport={false}
      showRefresh={false}
      showCharts={false}
      showTables={false}
    >
      {error && (
        <Alert
          severity='warning'
          sx={{ mb: 2 }}
        >
          {t('lowcode.low_code_home_page.l1', { v1: error })}
        </Alert>
      )}
    </StatsPageTemplate>
  );
};

export default LowCodeHomePage;
