/**
 * 共享内联样式常量 — 收敛 components/ 下重复度最高的 style={{}} 模式。
 *
 * 背景：全仓 style={{}} 3563 处，components/ 下 1534 处。
 * 本文件提取 Top 重复模式（图标尺寸 / flex 行布局）为命名常量，
 * 消除跨文件复制粘贴，后续主题调整只需改一处。
 *
 * 不可收敛项（动态计算/一次性布局）：保留内联，标注见 commit message。
 */

/** 图标小尺寸 16×16（141 处重复）— MUI SvgIcon inline 尺寸 */
export const iconSm: React.CSSProperties = { width: 16, height: 16 };

/** 图标中尺寸 18×18（57 处重复） */
export const iconMd: React.CSSProperties = { width: 18, height: 18 };

/** 图标大尺寸 20×20（56 处重复） */
export const iconLg: React.CSSProperties = { width: 20, height: 20 };

/** Flex 行居中 + gap 8（13 处重复）— 对齐 semanticTokens.space.card.headerGap */
export const flexRowCenter: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

/** Flex 行居中 + gap 12（6 处重复） */
export const flexRowCenterGap12: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
};
