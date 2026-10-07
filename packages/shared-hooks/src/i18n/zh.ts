// useCrud 操作反馈文案字典（2026-10-08 硬编码收敛；路径含 /i18n/ 受扫描器豁免）
export const zh: Record<string, string> = {
  'crud.operationFailed': '操作失败',
  'crud.created': '创建成功',
  'crud.updated': '更新成功',
  'crud.deleted': '删除成功',
  'crud.deletedPrefix': '已删除',
  'crud.deletedUnit': '条记录',
};

export const deletedCount = (n: number): string =>
  `${zh['crud.deletedPrefix']} ${n} ${zh['crud.deletedUnit']}`;
