/**
 * GIS 页面共享类型定义
 *
 * 注意：本文件**不是 Page 组件**，仅导出 TabType / Notification 类型。
 * 历史命名为 UseGisPage.tsx 是误导（原文件含 JSX，后重构为纯类型），
 * 2026-10-27 UI 审计后将后缀从 .tsx 改为 .ts。
 */
export type TabType =
  | 'map'
  | 'devicePoints'
  | 'pipelines'
  | 'storageLocations'
  | 'evidenceRecords'
  | 'factoryMaps'
  | 'businessLocations';

export interface Notification {
  type: 'success' | 'error';
  message: string;
}
