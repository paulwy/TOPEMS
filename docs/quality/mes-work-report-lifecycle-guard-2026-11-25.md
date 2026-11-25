# B317 MES 报工生命周期与并发守卫（2026-11-25）

## 结论

`mes.work_reports` 本地 0 行，无法用存量数据验证，但写入口缺口明确：

- update 接受任意合法状态、无当前态谓词、无软删过滤。`approved` 可回退到 `submitted`，`archived`/`cancelled` 仍可改数量与工位，已软删报工仍可更新。
- approve/reject 只按 `id + tenant` 更新，不校验当前是否为 `submitted`。重复审批会覆盖 `approved_by/approved_at`，已软删或已审批报工仍可再次审批。
- delete 只按 `id + tenant` 软删，`submitted/approved/archived` 均可直删，重复删除仍返回成功。
- 返工审批 `rejected→reworking` 走 shared-db 转换助手，已带 `status=$3 AND deleted_at IS NULL`，本批未改。

## 状态模型

`WorkReportStatus` 新增：

- `editable_from()`：`draft/rejected/reworking`，只有这三个当前态允许走通用更新。
- `deletable_from()`：`draft/rejected/cancelled`，已提交、已审批、已归档保留台账。
- `can_transition_to()`：
  - `draft → submitted/cancelled`
  - `submitted → approved/rejected/cancelled`
  - `rejected → reworking/cancelled`
  - `reworking → submitted/cancelled`
  - `approved → archived`
  - `archived/cancelled` 终态；同态幂等。

## 代码改动

- update：
  - 同一 RLS 事务内先读当前 `status`（软删行视为不存在）；
  - 非 `editable_from` 返回 409；目标状态不在迁移矩阵返回 409；
  - UPDATE 增加 `COALESCE(status,'submitted')=$17 AND deleted_at IS NULL`，0 行返回 409 并发冲突。
- approve/reject：
  - UPDATE 增加 `COALESCE(status,'submitted')='submitted' AND deleted_at IS NULL`；
  - `fetch_one` 改 `fetch_optional`，0 行由 500/404 改为 409“不存在、已删除或非待审批状态”。
- delete：
  - UPDATE 增加 `COALESCE(status,'submitted')=ANY($3) AND deleted_at IS NULL`；
  - `rows_affected=0` 返回 409，重复删除不再假成功。

## 数据库

无 DDL。本地 `mes.work_reports` 0 行，状态集合与迁移矩阵由 Rust 枚举维护。

## 验证

- `cargo fmt -p topems-mes`、`cargo check -p topems-mes` PASS。
- `cargo test -p topems-mes work_report_status` 3 passed（默认值/往返/生命周期矩阵）。

## 遗留

- `mes.work_reports` 无存量数据，迁移矩阵需在上线后由真实报工流程回归验证。
- shared-db 的 `execute_transition_and_log_db` 未检查 `rows_affected`，其他实体仍可能出现“转换 0 行但审计成功”；本批未扩大修改范围。
