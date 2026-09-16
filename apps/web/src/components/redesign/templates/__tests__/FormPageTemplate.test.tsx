import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { FormPageTemplate } from '../FormPageTemplate';

describe('FormPageTemplate', () => {
  it('renders with header and children', () => {
    render(
      <FormPageTemplate header={{ title: '新建客户' }}>
        <div>表单内容</div>
      </FormPageTemplate>
    );

    expect(screen.getByText('新建客户')).toBeInTheDocument();
    expect(screen.getByText('表单内容')).toBeInTheDocument();
  });

  it('renders with submit and cancel buttons', () => {
    render(
      <FormPageTemplate
        header={{ title: '新建客户' }}
        onSubmit={() => {}}
        onCancel={() => {}}
      >
        <div>表单内容</div>
      </FormPageTemplate>
    );

    expect(screen.getByText('保存')).toBeInTheDocument();
    expect(screen.getByText('取消')).toBeInTheDocument();
  });

  it('renders with custom labels', () => {
    render(
      <FormPageTemplate
        header={{ title: '新建客户' }}
        onSubmit={() => {}}
        onCancel={() => {}}
        submitLabel='提交'
        cancelLabel='返回'
      >
        <div>表单内容</div>
      </FormPageTemplate>
    );

    expect(screen.getByText('提交')).toBeInTheDocument();
    expect(screen.getByText('返回')).toBeInTheDocument();
  });
});
