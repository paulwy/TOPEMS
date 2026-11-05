export interface FixedColumnPositions {
  leftPositions: Record<string, number>;
  rightPositions: Record<string, number>;
}

export interface ComputeFixedColumnPositionsOptions {
  visibleColumns: Array<{ id: string; fixed?: 'left' | 'right' }>;
  selectable?: boolean;
  isBatchSelectionEnabled?: boolean;
  showRowNumber?: boolean;
  treeView?: boolean;
  hasRowActions?: boolean;
  columnConfigurable?: boolean;
  getColumnWidth: (columnId: string) => number | string | undefined;
}

const DEFAULT_COLUMN_WIDTH = 150;

/**
 * 计算固定列的 left/right 位置（sticky 表格使用）。
 * 从 ListPageTemplate 的 useMemo 原样抽出，保持偏移量常量一致。
 */
export function computeFixedColumnPositions({
  visibleColumns,
  selectable,
  isBatchSelectionEnabled,
  showRowNumber,
  treeView,
  hasRowActions,
  columnConfigurable,
  getColumnWidth,
}: ComputeFixedColumnPositionsOptions): FixedColumnPositions {
  const leftPositions: Record<string, number> = {};
  const rightPositions: Record<string, number> = {};
  let leftOffset = 0;
  let rightOffset = 0;
  // 左侧固定列：选择框 + 行号 + 左侧固定列
  if (selectable || isBatchSelectionEnabled) leftOffset += 48;
  if (showRowNumber) leftOffset += 60;
  if (treeView) leftOffset += 48;
  const leftFixed = visibleColumns.filter((col) => col.fixed === 'left');
  leftFixed.forEach((col) => {
    leftPositions[col.id] = leftOffset;
    const w = getColumnWidth(col.id);
    leftOffset += typeof w === 'number' ? w : DEFAULT_COLUMN_WIDTH;
  });
  // 右侧固定列：操作列 + 列配置 + 右侧固定列
  if (hasRowActions) rightOffset += 80;
  if (columnConfigurable) rightOffset += 48;
  const rightFixed = [...visibleColumns].filter((col) => col.fixed === 'right').reverse();
  rightFixed.forEach((col) => {
    rightPositions[col.id] = rightOffset;
    const w = getColumnWidth(col.id);
    rightOffset += typeof w === 'number' ? w : DEFAULT_COLUMN_WIDTH;
  });
  return { leftPositions, rightPositions };
}
