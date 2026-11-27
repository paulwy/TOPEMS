import { describe, it, expect } from 'vitest';
import { createElement, Fragment } from 'react';
import { hasRenderableTabContent } from '../crudTabContent';
import type { CrudTab } from '../CrudPage';

const tab = (content: CrudTab['content']): CrudTab => ({ id: 't', label: 't', content });

/**
 * A-02/A-03 回归防护：
 * 「Tab 自带可渲染内容」是主列表是否让位的唯一判据。
 * 空占位（null / 空 Fragment `<></>`）不能把主列表挤掉，首个 Tab 亦然。
 */
describe('hasRenderableTabContent（首个 Tab 有 content 就不渲染主列表）', () => {
  it('未传 content 的 Tab 由主列表渲染', () => {
    expect(hasRenderableTabContent({ id: 'list', label: '列表' })).toBe(false);
  });

  it('null / undefined / false / 空串 视为未提供内容（历史占位写法兼容）', () => {
    expect(hasRenderableTabContent(tab(null))).toBe(false);
    expect(hasRenderableTabContent(tab(undefined))).toBe(false);
    expect(hasRenderableTabContent(tab(false))).toBe(false);
    expect(hasRenderableTabContent(tab(''))).toBe(false);
  });

  it('空数组与空 Fragment `<></>` 是占位，不算内容', () => {
    expect(hasRenderableTabContent(tab([]))).toBe(false);
    expect(hasRenderableTabContent(tab(createElement(Fragment)))).toBe(false);
  });

  it('真正的元素 / 文本 / 非空 Fragment 接管该 Tab', () => {
    expect(hasRenderableTabContent(tab(createElement('div', null, 'x')))).toBe(true);
    expect(hasRenderableTabContent(tab('表头说明'))).toBe(true);
    expect(hasRenderableTabContent(tab(createElement(Fragment, null, createElement('div'))))).toBe(
      true
    );
  });

  it('渲染函数形式 `(active) => ReactNode` 视为自带内容', () => {
    expect(hasRenderableTabContent(tab((active: boolean) => (active ? 'A' : 'B')))).toBe(true);
  });

  it('tab 为 undefined（defaultTab 指向不存在的 Tab）时回落到主列表', () => {
    expect(hasRenderableTabContent(undefined)).toBe(false);
  });
});
