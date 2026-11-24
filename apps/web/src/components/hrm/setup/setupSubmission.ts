export interface SetupRowLike {
  name: string;
  /** 已入库回显行（只读），不参与本次提交 */
  persisted?: boolean;
}

export interface SetupSubmissionPlan<T> {
  /** 当前步是否允许前进（至少有一条新行，或库里已有数据） */
  allowed: boolean;
  /** 本次真正需要提交到后端的行（去掉 persisted 与已知重名） */
  toCreate: T[];
  /** 参与本次校验的新行（未去重） */
  newRows: T[];
}

/**
 * P1-3：回退/刷新续走时的提交计划。
 *
 * 旧实现先判 `filled.length === 0` 就抛「至少录入一个」，已有部门/岗位全部
 * 标 persisted 时 filled=0，请求都发不出去。这里改为：
 *   - 无新行但库里已有数据 → allowed=true、toCreate=[]（仍调后端把该步置完成）
 *   - 无新行且库里也无数据 → allowed=false
 */
export function planSetupSubmission<T extends SetupRowLike>(
  rows: T[],
  knownNames: string[],
  hasExisting: boolean
): SetupSubmissionPlan<T> {
  const newRows = rows.filter((r) => r.name.trim() && !r.persisted);
  if (newRows.length === 0 && !hasExisting) {
    return { allowed: false, toCreate: [], newRows: [] };
  }
  const known = new Set(knownNames.map((n) => n.trim().toLowerCase()));
  const toCreate = newRows.filter((r) => !known.has(r.name.trim().toLowerCase()));
  return { allowed: true, toCreate, newRows };
}
