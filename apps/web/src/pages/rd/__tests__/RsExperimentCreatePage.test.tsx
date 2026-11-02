import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';

import RsExperimentCreatePage from '../RsExperimentCreatePage';

vi.mock('@/api/rd', () => ({
  rdApi: {
    listProjects: vi.fn().mockResolvedValue({
      success: true,
      data: {
        projects: [
          { id: 'P001', name: '新型材料研发项目', code: 'RD-001' },
        ],
      },
    }),
    getExperiment: vi.fn().mockResolvedValue({ success: true, data: {} }),
    createExperiment: vi.fn().mockResolvedValue({ success: true, data: {} }),
    updateExperiment: vi.fn().mockResolvedValue({ success: true, data: {} }),
  },
  formulaApi: {
    listFormulas: vi.fn().mockResolvedValue({
      success: true,
      data: {
        items: [{ id: 'F001', name: '基础配方A', version: 'v1.0' }],
      },
    }),
  },
}));

vi.mock('@/components/templates/FormPageTemplate', () => ({
  FormPageTemplate: ({ sections, submitText }: any) => (
    <div>
      {sections?.map((s: any) => (
        <section key={s.id} data-testid={`section-${s.id}`}>
          <h3>{s.title}</h3>
          {s.fields?.map((f: any) => (
            <div key={f.name} data-testid={`field-${f.name}`}>
              {f.label}
            </div>
          ))}
        </section>
      ))}
      <button type='submit'>{submitText}</button>
    </div>
  ),
}));

describe('RsExperimentCreatePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders basic/content/execution sections and fields', async () => {
    renderWithProviders(<RsExperimentCreatePage />);
    await waitFor(() => {
      expect(screen.getByTestId('section-basic')).toBeInTheDocument();
    });
    expect(screen.getByText('基本信息')).toBeInTheDocument();
    expect(screen.getByTestId('field-name')).toHaveTextContent('试验名称');
    expect(screen.getByTestId('section-content')).toBeInTheDocument();
    expect(screen.getByTestId('section-execution')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '创建试验' })).toBeInTheDocument();
  });
});
