/**
 * Cartesian-only recharts barrel — SUBPATH MODE (V72 P2-4b)
 *
 * 直接从 recharts/es6/<subpath> 逐个命名 re-export，避免通过 recharts/index.js
 * （recharts/index.js 聚合了 Cartesian + Polar + Common，让 Rolldown 产生
 *  304KB 共同依赖 chunk "CategoricalChart-xxx.js"）。
 *
 * 通过仅 import 直角坐标系子路径，本 barrel 的 module graph 永远不会触及
 * polar/*、PieChart、RadarChart 等文件，从而将 recharts 依赖图一分为三
 * （cartesian / polar / common），达到 297KB → ≤167KB / chunk 的目标。
 */
export { BarChart } from 'recharts/es6/chart/BarChart.js';
export { LineChart } from 'recharts/es6/chart/LineChart.js';
export { AreaChart } from 'recharts/es6/chart/AreaChart.js';
export { ScatterChart } from 'recharts/es6/chart/ScatterChart.js';
export { ComposedChart } from 'recharts/es6/chart/ComposedChart.js';

export { Bar } from 'recharts/es6/cartesian/Bar.js';
export { Line } from 'recharts/es6/cartesian/Line.js';
export { Area } from 'recharts/es6/cartesian/Area.js';
export { Scatter } from 'recharts/es6/cartesian/Scatter.js';
export { XAxis } from 'recharts/es6/cartesian/XAxis.js';
export { YAxis } from 'recharts/es6/cartesian/YAxis.js';
export { ZAxis } from 'recharts/es6/cartesian/ZAxis.js';
export { CartesianGrid } from 'recharts/es6/cartesian/CartesianGrid.js';
export { Brush } from 'recharts/es6/cartesian/Brush.js';
export { ReferenceLine } from 'recharts/es6/cartesian/ReferenceLine.js';
export { ReferenceArea } from 'recharts/es6/cartesian/ReferenceArea.js';

// Common 基础（Tooltip/ResponsiveContainer/Legend/Cell/Label 等，cartesian 与 polar 共享）
export { Tooltip } from 'recharts/es6/component/Tooltip.js';
export { ResponsiveContainer } from 'recharts/es6/component/ResponsiveContainer.js';
export { Legend } from 'recharts/es6/component/Legend.js';
export { Cell } from 'recharts/es6/component/Cell.js';
