# B39 · wms.sync_records 状态单一源（2026-11-21）

## 现状（改动前）
- `wms.sync_records`：本地 834 行，`success` 830 / `completed` 4，无 CHECK 约束；`sync_record_details` 0 行。
- 状态全部是 SQL 字面量：创建 `'running'`、立即改 `'success'`、重试/触发同步写 `'success'`，统计分别写死 `'success'`、`'failed'`、`IN ('running','pending')`。
- 列表 `status` 过滤把请求值原样拼进 SQL（`status = $4`），任意非法值都返回 200 + 空列表，无法区分“没有记录”和“状态写错”。
- 统计的“成功”只认 `success`，4 条历史 `completed` 从未计入成功数；前端 `SyncRecord.status` 与查询参数都是裸 `string`。

## 改动
1. 新增 `svc/wms/src/modules/sync_status.rs`：
   - `SyncRecordStatus { Pending, Running, Success, Failed, Completed }`，`DB_VALUES` 五值；
   - `DEFAULT = Running`（创建后立即推进 success）；`completed` 为历史终态、只读，`success_values = [success, completed]` 并入统计；
   - `active_values = [pending, running]`、`failed_values = [failed]`，严格解析 + 2 个单测（roundtrip、统计桶覆盖 completed）。
2. `sync_records.rs`：
   - 列表 `status` 先严格解析，未知值 400（不再静默空列表），SQL 绑枚举字符串；
   - 创建 INSERT 的 `'running'` 改绑 `DEFAULT`，完成更新与重试改绑 `Success`；
   - 触发同步 INSERT 的 `'success'` 改绑 `Success`；
   - 统计三条计数改 `status = ANY($2::text[])`，分别绑 `success_values` / `failed_values` / `active_values`；
   - 明细重试 `'success'` 改绑 `Success`（明细表当前 0 行）。
3. 前端 `apps/web/src/api/wms/types.ts`：新增 `SyncRecordStatus` 五值联合，`SyncRecord.status` 与 `SyncPaginationParams.status` 收紧（原先裸 `string`）。
4. 候选 DDL `docs/database/wms-sync-record-status-check-candidates-2026-11-21.sql`：`sync_records_status_check`（五值，`NOT VALID`）；列默认 `pending` 是合法排队态，保持不动。

## 验证
- `cargo check -p topems-wms`、`cargo clippy -p topems-wms --all-targets -- -D warnings`、`cargo fmt --all` 干净。
- `cargo test -p topems-wms --lib sync_status`：2 passed。
- 本地演练（事务内 ROLLBACK，残留 0；约束与演练行均已核销）：
  - `INSERT pending` → `UPDATE running` → `UPDATE success` 各 1 行；
  - `success → 'bogus'` → 23514；
  - 回滚后 `B39-DRILL` 行 0、`sync_records_status_check` 约束 0。
- 盘点：枚举 149、值 156、不在 DB CHECK 117、色板缺口 0；前端键 171；队列 106 枚举 / 117 值（internal 58 / persisted_unmapped 33 / api_projection 11 / finance_candidate_ready 15）；映射 84。

## 残留
- `sync_record_details.status` 仍是自由文本（本地 0 行、无 CHECK），且明细重试只看 `id` 列表，不校验原状态是否失败。
- 创建接口“模拟完成”语义未变：插入即 running、同事务立即 success，`started_at`/`completed_at` 相差 0 秒，不代表真实同步耗时。
- `source_system`/`target_system`/`sync_direction`/`sync_type` 仍是自由文本，本批只收口 `status`。
- 候选 CHECK 未进 `database/migrations/`、未在生产执行；窗口内需先快照预检再 `VALIDATE CONSTRAINT`。
