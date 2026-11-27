import { describe, it, expect } from 'vitest';
import { reportSchema } from '../bi/report';

/**
 * 报表 schema 列渲染签名的回归护栏（2026-11-27）
 *
 * toColumnDef 用 function.length 判断渲染器语义：
 *   - length 1 → 当作「值渲染器」，参数是单元格值
 *   - length ≥ 2 → 当作「行渲染器」，参数是整行
 * 报表 schema 的渲染器全部按「行」写，却只声明了一个参数，
 * 结果拿到的是单元格值（字符串/undefined），于是列表出现
 * 「名称空白 / 创建人未知 / 创建时间 Invalid Date」。
 *
 * 这里锁死：凡是带 renderCell 的列，都必须声明第二参，走行渲染分支。
 */
describe('BI 报表 schema 列渲染签名', () => {
  const fieldsWithRender = reportSchema.fields.filter((f) => typeof f.renderCell === 'function');

  it('存在需要行渲染的列', () => {
    expect(fieldsWithRender.length).toBeGreaterThan(0);
  });

  it('所有 renderCell 都声明了第二参（行渲染）', () => {
    const singleArg = fieldsWithRender
      .filter((f) => (f.renderCell as (...args: unknown[]) => unknown).length < 2)
      .map((f) => f.name);
    expect(singleArg).toEqual([]);
  });
});
