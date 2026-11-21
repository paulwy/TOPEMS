# B41 · scm.sync_records 状态单一源（2026-11-21）

## 现状（改动前）
- `scm.sync_records`：本地 546 行，全部 `completed`；无 CHECK 约束；列默认 `'pending'`。
- 状态全部是 SQL 字面量：创建 `'running'`、后台任务改 `'completed'`、重试/触发同步写 `'completed'`。
- 列表 `status` 过滤把请求值原样拼进 SQL（`status = $4`），非法值返回 200 + 空列表。
- 前端 `apps/web/src/api/scm/types.ts` 的 `SyncRecord.status` 与查询参数都是裸 `string`。
- 与 WMS 同构表终态词不一致：WMS 用 `success`，SCM 用 `completed`；两边各自有存量，本批不强统一。

## 改动
1. 新增 `svc/scm/src/modules/sync_status.rs`：
   - `SyncRecordStatus { Pending, Running, Completed, Failed }`，`DB_VALUES` 四值；
   - `DEFAULT = Running`；`completed` / `failed` 为终态；
   - 严格解析 + 2 个单测（roundtrip、终态判定）。
2. `sync_records.rs`：
   - 列表 `status` 先严格解析，未知值 400（不再静默空列表），SQL 绑枚举字符串；
   - 创建 INSERT 的 `'running'` 改绑 `DEFAULT`；
   - 后台模拟完成、重试、触发同步的 `'completed'` 全部改绑 `Completed`，`SyncResult.status` 改用枚举输出。
3. 前端 `apps/web/src/api/scm/types.ts`：新增 `SyncRecordStatus` 四值联合，`SyncRecord.status` 与 `SyncRecordQueryParams.status` 收紧。
4. 候选 DDL `docs/database/scm-sync-record-status-check-candidates-2026-11-21.sql`：`sync_records_status_check`（四值，`NOT VALID`）；列默认 `pending` 是合法排队态，保持不动。

## 验证
- `cargo check -p topems-scm`、`cargo clippy -p topems-scm --all-targets -- -D warnings`、`cargo fmt --all` 干净。
- `cargo test -p topems-scm --lib sync_status`：2 passed。
- 本地演练（事务内 ROLLBACK，残留 0）：
  - `INSERT pending` → `UPDATE running` → `UPDATE completed` 各 1 行；
  - `completed → 'bogus'` → 23514；
  - 回滚后 `B41-DRILL` 行 0、`sync_records_status_check` 约束 0。
- 盘点：枚举 150→151、值 157（四值均已被其他枚举覆盖）、不在 DB CHECK 118、色板缺口 0；前端键 172；队列 107 枚举 / 118 值；映射 85→86。

## 残留
- 创建接口仍是“异步模拟完成”：插入 running 后 `tokio::spawn` 用系统作用域改 completed，没有真实同步结果与失败路径，`failed` 目前无写入方。
- 与 WMS 的终态词差异（success vs completed）保留；若要统一需同时迁移两张表的存量与前端筛选。
- `sync_record_details.status` 仍是自由文本（本地 0 行）。
- 创建/重试/触发没有显式 `tenant_id` 谓词的路径仍依赖请求级 RLS 事务；后台任务用显式租户谓词。
- 候选 CHECK 未进 `database/migrations/`、未在生产执行。
