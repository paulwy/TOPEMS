import { describe, expect, it } from 'vitest';
import { navGroupFromDbMenu } from '../menuGrouping';
import type { DbMenuItem } from '@/api/core/menus';

function item(groupCode?: string): DbMenuItem {
  return {
    code: 'finance-vouchers',
    titleKey: 'finance.nav.finance-vouchers',
    title: '凭证管理',
    order: 1,
    visible: true,
    groupCode,
  };
}

describe('navGroupFromDbMenu', () => {
  it('maps DB module-prefixed group code to semantic group', () => {
    expect(navGroupFromDbMenu(item('finance_business'))).toBe('business');
    expect(navGroupFromDbMenu(item('mes_overview'))).toBe('overview');
    expect(navGroupFromDbMenu(item('finance_analytics'))).toBe('analytics');
  });

  it('falls back when DB group is absent or unknown', () => {
    expect(navGroupFromDbMenu(item())).toBeUndefined();
    expect(navGroupFromDbMenu(item('finance_unknown'))).toBeUndefined();
  });
});
