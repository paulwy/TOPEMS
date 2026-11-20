/**
 * toColumnDef — renderCell 签名一致性测试
 *
 * 验证 SchemaField.renderCell 统一使用 (row, index) 签名（fnLength >= 2），
 * 或 (value) 单参数签名（fnLength === 1），或 (row) 零参数签名（fnLength === 0）。
 * 确保 toColumnDef 正确传递参数，防止因签名不一致导致的渲染错误。
 */
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { toColumnDef, getColumns } from '../types';
import type { SchemaField, EntitySchema } from '../types';

describe('toColumnDef - renderCell 签名一致性', () => {
  const baseField: SchemaField = {
    name: 'status',
    label: '状态',
    type: 'text',
  };

  it('renderCell 接收 (row, index) 两个参数（fnLength >= 2）', () => {
    const mockFn = vi.fn((_row: Record<string, unknown>, _index: number) => 'rendered');
    const field: SchemaField = {
      ...baseField,
      renderCell: mockFn,
    };

    const col = toColumnDef(field);
    expect(col).not.toBeNull();
    expect(col!.render).toBeDefined();

    const row = { status: 'active', name: '测试' };
    col!.render!(row, 3);

    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith(row, 3);
  });

  it('renderCell 第一个参数是完整的 row 对象（fnLength >= 2）', () => {
    let capturedRow: Record<string, unknown> | undefined;
    const field: SchemaField = {
      ...baseField,
      renderCell: (row: Record<string, unknown>, _index: number) => {
        capturedRow = row;
        return String(row.name);
      },
    };

    const col = toColumnDef(field);
    const row = { status: 'active', name: '测试', id: '123' };
    col!.render!(row, 0);

    expect(capturedRow).toBe(row);
    expect(capturedRow!.id).toBe('123');
    expect(capturedRow!.name).toBe('测试');
  });

  it('renderCell 第二个参数是 index（行索引，fnLength >= 2）', () => {
    let capturedIndex: number | undefined;
    const field: SchemaField = {
      ...baseField,
      renderCell: (_row: Record<string, unknown>, index: number) => {
        capturedIndex = index;
        return String(index);
      },
    };

    const col = toColumnDef(field);
    col!.render!({ status: 'x' }, 7);

    expect(capturedIndex).toBe(7);
  });

  it('仅接收 value 单参数的 renderCell 也能正常工作（fnLength === 1）', () => {
    const field: SchemaField = {
      ...baseField,
      name: 'amount',
      renderCell: (value) => `¥${value}`,
    };

    const col = toColumnDef(field);
    const result = col!.render!({ amount: 100 }, 0);

    expect(result).toBe('¥100');
  });

  it('接收 (row, index) 两参数的 renderCell 正常工作', () => {
    const field: SchemaField = {
      ...baseField,
      name: 'display',
      renderCell: (row: Record<string, unknown>, _index: number) => `${row.name}: ${row.display}`,
    };

    const col = toColumnDef(field);
    const result = col!.render!({ name: '项目A', display: '进行中' }, 0);

    expect(result).toBe('项目A: 进行中');
  });

  it('renderCell 返回 React 元素时正常工作', () => {
    const field: SchemaField = {
      ...baseField,
      renderCell: (value) =>
        React.createElement('span', { 'data-testid': 'status' }, String(value)),
    };

    const col = toColumnDef(field);
    const result = col!.render!({ status: 'active' }, 0);

    expect(React.isValidElement(result)).toBe(true);
  });

  it('没有 renderCell 时列定义仍有效', () => {
    const field: SchemaField = { ...baseField };
    const col = toColumnDef(field);

    expect(col).not.toBeNull();
    expect(col!.id).toBe('status');
    expect(col!.label).toBe('状态');
    expect(col!.render).toBeUndefined();
  });

  it('showInList 为 false 时返回 null', () => {
    const field: SchemaField = {
      ...baseField,
      showInList: false,
      renderCell: (value) => String(value),
    };
    const col = toColumnDef(field);

    expect(col).toBeNull();
  });
});

describe('getColumns - renderCell 在列数组中的一致性', () => {
  const schema: EntitySchema = {
    entity: 'test',
    title: '测试',
    api: { module: 'test', resource: 'tests' },
    fields: [
      { name: 'id', label: 'ID', type: 'text' },
      {
        name: 'status',
        label: '状态',
        type: 'text',
        renderCell: (row: Record<string, unknown>, index: number) =>
          `[${index}] ${row.name}: ${row.status}`,
      },
      { name: 'name', label: '名称', type: 'text' },
    ],
    list: {
      columns: ['id', 'status', 'name'],
    },
  };

  it('getColumns 生成的列中 renderCell 参数正确', () => {
    const columns = getColumns(schema);
    expect(columns).toHaveLength(3);

    const statusCol = columns.find((c) => c.id === 'status');
    expect(statusCol).toBeDefined();
    expect(statusCol!.render).toBeDefined();

    const row = { id: '1', name: '测试项', status: 'active' };
    const result = statusCol!.render!(row, 5);

    expect(result).toBe('[5] 测试项: active');
  });

  it('所有列都有正确的 id 和 label', () => {
    const columns = getColumns(schema);
    const ids = columns.map((c) => c.id);
    const labels = columns.map((c) => c.label);

    expect(ids).toEqual(['id', 'status', 'name']);
    expect(labels).toEqual(['ID', '状态', '名称']);
  });
});

describe('SchemaField.renderCell 类型约束', () => {
  it('类型系统接受 (row, index) 两参数签名', () => {
    const field: SchemaField = {
      name: 'test',
      label: '测试',
      type: 'text',
      renderCell: (_row: Record<string, unknown>, _index: number) => '',
    };
    expect(field.renderCell).toBeDefined();
  });

  it('类型系统接受 (value) 单参数签名', () => {
    const field: SchemaField = {
      name: 'test',
      label: '测试',
      type: 'text',
      renderCell: (_value: unknown) => '',
    };
    expect(field.renderCell).toBeDefined();
  });

  it('类型系统接受 (row) 零参数签名', () => {
    const field: SchemaField = {
      name: 'test',
      label: '测试',
      type: 'text',
      renderCell: () => '',
    };
    expect(field.renderCell).toBeDefined();
  });
});
