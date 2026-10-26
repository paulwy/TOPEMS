// 图表演示色板（G2 / AntV 经典序列）
//
// 用途：Storybook stories 的示例数据统一从这里取色，避免同一套 G2 色散落硬编码在各
// `*.stories.tsx` 中。生产组件的语义系列色请走 `chartTheme.ts` 的 `BIChartColors` /
// `useChartTheme`（跟随 MUI 主题与暗色模式），本文件只服务于演示数据。

/** G2 经典系列色（蓝 / 绿 / 黄 / 红 / 青），按系列下标循环取用。 */
export const G2_PALETTE = [
  '#5B8FF9', // 蓝（主系列色）
  '#5AD8A6', // 绿
  '#F6BD16', // 黄
  '#E86452', // 红
  '#6DC8EC', // 青
] as const;

/** 演示辅助色（非系列色，用于对照线 / 占位 / 灰态示例）。 */
export const DEMO_COLORS = {
  neutralGrey: '#9E9E9E',
  materialBlue: '#1976D2',
} as const;
