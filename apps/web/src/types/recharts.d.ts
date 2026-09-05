/**
 * Recharts ES6 子路径模块类型声明
 *
 * 项目通过 recharts/es6/<subpath> 直接导入子模块以优化打包体积，
 * 但 recharts 官方只为主入口 'recharts' 提供类型声明。
 * 此文件为所有 es6 子路径提供类型回退，避免 TS7016 隐式 any 错误。
 *
 * 注意：此文件不使用 import 语句，保持为全局声明文件，
 *       以便 declare module 能正确增强外部模块解析。
 *       通过 typeof import('recharts') 从主入口获取类型。
 */

// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- 全局声明文件须保持无 import 语句，typeof import() 为唯一取类型途径
type _RechartsExports = typeof import('recharts');

// ============================================================================
// Charts 图表组件
// ============================================================================

declare module 'recharts/es6/chart/BarChart.js' {
  const BarChart: _RechartsExports['BarChart'];
  export { BarChart };
}

declare module 'recharts/es6/chart/LineChart.js' {
  const LineChart: _RechartsExports['LineChart'];
  export { LineChart };
}

declare module 'recharts/es6/chart/AreaChart.js' {
  const AreaChart: _RechartsExports['AreaChart'];
  export { AreaChart };
}

declare module 'recharts/es6/chart/ScatterChart.js' {
  const ScatterChart: _RechartsExports['ScatterChart'];
  export { ScatterChart };
}

declare module 'recharts/es6/chart/ComposedChart.js' {
  const ComposedChart: _RechartsExports['ComposedChart'];
  export { ComposedChart };
}

declare module 'recharts/es6/chart/FunnelChart.js' {
  const FunnelChart: _RechartsExports['FunnelChart'];
  export { FunnelChart };
}

declare module 'recharts/es6/chart/PieChart.js' {
  const PieChart: _RechartsExports['PieChart'];
  export { PieChart };
}

declare module 'recharts/es6/chart/RadarChart.js' {
  const RadarChart: _RechartsExports['RadarChart'];
  export { RadarChart };
}

declare module 'recharts/es6/chart/RadialBarChart.js' {
  const RadialBarChart: _RechartsExports['RadialBarChart'];
  export { RadialBarChart };
}

declare module 'recharts/es6/chart/Sankey.js' {
  const Sankey: _RechartsExports['Sankey'];
  export { Sankey };
}

declare module 'recharts/es6/chart/SunburstChart.js' {
  const SunburstChart: _RechartsExports['SunburstChart'];
  export { SunburstChart };
}

declare module 'recharts/es6/chart/Treemap.js' {
  const Treemap: _RechartsExports['Treemap'];
  export { Treemap };
}

// ============================================================================
// Cartesian 直角坐标系组件
// ============================================================================

declare module 'recharts/es6/cartesian/Bar.js' {
  const Bar: _RechartsExports['Bar'];
  export { Bar };
}

declare module 'recharts/es6/cartesian/Line.js' {
  const Line: _RechartsExports['Line'];
  export { Line };
}

declare module 'recharts/es6/cartesian/Area.js' {
  const Area: _RechartsExports['Area'];
  export { Area };
}

declare module 'recharts/es6/cartesian/Scatter.js' {
  const Scatter: _RechartsExports['Scatter'];
  export { Scatter };
}

declare module 'recharts/es6/cartesian/Funnel.js' {
  const Funnel: _RechartsExports['Funnel'];
  export { Funnel };
}

declare module 'recharts/es6/cartesian/XAxis.js' {
  const XAxis: _RechartsExports['XAxis'];
  export { XAxis };
}

declare module 'recharts/es6/cartesian/YAxis.js' {
  const YAxis: _RechartsExports['YAxis'];
  export { YAxis };
}

declare module 'recharts/es6/cartesian/ZAxis.js' {
  const ZAxis: _RechartsExports['ZAxis'];
  export { ZAxis };
}

declare module 'recharts/es6/cartesian/CartesianGrid.js' {
  const CartesianGrid: _RechartsExports['CartesianGrid'];
  export { CartesianGrid };
}

declare module 'recharts/es6/cartesian/Brush.js' {
  const Brush: _RechartsExports['Brush'];
  export { Brush };
}

declare module 'recharts/es6/cartesian/ErrorBar.js' {
  const ErrorBar: _RechartsExports['ErrorBar'];
  export { ErrorBar };
}

declare module 'recharts/es6/cartesian/ReferenceLine.js' {
  const ReferenceLine: _RechartsExports['ReferenceLine'];
  export { ReferenceLine };
}

declare module 'recharts/es6/cartesian/ReferenceDot.js' {
  const ReferenceDot: _RechartsExports['ReferenceDot'];
  export { ReferenceDot };
}

declare module 'recharts/es6/cartesian/ReferenceArea.js' {
  const ReferenceArea: _RechartsExports['ReferenceArea'];
  export { ReferenceArea };
}

declare module 'recharts/es6/cartesian/CartesianAxis.js' {
  const CartesianAxis: _RechartsExports['CartesianAxis'];
  export { CartesianAxis };
}

// ============================================================================
// Polar 极坐标系组件
// ============================================================================

declare module 'recharts/es6/polar/Pie.js' {
  const Pie: _RechartsExports['Pie'];
  export { Pie };
}

declare module 'recharts/es6/polar/Radar.js' {
  const Radar: _RechartsExports['Radar'];
  export { Radar };
}

declare module 'recharts/es6/polar/RadialBar.js' {
  const RadialBar: _RechartsExports['RadialBar'];
  export { RadialBar };
}

declare module 'recharts/es6/polar/PolarGrid.js' {
  const PolarGrid: _RechartsExports['PolarGrid'];
  export { PolarGrid };
}

declare module 'recharts/es6/polar/PolarAngleAxis.js' {
  const PolarAngleAxis: _RechartsExports['PolarAngleAxis'];
  export { PolarAngleAxis };
}

declare module 'recharts/es6/polar/PolarRadiusAxis.js' {
  const PolarRadiusAxis: _RechartsExports['PolarRadiusAxis'];
  export { PolarRadiusAxis };
}

// ============================================================================
// Common 通用组件
// ============================================================================

declare module 'recharts/es6/component/Tooltip.js' {
  const Tooltip: _RechartsExports['Tooltip'];
  export { Tooltip };
}

declare module 'recharts/es6/component/ResponsiveContainer.js' {
  const ResponsiveContainer: _RechartsExports['ResponsiveContainer'];
  export { ResponsiveContainer };
}

declare module 'recharts/es6/component/Legend.js' {
  const Legend: _RechartsExports['Legend'];
  export { Legend };
}

declare module 'recharts/es6/component/Cell.js' {
  const Cell: _RechartsExports['Cell'];
  export { Cell };
}

declare module 'recharts/es6/component/Label.js' {
  const Label: _RechartsExports['Label'];
  export { Label };
}

declare module 'recharts/es6/component/LabelList.js' {
  const LabelList: _RechartsExports['LabelList'];
  export { LabelList };
}

declare module 'recharts/es6/component/Customized.js' {
  const Customized: _RechartsExports['Customized'];
  export { Customized };
}
