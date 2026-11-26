# MES 在制品当前态严格化（B340，2026-11-26）

## 背景

`mes.wips` 本地 2 行，status 均为 `in_progress`，但 `tenant_id`、`current_process_id`、`current_work_station_id` 全为 NULL；`mes.wip_transfers` 0 行。`status` 列可空、默认 `'in_progress'`，没有 NOT NULL 约束。

B318 已为在制品转移补齐父行租户、来源一致性 409 与子表租户。但 `update_wip` 与 `transfer_wip` 读取当前态时都使用同一模式：

```rust
let current_status = ... .and_then(WipStatus::from_db_str).unwrap_or(WipStatus::DEFAULT);
```

`WipStatus::DEFAULT = InProgress`。这意味着：

- 数据库里 `status` 为 NULL 或未知字符串的行，会被**当成 `in_progress`** 参与状态机判断；
- `update_wip` 里 `completed / transferred` 的行如果 status 是脏值，会被判为活跃态，允许被改成 `completed/transferred`（写入后反而“修好”了脏值），历史状态语义被静默改写；
- `transfer_wip` 同理，脏值行会被当作可转移态直接生成转移记录；
- `update_wip` 对终态行还有一处漏洞：`can_transition_to` 对同态返回 true，因此 `completed` 行在 `status` 不变时仍允许修改数量/批次/备注，与注释“终态 completed/transferred 不再接受更新”不一致。

## 修复

### 状态枚举

`svc/mes/src/modules/wip_status.rs` 新增：

```rust
/// 终态：completed / transferred，不再接受任何更新或转移。
pub const fn is_terminal(self) -> bool {
    matches!(self, Self::Completed | Self::Transferred)
}
```

新增单测 `terminal_states_are_closed`：`pending/in_progress` 非终态，`completed/transferred` 为终态，且 `completed` 不能转到 `transferred`。

### `update_wip`

- 当前态改为严格解析：`from_db_str` 返回 `None`（NULL / 空 / 未知值）时记 error 日志并返回 409「WIP 当前状态为空或非法，请先修复数据后再更新」，不再回落默认态；
- 终态提前拦截：`current_status.is_terminal()` 直接 409，不再依赖同态 `can_transition_to` 的幂等放行；
- 非法迁移文案改为明确的状态机口径（只允许 `pending→in_progress`、`in_progress→completed/transferred`）；
- 并发谓词 `status IS NOT DISTINCT FROM $8` 绑定的是原始字符串，严格解析通过后语义不变；租户、软删、0 行 409 逻辑保持原样。

### `transfer_wip`

同样把当前态改为严格解析，NULL / 未知值返回 409「WIP 当前状态为空或非法，请先修复数据后再转移」；`transferable_from` 白名单与来源工序/工位一致性 409、`wip_transfers` 子表租户、父行 UPDATE 的 `rows_affected` 检查均保持不变。

## 验证

- `cargo fmt -p topems-mes`、`cargo check -p topems-mes` PASS。
- `cargo test -p topems-mes --lib wip` 15 passed（含新增终态用例）。
- 数据事实：本地 2 行 WIP status 合法但 `tenant_id` 为 NULL，当前租户写入口按 `tenant_id = $` 过滤后**查不到这两行**；因此本批的严格解析不会改变现有可写数据的行为，只关闭“脏状态被当默认态”的路径。
- 状态与 SQL 门禁：`dump-status-code-inventory --check --strict-palette`、`status-db-check-queue --check`、`check-status-enum-contract`、`dump-status-checks --check`、`check-request-txn --changed-only`、`check-destructive-sql`、`check-directed-migrations --changed-only` 全部通过。

## 遗留

- `mes.wips` 2 行的 `tenant_id` / `current_process_id` / `current_work_station_id` 全空，属历史数据缺列，当前租户写入口无法操作这两行；是否回填（以及回填到哪个租户/工序）需要业务确认，未在本批做数据迁移。
- `wips.status` 仍可空、默认 `in_progress`，数据库层没有 NOT NULL + CHECK 约束；代码层已 fail-closed，但若要彻底防脏值，需要一条“先回填 NULL → 再加 NOT NULL/CHECK”的定向迁移，留待独立批次。
