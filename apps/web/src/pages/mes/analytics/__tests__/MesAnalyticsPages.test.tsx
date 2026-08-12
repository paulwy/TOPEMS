import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('MES Analytics Pages', () => {
  it('OEE Dashboard renders title and charts', async () => {
    const { default: Page } = await import('../MesOeeDashboardPage');
    render(<Page />);
    expect(screen.getByText('OEE 综合仪表盘')).toBeInTheDocument();
    expect(screen.getAllByTestId('ResponsiveContainer').length).toBeGreaterThan(0);
  });

  it('Delivery Analytics renders title', async () => {
    const { default: Page } = await import('../MesDeliveryAnalyticsPage');
    render(<Page />);
    expect(screen.getAllByText(/准时交付/).length).toBeGreaterThan(0);
  });

  it('Quality Pareto renders title', async () => {
    const { default: Page } = await import('../MesQualityParetoPage');
    render(<Page />);
    expect(screen.getAllByText(/Pareto/).length).toBeGreaterThan(0);
  });

  it('MTBF renders title', async () => {
    const { default: Page } = await import('../MesEquipmentMtbfPage');
    render(<Page />);
    expect(screen.getAllByText(/MTBF/).length).toBeGreaterThan(0);
  });

  it('Energy Cost renders title', async () => {
    const { default: Page } = await import('../MesEnergyCostPage');
    render(<Page />);
    expect(screen.getAllByText(/能耗/).length).toBeGreaterThan(0);
  });

  it('Capacity Utilization renders title', async () => {
    const { default: Page } = await import('../MesCapacityUtilizationPage');
    render(<Page />);
    expect(screen.getAllByText(/产能/).length).toBeGreaterThan(0);
  });
});
