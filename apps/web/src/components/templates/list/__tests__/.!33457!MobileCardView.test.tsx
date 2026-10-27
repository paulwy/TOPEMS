import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

import { MobileCardView } from '../MobileCardView';
import { renderWithProviders } from '@/__tests__/test-utils';
import type { ColumnDef } from '../types';

interface TestRow {
  id: string;
  name: string;
  status: string;
  count: number;
}

const columns: ColumnDef<TestRow>[] = [
  { id: 'name', label: '名称' },
  { id: 'status', label: '状态' },
  { id: 'count', label: '数量' },
];

const data: TestRow[] = [
  { id: '1', name: '项目一', status: '活跃', count: 10 },
  { id: '2', name: '项目二', status: '停用', count: 5 },
];

describe('MobileCardView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing with data', () => {
    renderWithProviders(
      <MobileCardView
        data={data}
