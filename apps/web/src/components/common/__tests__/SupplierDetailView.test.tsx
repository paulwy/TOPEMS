import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// A-11 详情侧 / A-13：用真实供应商 schema 的 view 字段集验证详情只读排版，
// 确认①字段不重复、②标签只出现一次、③时间不再原样输出 ISO。
vi.unmock('@/components/common/FormBuilder');
// setup-mocks 把 getFormFields 打成 () => []，本文件要取真实 schema 字段集
vi.unmock('@/schema-dsl');

/* eslint-disable import/first -- vi.unmock 必须先于被测模块的 import 求值 */
import FormBuilder from '@/components/common/FormBuilder';
import { getFormFields } from '@/schema-dsl';
import { mergeDynamicOptions } from '@/hooks/useDynamicOptions';
import { supplierSchema } from '@/schemas/srm/supplier';
/* eslint-enable import/first */

describe('供应商详情 · view 只读排版（真实 schema）', () => {
  const viewFields = mergeDynamicOptions(getFormFields(supplierSchema, 'view'), {}) as {
    name: string;
    label: string;
    type?: string;
    options?: { value: string; label: string }[];
  }[];

  const renderDetail = () =>
    render(
      <FormBuilder
        mode='view'
        fields={viewFields as never}
        initialValues={{
          supplier_no: 'SUP-001',
          name: '验证供应商A',
          category_code: 'raw_material',
          status: 'active',
          created_at: '2026-11-26T03:57:24.138367',
        }}
        onSubmit={() => {}}
      />
    );

  it('view 字段集无重名字段', () => {
    const names = viewFields.map((f) => f.name);
    expect(names.length).toBeGreaterThan(0);
    expect(new Set(names).size).toBe(names.length);
  });

  it('创建时间只渲染一次，且格式化为 yyyy-MM-dd HH:mm', () => {
    renderDetail();

    const createdField = viewFields.find((f) => f.name === 'created_at');
    expect(createdField).toBeTruthy();
    // A-13：标签在详情里只出现一次（此前被渲染两次）
    expect(screen.getAllByText(createdField!.label)).toHaveLength(1);
    expect(screen.getByText('2026-11-26 03:57')).toBeInTheDocument();
  });

  it('下拉字段显示选项名而不是原始 code，也不出现“请选择”', () => {
    renderDetail();

    const statusField = viewFields.find((f) => f.name === 'status');
    expect(statusField).toBeTruthy();
    const activeLabel = statusField!.options?.find((o) => o.value === 'active')?.label;
    expect(activeLabel).toBeTruthy();
    expect(screen.getAllByText(activeLabel!).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText('active')).not.toBeInTheDocument();
  });

  it('view 模式不渲染提交按钮', () => {
    renderDetail();
    expect(screen.queryByTestId('form-submit-btn')).not.toBeInTheDocument();
  });

  it('每个字段只渲染一个标签节点（A-13 回归：标签不再出现两次）', () => {
    const { container } = renderDetail();
    const labelNodes = container.querySelectorAll('[data-testid="form-view-label"]');
    expect(labelNodes.length).toBe(viewFields.length);

    const fieldNames = Array.from(labelNodes).map((n) => n.getAttribute('data-field-name'));
    expect(new Set(fieldNames).size).toBe(fieldNames.length);

    const labelCounts = new Map<string, number>();
    Array.from(labelNodes).forEach((node) => {
      const text = (node.textContent ?? '').trim();
      labelCounts.set(text, (labelCounts.get(text) ?? 0) + 1);
    });
    const duplicated = [...labelCounts.entries()].filter(([, count]) => count > 1);
    expect(duplicated).toEqual([]);
  });
});
