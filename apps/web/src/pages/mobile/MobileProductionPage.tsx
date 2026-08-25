import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { mobileApi } from '@/api/mobile';
import { IconButton } from '@mui/material';
import { Home, ListTodo, ScanLine, CheckSquare, User, Barcode } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BottomTabBar, PullToRefresh, MobileSkeleton } from '@/components/mobile';
import { useNotificationStore } from '@/store';
import { MOBILE_PATHS } from '@/modules/mobile/config';
import { MobilePageTemplate } from '@/components/templates';
import { useMobileProduction } from './hooks/useMobileProduction';
import { MobileProductionFilters } from './components/MobileProductionFilters';
import { MobileProductionCard } from './components/MobileProductionCard';
import { MobileProductionReportDialog } from './components/MobileProductionReportDialog';
import i18n from '@/i18n';

const MobileProductionPage: React.FC = () => {
  const { data: backendData } = useQuery({
    queryKey: ['mobile-production-page'],
    queryFn: async () => {
      try {
        return (await mobileApi.production.listOrders()) ?? {};
      } catch (e) {
        return {};
      }
    },
  });
  const navigate = useNavigate();
  const { addNotification } = useNotificationStore();
  const [activeTab, setActiveTab] = useState(0);
  const {
    searchQuery,
    setSearchQuery,
    reportDialogOpen,
    setReportDialogOpen,
    selectedOrder,
    reportForm,
    setReportForm,
    productionOrders,
    workReports,
    equipmentList,
    loading,
    handleRefresh,
    handleStartReport,
    handleSubmitReport,
    handleOrderAction,
  } = useMobileProduction();
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };
  const filteredOrders = productionOrders.filter(
    (order) =>
      !searchQuery ||
      order.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.orderNo.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const handleBottomTabChange = (tabId: string) => {
    switch (tabId) {
      case 'home':
        navigate(MOBILE_PATHS.workbench);
        break;
      case 'tasks':
        navigate(MOBILE_PATHS.tasks);
        break;
      case 'scan':
        navigate(MOBILE_PATHS.scanPage);
        break;
      case 'approval':
        navigate(MOBILE_PATHS.approvals);
        break;
      case 'profile':
        navigate(MOBILE_PATHS.settings);
        break;
    }
  };
  const bottomTabs = [
    {
      id: 'home',
      label: i18n.t('mobile.mobile_production_page.k0'),
      icon: <Home style={{ width: 22, height: 22 }} />,
    },
    {
      id: 'tasks',
      label: i18n.t('mobile.mobile_production_page.k1'),
      icon: <ListTodo style={{ width: 22, height: 22 }} />,
    },
    {
      id: 'scan',
      label: i18n.t('mobile.mobile_production_page.k2'),
      icon: <ScanLine style={{ width: 22, height: 22 }} />,
    },
    {
      id: 'approval',
      label: i18n.t('mobile.mobile_production_page.k3'),
      icon: <CheckSquare style={{ width: 22, height: 22 }} />,
      badge: 3,
    },
    {
      id: 'profile',
      label: i18n.t('mobile.mobile_production_page.k4'),
      icon: <User style={{ width: 22, height: 22 }} />,
    },
  ];
  return (
    <MobilePageTemplate
      title={i18n.t('mobile.mobile_production_page.k5')}
      bottomNav={
        <BottomTabBar
          tabs={bottomTabs}
          activeTab=''
          onChange={handleBottomTabChange}
        />
      }
      actions={[
        <IconButton
          size='large'
          sx={{ minWidth: 44, minHeight: 44 }}
          onClick={() => navigate(MOBILE_PATHS.scanPage)}
          aria-label={i18n.t('mobile.mobile_production_page.k6')}
        >
          <Barcode style={{ width: 20, height: 20 }} />
        </IconButton>,
      ]}
      headerProps={{
        showBack: true,
        onBackClick: () => navigate(MOBILE_PATHS.workbench),
        showNotifications: true,
        notificationCount: 5,
      }}
    >
      <MobileProductionFilters
        activeTab={activeTab}
        onTabChange={handleTabChange}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
      <PullToRefresh onRefresh={handleRefresh}>
        {loading ? (
          <MobileSkeleton
            type='list'
            count={6}
          />
        ) : (
          <MobileProductionCard
            activeTab={activeTab}
            filteredOrders={filteredOrders}
            workReports={workReports}
            equipmentList={equipmentList}
            onOrderAction={handleOrderAction}
            onStartReport={handleStartReport}
          />
        )}
      </PullToRefresh>
      <MobileProductionReportDialog
        open={reportDialogOpen}
        onClose={() => setReportDialogOpen(false)}
        selectedOrder={selectedOrder}
        reportForm={reportForm}
        onReportFormChange={setReportForm}
        onSubmit={handleSubmitReport}
      />
    </MobilePageTemplate>
  );
};
export default MobileProductionPage;
