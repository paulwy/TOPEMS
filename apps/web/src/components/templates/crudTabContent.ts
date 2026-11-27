import React from 'react';
import type { CrudTab } from './CrudPage';

/** 只需 content 字段即可判定的视图，方便测试与复用 */
type TabContentView = Pick<CrudTab, 'content'>;

/**
 * 判断某个 Tab 是否自带“可渲染内容”，用于决定主列表是否让位。
 *
 * 防御性约定（A-02/A-03）：
 * - `null` / `undefined` / `false` / `''` / 空数组 / 空 Fragment（`<></>`）一律视为**未提供内容**，
 *   该 Tab 仍由 CrudPage 主列表渲染 —— 历史上的「占位空节点」写法不会把列表挤掉；
 * - 只有真正渲染出东西的 content 才“接管”该 Tab，主列表（**含第一个 Tab 的主列表**）不再渲染，
 *   避免同一屏出现两份列表。
 */
export function hasRenderableTabContent(tab?: TabContentView | null): boolean {
  const content = tab?.content;
  if (content === null || content === undefined || content === false || content === '') {
    return false;
  }
  if (Array.isArray(content)) {
    return content.length > 0;
  }
  if (React.isValidElement(content)) {
    const el = content as React.ReactElement<{ children?: React.ReactNode }>;
    // 空 Fragment（<></>）是历史占位写法，不能据此隐藏主列表
    if (el.type === React.Fragment) {
      return React.Children.count(el.props.children) > 0;
    }
    return true;
  }
  return true;
}

/** 渲染某个 Tab 的自定义内容（支持 `(active) => ReactNode` 回调形式） */
export function renderTabContent(tab?: TabContentView | null): React.ReactNode {
  const content = tab?.content;
  if (typeof content === 'function') return content(true);
  return content ?? null;
}
