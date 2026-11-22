# WMS 仓库状态收口（B111）

- 日期：2026-11-22
- 范围：`wms.warehouses.status`
- 结论：状态值统一为 `active / inactive / maintenance`，默认 `active`；旧 CHECK 与业务口径冲突已定位，候选改为“先替换旧约束”。

## 为什么选这一列

`wms.warehouses` 是 WMS 核心主数据。本地 29 行、生产快照同样无脏值，全部 `active`。前端 `apps/web/src/schemas/wms/warehouse.ts` 早已使用三值 `active / inactive / maintenance`，默认 `active`，筛选、标签、色板齐全；后端此前创建硬编码 `'active'`、更新接受任意字符串且没有起始状态谓词。

## 关键发现：既有 CHECK 与业务值域冲突

本地 `wms.warehouses` 已存在一条 **已校验** 的约束：

```
ck_warehouses_status_standard
CHECK (status IS NULL OR status = ANY('{active,inactive,archived}'))
```

它允许 `archived`，但不允许代码和前端使用的 `maintenance`。所以“另加一条三值 CHECK”并不能让 `maintenance` 落库，合法更新仍会被旧约束以 23514 拒绝。首次演练正是因为旧约束先拦截 `active → maintenance`，没有走到新约束的非法值探针。

处理决定：B111 的候选 DDL 改为 **先 `DROP CONSTRAINT IF EXISTS ck_warehouses_status_standard`，再以同名约束重建三值 `NOT VALID`**。本地与生产快照均无 `archived` 存量，迁移成本为零；旧的 `archived` 语义由软删除 `deleted_at` 承担，不再保留在状态集合。

## 代码改动

- 新增 `svc/wms/src/modules/warehouse_status.rs`：`WarehouseStatus::{Active, Inactive, Maintenance}`，`DB_VALUES`、严格 `from_db_str`、`as_db_str`、`DEFAULT = Active`；两个单测覆盖默认值/往返/非法值拒绝与值唯一性。
- `svc/wms/src/modules/mod.rs` 注册 `warehouse_status`。
- `svc/wms/src/modules/warehouse.rs`：
  - 列表：`status` 参数严格解析，`all`/空为无过滤，未知 400；缓存键使用规范化后的状态；SELECT 与 COUNT 都追加 `status = ANY(规范集合)`，保留 `deleted_at IS NULL`。
  - 详情：WHERE 追加 `status = ANY(规范集合)`，集合外的损坏行不可读。
  - 创建：状态由硬编码 `'active'` 改为绑定 `WarehouseStatus::DEFAULT`。
  - 更新：预读行与顺手更新都加规范集合过滤；严格解析当前状态与请求状态，未传状态保持原值；UPDATE 带旧状态谓词，0 行返回 409 `仓库状态已变化，请刷新后重试`，不再假成功或覆盖并发改态。
- 前端无需改：`warehouse.ts` 已是三值，色板 `active success / inactive info / maintenance warning` 齐全；全仓未发现 `archived` 的仓库状态引用。

## 本地事务演练

所有 DDL 与探针在同一事务内执行，最后不提交，`psql -c` 失败即整体回滚。

1. `DROP CONSTRAINT ck_warehouses_status_standard` 成功。
2. 以同名约束重建 `active / inactive / maintenance` `NOT VALID` 成功。
3. 任取一行 `active → maintenance`：`UPDATE 1`，证明业务需要的状态可写。
4. 同一行 `maintenance → bogus`：`ERROR 23514`，被新约束拦下。
5. 回滚后复查：`ck_warehouses_status_standard` 仍是旧定义且 `convalidated = true`，29 行仍全部 `active`。

## 验证

- `cargo fmt --all`
- `cargo check -p topems-wms`：通过
- `cargo clippy -p topems-wms --all-targets -- -D warnings`：通过，无警告
- `cargo test -p topems-wms --lib`：565 passed，0 failed
- 前端未改，不触发 Web typecheck/lint 差异

## 盘点与队列

- `status-code-inventory.json`：186 个 Rust 枚举 / 185 个唯一值 / 200 个前端键；色板缺口 0，146 个值不在 DB CHECK。
- 映射登记 `WarehouseStatus → wms.warehouses.status`。
- 队列仍为 129 枚举 / 146 值，`resolved_enums = 97`。原因：队列按“值”归因，`active / inactive / maintenance` 三个值已在其他表的 CHECK 中出现，不属于全局缺口；本批的解决方式是把映射登记为已解析，而不是减少值级缺口。

## 后续

- 候选 DDL 尚未进入 `database/migrations/`，生产执行需窗口；窗口内先跑候选内两条预检，确认无 `archived` 后替换约束，再考虑 `VALIDATE`。
- 若业务坚持保留 `archived`，应把 `archived` 与 `maintenance` 的语义分开并改前端，而不是继续让 DB 与前端各说一套。
