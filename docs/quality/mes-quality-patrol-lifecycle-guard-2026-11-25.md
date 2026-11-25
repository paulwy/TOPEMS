# B304 MES 质量巡检生命周期守卫（2026-11-25）

## 结论

`mes.quality_patrols` 与 `mes.quality_patrol_items` 本地均为 0 行。两条写路径都只做了状态白名单，没有终态封闭、软删过滤和并发谓词：

- 父巡检 `completed` 后仍可改字段，甚至回退到 `pending/in_progress`；删除不判状态，也不检查影响行数。
- 巡检项目 `pass/fail` 判定后仍可改值或回退；父巡检已完成后仍可新增、编辑、删除项目。
- 父/子 update 的 WHERE 只有 `id + tenant_id`，并发状态变化会互相覆盖。

## 代码改动

### 状态机

- `QualityPatrolStatus`：`pending → in_progress → completed`，`completed` 终态；禁止回退 `pending`。`DELETABLE = ["pending"]`。
- `QualityPatrolItemStatus`：`pending → pass/fail`，判定后终态；禁止回退 `pending`。`DELETABLE = ["pending"]`。

### 父巡检

- update 预读未删除当前态：缺失 404、非法状态 409；按 `can_update_from` 校验流转，终态编辑/回退 409；UPDATE 增加 `AND status IS NOT DISTINCT FROM $12 AND deleted_at IS NULL`，0 行 409。
- delete 增加 `status = ANY(DELETABLE) AND deleted_at IS NULL`，0 行 409，重复删除不再假成功。

### 巡检项目

- 新增、编辑、删除都先 JOIN 父巡检，父巡检 `completed` 时拒绝（409）；父巡检已软删则视为项目不存在。
- update 预读子项与父项状态：子项终态编辑/回退 409；UPDATE 增加 `AND status IS NOT DISTINCT FROM $8 AND deleted_at IS NULL`，0 行 409。
- delete 只允许 `pending`，并增加 `status = ANY(DELETABLE) AND deleted_at IS NULL` 与父巡检未完成校验，0 行 409。

## 数据库

无 DDL。两表 `status` 均可空、默认 `pending`，代码将 NULL 归一为默认态。

## 验证

- `cargo fmt -p topems-mes`、`cargo check -p topems-mes` PASS。
- `cargo test -p topems-mes --lib patrol` 6 passed（两个状态机各新增 1 项生命周期单测）。
- 本地两表 0 行，无法用存量数据验证拒绝路径；上线后由新增/编辑/删除入口按上述状态机拦截。

## 遗留

- 创建接口仍允许直接写入 `completed` 巡检或 `pass/fail` 项目，用于历史数据导入；后续如需强制“从 pending 开始”，应在导入通道之外收紧。
