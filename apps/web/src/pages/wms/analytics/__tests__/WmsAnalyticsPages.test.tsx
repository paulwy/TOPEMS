import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import WmsInventoryTurnoverPage from '@/pages/wms/analytics/WmsInventoryTurnoverPage';
import WmsAgeParetoPage from '@/pages/wms/analytics/WmsAgeParetoPage';
import WmsFlowTrendPage from '@/pages/wms/analytics/WmsFlowTrendPage';
import WmsAbcAnalysisPage from '@/pages/wms/analytics/WmsAbcAnalysisPage';
import WmsLocationUtilizationPage from '@/pages/wms/analytics/WmsLocationUtilizationPage';
import WmsOrderFulfillmentPage from '@/pages/wms/analytics/WmsOrderFulfillmentPage';

describe('WMS BI Analytics Pages', () => {
  it('WmsInventoryTurnoverPage renders title without crashing', () => {
    render(<WmsInventoryTurnoverPage />);
    expect(screen.getByText('库存周转率分析')).toBeInTheDocument();
  });

  it('WmsAgeParetoPage renders title without crashing', () => {
    render(<WmsAgeParetoPage />);
    expect(screen.getByText(/库龄帕累托分析/)).toBeInTheDocument();
  });

  it('WmsFlowTrendPage renders title without crashing', () => {
    render(<WmsFlowTrendPage />);
    expect(screen.getByText(/出入库流量趋势/)).toBeInTheDocument();
  });

  it('WmsAbcAnalysisPage renders title without crashing', () => {
    render(<WmsAbcAnalysisPage />);
    expect(screen.getByText(/ABC 分类分析/)).toBeInTheDocument();
  });

  it('WmsLocationUtilizationPage renders title without crashing', () => {
    render(<WmsLocationUtilizationPage />);
    expect(screen.getByText('库位利用率分析')).toBeInTheDocument();
  });

  it('WmsOrderFulfillmentPage renders title without crashing', () => {
    render(<WmsOrderFulfillmentPage />);
    expect(screen.getByText(/订单履约与 SLA 分析/)).toBeInTheDocument();
  });
});
