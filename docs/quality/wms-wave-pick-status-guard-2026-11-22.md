# WMS 波次拣货/明细状态收口（B114）

- 日期：2026-11-22
- 范围：`wms.wave_picks.status`、`wms.wave_pick_items.status`
- 结论：波次主状态统一为 FSM/前端既有的五值，明细统一为三值；默认由错误的 `pending` 改为 `created`；分配、开始、完成、取消、行级拣货全部加入起始态与重复执行保护。

## 状态集合

主状态：

```
created → assigned → picking → completed
created | assigned | picking → cancelled
```

默认 `created`。历史 `pending` 只读映射为 `created`，不再写入。

明细状态：

```
pending → picked | short_picked
```

默认 `pending`；`picked / short_picked` 为终态，`status='pending'` 是每次拣货的原子前置条件。

## 本批发现并修掉的问题

1. **创建写 `pending`，FSM 与前端却从 `created` 开始**：后端、DB 默认、共享 FSM、前端四处初始态不一致，任何按 FSM 驱动的流转第一步都失败。现在创建与 DB 候选默认统一为 `created`，旧 `pending` 仅兼容读取。
2. **分配只写 `assigned_to`，完全不改状态**：分配成功后波次仍是 `created`，开始动作却要求 `pending`，形成“已分配但无法开始”。现在分配原子完成 `created → assigned`，0 行返回 409。
3. **前端分配传 `{assigned_to:'current'}`，后端要求 UUID，UI 分配必然 400**：请求字段改为字符串，`current` 解析为 `claims.user_id()`，其他值必须能解析 UUID，否则 400；当前登录人同时写入 `assigned_user_name`。
4. **开始从 `pending` 直接跳 `picking`，跳过 `assigned`**：现在只允许 `assigned → picking`，且 `assigned_to` 必须非空。
5. **完成不检查明细是否拣完，也不维护四项聚合**：现在只允许 `picking`，要求至少一条明细、不存在 `pending` 或集合外明细；UPDATE 内用子查询计算 `total_items / picked_items / total_quantity / picked_quantity`，未拣完或空波次 0 行返回 409。
6. **取消允许 `pending|picking`**：现在只允许 `created / assigned / picking`；`completed / cancelled` 不可再取消。
7. **删除没有状态限制**：现在只允许 `created / cancelled`，其他状态 0 行 409。
8. **通用 PUT 可改状态绕过 FSM**：编辑只允许 `created / assigned`，请求体出现 `status` 直接 400，UPDATE 带状态谓词，并发流转后编辑 0 行 409。
9. **行级拣货缺省数量写 `-1.0` 形成负数量，且可重复拣同一行**：现在缺省按计划量整行拣货，显式数量必须非负且不超过 `planned_quantity`；`status='pending'` 做幂等闸门，重复拣货 0 行；主波次必须 `picking` 才允许拣货。
10. **缺量拣货缺省写 `0.0`，但数量可大于计划量、也可重复执行**：现在缺省 0，显式数量必须非负且小于计划量；同样要求 `pending` 与主波次 `picking`。
11. **`/picking/lists` 与详情直接透传自由文本状态**：列表 `status` 参数严格解析、非法 400；列表 SELECT/COUNT、详情、明细全部加规范集合过滤，历史 `pending` 行只读投影为 `created`；统计的 `pending / in_progress` 改为 `created+assigned / picking`，逾期只统计三个非终态。

## 代码

- 新增 `svc/wms/src/modules/wave_pick_status.rs`：
  - `WavePickStatus` 五值 + `DB_VALUES / DEFAULT(created) / from_db_str / from_read_str / as_db_str / can_edit / can_delete / can_cancel / can_transition_to`。
  - `WavePickItemStatus` 三值 + `DB_VALUES / DEFAULT(pending) / from_db_str / as_db_str / is_terminal`。
  - 三个单测：主状态往返与旧 `pending` 读别名、流转矩阵、明细值往返与终态。
- `svc/wms/src/shared/fsm.rs`：`WAVE_PICK` 改为引用同一组枚举常量；`is_valid_wave_pick_status` 先严格解析枚举。
- `svc/wms/src/modules/wave_pick.rs`：
  - 列表/详情/创建/更新/删除/分配/开始/完成/取消/明细列表全部收口。
  - 写入口的新旧状态值改为绑定 `WavePickStatus` / `WavePickItemStatus` 常量。
  - 分配 `AssignWavePickRequest.assigned_to` 由 `Uuid` 改为 `String`，支持 `current`。
  - 完成动作加入空波次、未拣完、集合外明细三重守卫与四项聚合。
  - 拣货/缺量拣货加入主波次 `picking`、`status='pending'`、数量上下界守卫。
- `svc/wms/src/modules/picking.rs`：列表/详情状态严格解析与集合过滤，明细集合过滤，统计状态桶纠正。
- 前端 `apps/web/src/utils/status.ts`：补 `picked: success`、`short_picked: warning`；`WAVE_PICK_STATES` 与 API 类型原已是五值，无需改契约。

## 本地事务演练

本地 `wms.wave_picks`、`wms.wave_pick_items` 均 0 行，生产快照同为 0 行，无存量迁移成本。所有 DDL 与探针在事务内执行，最后回滚。

1. 两条候选 CHECK 以 `NOT VALID` 建成，`wave_picks.status` 默认改为 `created`。
2. 插主单/明细不传 `status`：主单得 `created`、明细得 `pending`。
3. 合法链路 `created → assigned → picking → completed` 每步 `UPDATE 1`；明细 `pending → picked` 1 行。
4. 未拣完时演练完成 UPDATE：返回 0 行；拣完后返回 1 行，四项聚合为 `1 / 1 / 10.00 / 9.00`。
5. 同一条明细重复拣货：`UPDATE 0`。
6. 主状态改 `bogus`、明细改 `partial`：分别触发 `ERROR 23514`，被两条 CHECK 拦下。
7. 回滚后复查：两条约束计数 0，两表仍 0 行。

## 验证

- `cargo fmt --all`
- `cargo check -p topems-wms`：通过
- `cargo clippy -p topems-wms --all-targets -- -D warnings`：通过
- `cargo test -p topems-wms --lib`：573 passed（B113 为 570，新增 3 个）
- `apps/web pnpm run typecheck`：通过
- `apps/web pnpm run lint`：0 errors / 156 warnings（既有告警，无新增错误）
- request-txn：全量 `1651`，WMS `292`，与基线一致
- `check-scope-api --changed-only`、`check-txn-write-non2xx --changed-only`：通过
- glossary、i18n quality：通过

## 盘点与队列

- 盘点：192 个 Rust 枚举 / 187 个唯一值 / 202 个前端键；色板缺口 0，148 个值不在 DB CHECK。
- 映射新增 `WavePickStatus → wms.wave_picks.status`、`WavePickItemStatus → wms.wave_pick_items.status`。
- 队列：133 枚举 / 148 值，`resolved_enums = 101`；内部 63 / 待映射 64 / API 投影 25 / 财务候选 33（分桶可重叠）。

## 后续

- 候选 DDL 未进 `database/migrations/`，生产执行需窗口；窗口内先跑 SQL 文件头部两条预检，顺序为先改默认、再加两条 `NOT VALID` CHECK。
- 波次没有“创建明细”的公开端点，明细目前由其他链路/脚本注入；完成要求至少一条明细，空波次会被 409 拒绝。
- 取消处于 `picking` 的波次不会回滚已拣明细或库存占用；库存影响仍由出库单链路负责，留待库存联动批次。
- `assigned_to` 只校验 UUID/current 与用户名回填，未校验该用户是否属于当前租户或具备拣货权限。
