import React, { useState } from 'react';
import { IconButton } from '@mui/material';
import { Home, ListTodo, ScanLine, CheckSquare, User, Barcode } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  MobileLayout,
  PullToRefresh,
  MobileSkeleton,
} from '@/components/mobile';
import { useNotificationStore } from '@/store';
import { MOBILE_PATHS } from '@/modules/mobile/config';
import { PageContainer } from '@/components/common';

import { useMobileProduction } from './hooks/useMobileProduction';
import { MobileProductionFilters } from './components/MobileProductionFilters';
import { MobileProductionCard } from './components/MobileProductionCard';
import { MobileProductionReportDialog } from './components/MobileProductionReportDialog';

const MobileProductionPage: React.FC = () => {
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
    { id: 'home', label: '工作台', icon: <Home style={{ width: 22, height: 22 }} /> },
    { id: 'tasks', label: '任务', icon: <ListTodo style={{ width: 22, height: 22 }} /> },
    { id: 'scan', label: '扫码', icon: <ScanLine style={{ width: 22, height: 22 }} /> },
    {
      id: 'approval',
      label: '审批',
      icon: <CheckSquare style={{ width: 22, height: 22 }} />,
      badge: 3,
    },
    { id: 'profile', label: '我的', icon: <User style={{ width: 22, height: 22 }} /> },
  ];

  return (
    <MobileLayout
      title='移动生产'
      showBack
      onBackClick={() => navigate(MOBILE_PATHS.workbench)}
      showNotifications
      notificationCount={5}
      showTabBar
      tabs={bottomTabs}
      activeTab=''
      onTabChange={handleBottomTabChange}
      rightActions={
        <IconButton
          size='large'
          sx={{ minWidth: 44, minHeight: 44 }}
          onClick={() => navigate(MOBILE_PATHS.scanPage)}
          aria-label='扫码'
        >
          <Barcode style={{ width: 20, height: 20 }} />
        </IconButton>
      }
    >
      <PageContainer
        autoTitle={false}
        autoBreadcrumbs={false}
        padding={false}
        maxWidth={false}
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
      </PageContainer>
    </MobileLayout>
  );
};

export default MobileProductionPage;
