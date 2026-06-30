import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  ShoppingCart,
  Clock,
  Calculator,
  Award,
  Truck,
  ArrowRight,
  Star,
  FileCheck,
  PackageSearch,
} from 'lucide-react';
import { DashboardTemplate } from '@/components/templates';
import type { StatCard, ChartCard, QuickAction, RecentItem } from '@/components/templates';
import { PageContainer } from '@/components/common';
import BarChartComponent from '../../components/charts/BarChart';
import LineChartComponent from '../../components/charts/LineChart';
import PieChartComponent from '../../components/charts/PieChart';

const ScmOverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const stats: StatCard[] = useMemo(
    () => [
      {
        id: 'supplier-total',
        title: '供应商总数',
        value: '128',
        icon: <Users size={24} />,
        change: 8,
        changeLabel: '较上月',
        color: 'primary',
      },
      {
        id: 'purchase-orders',
        title: '采购订单',
        value: '56',
        icon: <ShoppingCart size={24} />,
        change: 12,
        changeLabel: '较上月',
        color: 'info',
      },
      {
        id: 'pending-approval',
        title: '待审批',
        value: '13',
        icon: <Clock size={24} />,
        change: 5,
        changeLabel: '待处理',
        color: 'warning',
      },
      {
        id: 'mrp-plans',
        title: 'MRP计划',
        value: '8',
        icon: <Calculator size={24} />,
        change: 3,
        changeLabel: '进行中',
        color: 'success',
      },
      {
        id: 'supplier-rating',
        title: '供应商评估',
        value: '92.5',
        icon: <Award size={24} />,
        change: 1.2,
        changeLabel: '平均评分',
        color: 'primary',
      },
    ],
    []
  );

  const orderTrendData = [
    { name: '1月', value: 32 },
    { name: '2月', value: 28 },
    { name: '3月', value: 45 },
    { name: '4月', value: 38 },
    { name: '5月', value: 52 },
    { name: '6月', value: 56 },
  ];

  const supplierRatingData = [
    { name: '优秀(A)', value: 45 },
    { name: '良好(B)', value: 35 },
    { name: '合格(C)', value: 15 },
    { name: '不合格(D)', value: 5 },
  ];

  const mrpStatusData = [
    { name: '第1周', value: 5 },
    { name: '第2周', value: 8 },
    { name: '第3周', value: 6 },
    { name: '第4周', value: 10 },
    { name: '第5周', value: 7 },
    { name: '第6周', value: 12 },
  ];

  const charts: ChartCard[] = useMemo(
    () => [
      {
        id: 'order-trend',
        title: '采购订单趋势',
        chart: (
          <BarChartComponent
            data={orderTrendData}
            xKey='name'
            yKey='value'
          />
        ),
        height: 300,
      },
      {
        id: 'supplier-rating',
        title: '供应商评级分布',
        chart: <PieChartComponent data={supplierRatingData} />,
        height: 300,
      },
      {
        id: 'mrp-suggestion',
        title: 'MRP建议状态',
        chart: (
          <LineChartComponent
            data={mrpStatusData}
            xKey='name'
            yKey='value'
          />
        ),
        height: 300,
      },
    ],
    []
  );

  const quickActions: QuickAction[] = useMemo(
    () => [
      {
        id: 'supplier-manage',
        label: '供应商管理',
        icon: <Users size={20} />,
        onClick: () => navigate('/scm/suppliers'),
        color: '#1976d2',
      },
      {
        id: 'purchase-order',
        label: '采购订单',
        icon: <ShoppingCart size={20} />,
        onClick: () => navigate('/scm/orders'),
        color: '#7b1fa2',
      },
      {
        id: 'mrp-plan',
        label: 'MRP计划',
        icon: <Calculator size={20} />,
        onClick: () => navigate('/scm/mrp'),
        color: '#388e3c',
      },
      {
        id: 'supplier-eval',
        label: '供应商评估',
        icon: <Award size={20} />,
        onClick: () => navigate('/scm/evaluation'),
        color: '#f57c00',
      },
      {
        id: 'delivery-appointment',
        label: '送货预约',
        icon: <Truck size={20} />,
        onClick: () => navigate('/scm/delivery'),
        color: '#00796b',
      },
    ],
    [navigate]
  );

  const recentItems: RecentItem[] = useMemo(
    () => [
      {
        id: 'po1',
        title: 'PO-2026-0098',
        description: '向供应商A采购原材料',
        time: '2026-06-29 09:00',
        icon: <ShoppingCart size={18} />,
        status: 'warning',
        tags: [{ label: '待审批', color: '#f57c00' }],
        onClick: () => navigate('/scm/orders/po1'),
      },
      {
        id: 'sup1',
        title: '供应商B年度评审',
        description: '综合评分: A (95分)',
        time: '2026-06-28 16:30',
        icon: <Star size={18} />,
        status: 'success',
        onClick: () => navigate('/scm/evaluation/sup1'),
      },
      {
        id: 'mrp1',
        title: 'MRP-2026-0012',
        description: '7月生产物料需求计划',
        time: '2026-06-28 14:00',
        icon: <Calculator size={18} />,
        status: 'info',
        tags: [{ label: '已生成', color: '#1976d2' }],
        onClick: () => navigate('/scm/mrp/mrp1'),
      },
      {
        id: 'po2',
        title: 'PO-2026-0097',
        description: '设备配件采购',
        time: '2026-06-28 11:20',
        icon: <ShoppingCart size={18} />,
        status: 'success',
        tags: [{ label: '已入库', color: '#388e3c' }],
        onClick: () => navigate('/scm/orders/po2'),
      },
      {
        id: 'del1',
        title: '送货单 DL-2026-0035',
        description: '供应商C - 预计6月30日到货',
        time: '2026-06-27 10:00',
        icon: <Truck size={18} />,
        status: 'default',
        tags: [{ label: '运输中', color: '#757575' }],
        onClick: () => navigate('/scm/delivery/del1'),
      },
    ],
    [navigate]
  );

  return (
    <PageContainer
      title='供应链管理'
      padding={false}
      maxWidth={false}
    >
      <DashboardTemplate
        title=''
        subtitle=''
        breadcrumbs={[{ label: '首页', href: '/dashboard' }, { label: '供应链' }]}
        stats={stats}
        charts={charts}
        recentItems={recentItems}
        recentTitle='最近动态'
        quickActions={quickActions}
        quickActionsTitle='快捷操作'
        loading={loading}
      />
    </PageContainer>
  );
};

export default ScmOverviewPage;
