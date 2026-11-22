# MES 质量检验状态守卫（B178）

- 批次：W5-B / B178
- 日期：2026-11-23
- 列：`mes.quality_inspections.status`

## 唯一值源

`svc/mes/src/modules/quality_management/inspection_status.rs` 的 `InspectionStatus`：

| 值 | 含义 |
| --- | --- |
| `pending` | 待检验（DB 默认） |
| `inspecting` | 检验中 |
| `passed` | 合格 |
| `failed` | 不合格 |
| `rework` | 返工 |
| `scrapped` | 报废 |
| `concession_received` | 让步接收（审批通过后的终态） |

该集合覆盖前端 `apps/web/src/schemas/mes/quality.ts` 的六项列表值，并补入 MES FSM 已使用的 `concession_received`。修正了此前审批流将 `concession_received` 写入状态列、但列表下拉没有该值的不一致。

## 入口绑定

- 列表 `status` 由枚举校验，`all` 与空值视为不过滤，非法值 400。
- 创建请求的 `status` 由枚举校验，缺省或空值取 `pending`；INSERT 参数绑定枚举。
- 更新请求的 `status` 由枚举校验，非法值 400；`COALESCE($5, status)` 绑定枚举。
- 让步审批发起与审批通过的 `from/to` 状态改为枚举常量获取，仍通过共享 helper 参数绑定。

## 数据库约束

- 约束名：`ck_mes_quality_inspections_status_standard`
- 定义：`CHECK (status = ANY (ARRAY['pending','inspecting','passed','failed','rework','scrapped','concession_received'])) NOT VALID`
- 本地已应用 `docs/database/mes-inspection-status-check-candidates-2026-11-23.sql`。
- 存量 2 行均为 `pending`，合规；构造 `status='bogus'` 插入被该约束拒绝后回滚。

## 前端

- `quality.ts` 下拉、色板、标签、筛选补 `concession_received`，新增 `mes.quality.k56`（让步接收 / Concession Accepted）。
- `apps/web/src/utils/status.ts` 全局色板补 `rework` 与 `concession_received`。

## 门禁

- `cargo clippy -p topems-mes --lib --tests -- -D warnings`：通过
- `cargo test -p topems-mes --lib`：386 passed
- glossary / i18n / 前端 typecheck：通过
- 生产快照只读，未应用本候选；发布前按窗口 `VALIDATE CONSTRAINT`。
