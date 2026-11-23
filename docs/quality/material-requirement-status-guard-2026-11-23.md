# 物料需求状态守卫（B183）

日期：2026-11-23
表：`mes.material_requirements.status`
枚举：`MaterialRequirementStatus`（`svc/mes/src/modules/material_requirement_status.rs`）

## 唯一值集

`draft` / `confirmed` / `released` / `completed` / `cancelled`，默认 `draft`。

## 收口内容

| 入口 | 收口前 | 收口后 |
| --- | --- | --- |
| 列表过滤 | `status` 直接透传 `WHERE status = $1` | 先过 `from_db_str`，非法值 400；`all` 视为不过滤 |
| 更新 | `body.status` 直接 `COALESCE` 绑定 | 先过 `from_db_str`，非法值 400；空串归一为不更新 |
| 单条创建 | INSERT 不含 status，依赖 DB 默认 `pending` | 显式写入 `$15`，绑定 `Draft` |
| 计划批量生成 | 状态写死 `calculated` | 绑定 `Draft`（`source_type` 仍为 `calculated`，未误改） |
| 确认 | 硬编码 `status = 'confirmed'` | 参数 `$2` 绑定 `Confirmed` |
| 释放 | 硬编码 `status = 'released'` | 参数 `$2` 绑定 `Released` |
| 响应兜底 | 7 处 `"pending"` | 统一为 `Draft` |
| DB 默认 | `'pending'` | `'draft'` |

## 数据库验证

- 约束：`ck_mes_material_requirements_status_standard`，`convalidated = false`（NOT VALID）。
- 默认值：`'draft'::character varying`。
- 存量：表 0 行，非法值 0 行。
- 负向验证：插入 `status='bogus'` 被约束拒绝，事务未落库。

## 门禁

- `cargo clippy -p topems-mes --lib --tests -- -D warnings`：通过
- `cargo test -p topems-mes --lib`：396 passed
- SQLx 离线缓存：新增两枚查询缓存（创建、状态流转），`cargo sqlx prepare` 全局执行失败已 `git restore .sqlx`，仅保留本批两条新缓存。

## 前端

`apps/web/src/schemas/mes/materialRequirement.ts` 原值集即为五值且默认 `draft`，无需改动。
