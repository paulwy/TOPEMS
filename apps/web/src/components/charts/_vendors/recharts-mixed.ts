/**
 * Mixed recharts barrel — SUBPATH MODE (V72 P2-4b)
 *
 * 供 StatsChart.impl、ChartLibrary 这种同时用 Cartesian + Polar 两类图表的模块使用。
 * 虽然它会同时加载两个子树，但它本身是 lazy loaded，所以它独立打包并不会影响首屏。
 *
 * 此处不能使用 `export * from 'recharts'`（会重新把 304KB CategoricalChart
 * 共同依赖 chunk 拉出来），而是同时聚合 cartesian/polar 两个 barrel 的导出。
 */
export * from './recharts-cartesian';
export * from './recharts-polar';
