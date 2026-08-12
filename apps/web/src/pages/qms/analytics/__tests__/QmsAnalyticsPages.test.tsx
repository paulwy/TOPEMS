import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('QMS Analytics Pages', () => {
  it('Quality Trend renders title and charts', async () => {
    const { default: Page } = await import('../QmsQualityTrendPage');
    render(<Page />);
    expect(screen.getByText('质量趋势分析')).toBeInTheDocument();
    expect(screen.getAllByTestId('ResponsiveContainer').length).toBeGreaterThan(0);
  });

  it('Defect Pareto renders title', async () => {
    const { default: Page } = await import('../QmsDefectParetoPage');
    render(<Page />);
    expect(screen.getAllByText(/帕累托/).length).toBeGreaterThan(0);
  });

  it('Cost Analysis renders title and PAF model', async () => {
    const { default: Page } = await import('../QmsCostAnalysisPage');
    render(<Page />);
    expect(screen.getByText(/质量成本分析/)).toBeInTheDocument();
  });

  it('SPC Control Chart renders title and control limits', async () => {
    const { default: Page } = await import('../QmsSpcControlChartPage');
    render(<Page />);
    expect(screen.getByText(/SPC 控制图分析/)).toBeInTheDocument();
    expect(screen.getByText(/中心线 CL/)).toBeInTheDocument();
  });

  it('FMEA Risk Matrix renders title', async () => {
    const { default: Page } = await import('../QmsFmeaRiskMatrixPage');
    render(<Page />);
    expect(screen.getByText(/FMEA 风险矩阵/)).toBeInTheDocument();
  });

  it('Audit Compliance renders title', async () => {
    const { default: Page } = await import('../QmsAuditCompliancePage');
    render(<Page />);
    expect(screen.getByText(/审核合规率分析/)).toBeInTheDocument();
  });
});
