# B81 · master-data 自动修复状态过滤与回滚写入口（2026-11-21）

## 现状（改动前）
- `master_data.mdm_auto_fix_actions` 本地 2 行（applied 1 / verified 1）、无 CHECK；`FixStatus` 读侧未知值静默回退 `Pending`。
- 修复列表的 `status` 查询参数直接按原值匹配，未知值返回空而不是报错；列表也没有只放行四值。
- 回滚接口先读状态，再无条件 UPDATE：已回滚（pending）可被再次 UPDATE，0 行统一 404；并发下两次回滚都可能执行。

## 改动
1. `FixStatus` 增加 DB_VALUES、`from_db_str`、`as_db_str`、`revert_from`（applied/verified）。
2. 修复列表先严格解析 `status`，未知值 400；SELECT 与 COUNT 都增加四值过滤，集合外状态不再以 pending 展示。
3. 回滚改绑枚举并增加 `status = ANY(revert_from)`；0 行先显式 `rollback()` 再返回 409，重复回滚/状态不符不再报 404。
4. 候选 CHECK 沿用 `docs/database/master-data-status-check-candidates-2026-11-21.sql` 的四值 NOT VALID。

## 验证
- `cargo check -p topems-master-data`、`cargo clippy -p topems-master-data --all-targets -- -D warnings` 干净。
- 单元测试覆盖四值往返、未知值拒绝、revert_from 不含 pending。
- 本地演练（事务内 ROLLBACK）：applied/verified 行回滚 UPDATE 1 行；再对 pending 执行回滚 UPDATE 0 行。
- 存量 applied/verified 均合法，无需归一。

## 残留
- 自动修复的“应用”动作写 status=applied 时没有经过枚举校验，当前只校验了回滚；下一批可把应用入口也纳入。
- 生产若存在 `skipped` 等历史值，施加 CHECK 前需先盘点修订。
