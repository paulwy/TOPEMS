import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';

import RsFormulaCreatePage from '../RsFormulaCreatePage';
import type {
  FormPageTemplateProps,
  FormSection,
  FormField,
} from '@/components/templates/FormPageTemplate';

vi.mock('@/api/rd', () => ({
  rdApi: {
    listProjects: vi.fn().mockResolvedValue({
      success: true,
      data: {
        projects: [{ id: 'P001', name: '新型材料研发项目' }],
      },
    }),
  },
  formulaApi: {
    getFormula: vi.fn().mockResolvedValue({ success: true, data: { ingredients: [] } }),
    createFormula: vi.fn().mockResolvedValue({ success: true, data: {} }),
    updateFormula: vi.fn().mockResolvedValue({ success: true, data: {} }),
  },
}));

vi.mock('@/components/templates/FormPageTemplate', () => ({
  FormPageTemplate: ({ sections, submitText, footerContent }: FormPageTemplateProps) => (
    <div>
      {sections?.map((s: FormSection) => (
        <section
          key={s.id}
          data-testid={`section-${s.id}`}
        >
          <h3>{s.title}</h3>
          {s.fields?.map((f: FormField) => (
            <div
              key={f.name}
              data-testid={`field-${f.name}`}
            >
              {f.label}
            </div>
          ))}
        </section>
      ))}
      <button type='submit'>{submitText}</button>
      {footerContent}
    </div>
  ),
}));

describe('RsFormulaCreatePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders basic section, fields, and ingredients footer content', async () => {
    renderWithProviders(<RsFormulaCreatePage />);
    await waitFor(() => {
      expect(screen.getByTestId('section-basic')).toBeInTheDocument();
    });
    expect(screen.getByText('基本信息')).toBeInTheDocument();
    expect(screen.getByTestId('field-name')).toHaveTextContent('配方名称');
    expect(screen.getByTestId('field-code')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '创建配方' })).toBeInTheDocument();
    // footerContent (ingredients table) is rendered
    expect(screen.getByText('组分名称')).toBeInTheDocument();
    expect(screen.getByText('添加组分')).toBeInTheDocument();
  });
});
