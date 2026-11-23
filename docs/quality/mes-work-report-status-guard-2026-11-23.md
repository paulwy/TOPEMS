# 生产报工状态守卫（B182）

- 批次：W5-B / B182
- 日期：2026-11-23
- 列：`mes.work_reports.status`

## 唯一值源

`svc/mes/src/modules/work_report_status.rs` 的 `WorkReportStatus`：

| 值 | 含义 |
| --- | --- |
| `draft` | 草稿 |
| `submitted` | 已提交待审（创建默认） |
| `approved` | 审批通过 |
| `rejected` | 已驳回 |
| `reworking` | 返工中（返工审批发起后的状态） |
| `archived` | 已归档 |
| `cancelled` | 已取消 |

本批修正三处口径分裂：后端创建原写 `pending`、前端 schema 下拉只有五项、前端类型联合为 `draft/submitted/archived/rejected/reworking`。统一后创建写 `submitted`，schema 与类型联合均为七项。

## 入口绑定

- 列表 `status` 由枚举校验，`all` 与空值视为不过滤，非法值 400。
- 创建硬编码 `'pending'` 改为参数 `$15` 并绑定默认 `Submitted`，tenant 顺延为 `$16`。
- 更新 `status` 由枚举校验后参数绑定，非法值 400。
- 审批通过 `SET status`、审批驳回 `SET status` 改为参数 `$4/$5` 分别绑定 `Approved/Rejected`。
- 返工审批发起与通过的两处 `rejected→reworking` 改为枚举常量获取后传参。
- 创建 `query!` 改为运行期 `query_as` + 既有 `WorkReportRow`。

## 前端

- `workReport.ts` 下拉、徽标、筛选补 `reworking`、`archived`；新建默认值由 `draft` 改为 `submitted`。
- `types/mes.ts` 的 `WorkReportStatus` 统一为七值。
- 中英文新增 `mes.work_report.k45`（返工中 / Reworking）、`k46`（已归档 / Archived）。
- `apps/web/src/utils/status.ts` 补 `reworking` 色板。

## 数据库约束

- 约束名：`ck_mes_work_reports_status_standard`
- 定义：`CHECK (status = ANY (ARRAY['draft','submitted','approved','rejected','reworking','archived','cancelled'])) NOT VALID`
- 本地已应用 `docs/database/mes-work-report-status-check-candidates-2026-11-23.sql`。
- 表当前 0 行；构造 `status='bogus'` 插入被该约束拒绝后回滚。

## 门禁

- `cargo clippy -p topems-mes --lib --tests -- -D warnings`：通过
- `cargo test -p topems-mes --lib`：394 passed
- 生产快照只读，未应用本候选；发布前按窗口 `VALIDATE CONSTRAINT`。
