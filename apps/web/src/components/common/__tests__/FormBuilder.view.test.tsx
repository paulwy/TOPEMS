import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// 全局 setup-mocks 把 FormBuilder 换成了占位 div（供 smoke 测试用），
// 本文件要验证真实组件，先解除该 mock。
vi.unmock('@/components/common/FormBuilder');

import FormBuilder from '@/components/common/FormBuilder';

// A-11（W4 详情侧）/ A-09 回归：view 模式改为只读排版，提交期间按钮禁用且不接受重复提交
describe('FormBuilder · view 模式与提交锁', () => {
  it('view 模式只读渲染：日期统一 yyyy-MM-dd HH:mm、选择项回显选项名、空值显示 —', () => {
    render(
      <FormBuilder
        mode='view'
        fields={[
          { name: 'created_at', label: '创建时间', type: 'datetime' },
          {
            name: 'status',
            label: '状态',
            type: 'select',
            options: [{ value: 'active', label: '启用' }],
          },
          { name: 'remark', label: '备注', type: 'text' },
        ]}
        initialValues={{
          created_at: '2026-11-26T03:57:24.138367',
          status: 'active',
        }}
        onSubmit={() => {}}
      />
    );

    expect(screen.getByText('创建时间')).toBeInTheDocument();
    // 微秒被裁掉、不再原样输出 ISO 串，也不再拆成三行的美式日期
    expect(screen.getByText('2026-11-26 03:57')).toBeInTheDocument();
    // 字典/下拉字段展示选项名，而不是“请选择”
    expect(screen.getByText('启用')).toBeInTheDocument();
    // 空值统一 —，不展示 undefined/null
    expect(screen.getByText('—')).toBeInTheDocument();
    // view 模式不出现提交按钮
    expect(screen.queryByTestId('form-submit-btn')).not.toBeInTheDocument();
  });

  it('提交期间按钮禁用，重复点击只触发一次 onSubmit', async () => {
    let release: (() => void) | undefined;
    const onSubmit = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        })
    );

    render(
      <FormBuilder
        fields={[{ name: 'name', label: '名称', type: 'text', required: true }]}
        initialValues={{ name: 'A' }}
        onSubmit={onSubmit}
      />
    );

    const submitBtn = screen.getByTestId('form-submit-btn');
    fireEvent.click(submitBtn);
    fireEvent.click(submitBtn);

    await waitFor(() => expect(submitBtn).toBeDisabled());
    expect(onSubmit).toHaveBeenCalledTimes(1);

    release?.();
    await waitFor(() => expect(submitBtn).not.toBeDisabled());
  });

  it('必填项为空时拦截提交并给出字段级提示', () => {
    const onSubmit = vi.fn();
    render(
      <FormBuilder
        fields={[{ name: 'name', label: '客户名称', type: 'text', required: true }]}
        onSubmit={onSubmit}
      />
    );

    fireEvent.click(screen.getByTestId('form-submit-btn'));

    expect(onSubmit).not.toHaveBeenCalled();
    // 标签一次 + 字段级错误文案一次（错误文案以字段名开头）
    expect(screen.getAllByText(/客户名称/).length).toBeGreaterThanOrEqual(2);
  });
});
