import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '@/__tests__/test-utils';

import RsProjectCreatePage from '../RsProjectCreatePage';
import type {
  FormPageTemplateProps,
  FormSection,
  FormField,
} from '@/components/templates/FormPageTemplate';

vi.mock('@/api/rd', () => ({
  rdApi: {
    getProject: vi.fn().mockResolvedValue({
      success: true,
      data: { id: 'P001', name: '', team_members: [], tags: [] },
    }),
    createProject: vi.fn().mockResolvedValue({ success: true, data: {} }),
    updateProject: vi.fn().mockResolvedValue({ success: true, data: {} }),
  },
}));

// Page imports FormPageTemplate from subpath '@/components/templates/FormPageTemplate'.
// Override it so page-computed sections/fields are rendered for assertions.
vi.mock('@/components/templates/FormPageTemplate', () => ({
  FormPageTemplate: ({ sections, submitText }: FormPageTemplateProps) => (
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
    </div>
  ),
}));

describe('RsProjectCreatePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders basic/timing/risk sections with fields', () => {
    renderWithProviders(<RsProjectCreatePage />);
    expect(screen.getByTestId('section-basic')).toBeInTheDocument();
    expect(screen.getByText('基本信息')).toBeInTheDocument();
    expect(screen.getByTestId('field-name')).toHaveTextContent('名称');
    expect(screen.getByTestId('field-code')).toHaveTextContent('编码');
    expect(screen.getByTestId('field-project_type')).toBeInTheDocument();
    expect(screen.getByTestId('section-timing')).toBeInTheDocument();
    expect(screen.getByTestId('section-risk')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '创建' })).toBeInTheDocument();
  });
});
