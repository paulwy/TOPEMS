# B282 MES 物料需求状态写入口守卫（2026-11-25）

## 结论

`mes.material_requirements.status` 已有五态 CHECK（draft/confirmed/released/completed/cancelled）和 `MaterialRequirementStatus` 枚举，但三个真实写入口都只校验“目标值是否合法”，没有校验“当前态能否到目标态”，也没有并发来源态谓词：

- `PUT /material-requirements/{id}`：`COALESCE($5, status)` 可把 completed/cancelled 回退到 draft，或从 draft 直接跳到 completed。
- `PUT /material-requirements/{id}/confirm`：无条件 `SET status='confirmed'`，released/completed 也会被改回 confirmed。
- `PUT /material-requirements/{id}/release`：无条件 `SET status='released'`，draft 可跳过确认直接下发。

本批补齐线性状态机、当前态预读与 `AND status=当前态` 条件，并把历史可空状态列收紧为 `NOT NULL`。

## 状态机

唯一源：`svc/mes/src/modules/material_requirement_status.rs::MaterialRequirementStatus`。

```
draft → confirmed → released → completed
  └────────┴──────────┴──→ cancelled
```

- `draft → confirmed | cancelled`
- `confirmed → released | cancelled`
- `released → completed | cancelled`
- `completed / cancelled` 为终态
- 同态幂等（重复 confirm/release 返回成功，不重复写业务时间）

## 代码改动

- `MaterialRequirementStatus` 新增 `can_transition_to`，非法流转返回中文错误信息；新增线性状态机单测。
- 新增 `load_requirement_status`：按 id 预读当前态，区分 `NotFound`、`Corrupt`（NULL/非法值）、`Db`。
- `update_material_requirement`：
  - 解析目标状态后先读当前态；
  - 目标与当前态不同时走 `can_transition_to`，非法 400；
  - UPDATE 增加 `AND status = $8 AND deleted_at IS NULL`，空行 409。
- `confirm_requirement`：目标固定 `confirmed`，先读当前态并校验；UPDATE 增加 `AND status = $3 AND deleted_at IS NULL`，空行 409。
- `release_requirement`：目标固定 `released`，先读当前态并校验；UPDATE 增加 `AND status = $3 AND deleted_at IS NULL`，空行 409。
- 空行判定从 `fetch_one + RowNotFound→404` 改为 `fetch_optional + None→409`，避免并发下把冲突误报为不存在。

## 数据库迁移

`database/migrations/20261125011000_mes_material_requirement_status_standard.sql`

- `status` 默认统一为 `draft`；
- NULL 归 `draft`（带 destructive-gate 标记，回看窗口 12 行内）；
- `SET NOT NULL`；
- 五态 CHECK 沿用既有 `ck_mes_material_requirements_status_standard`，不重复创建。

回滚：`database/rollback/20261125011000_mes_material_requirement_status_standard.rollback.sql` 仅恢复可空。

## 本地验证

- 迁移应用：`UPDATE 0`，随后 `status` 为 `NO / 'draft'::character varying`，既有 CHECK `convalidated = true`。
- `cargo test -p topems-mes material_requirement_status --lib`：3 passed。
- `cargo check -p topems-mes`：通过（离线缓存已补 3 条新查询元数据）。
- 迁移校验：`bash scripts/migration/validate.sh` 连续两次 0 errors。

## 残留

- 该表当前 0 行，迁移的 NULL 回填未触达真实数据；后续如出现历史行，需按 `status IS NULL` 复查。
- `completed` / `cancelled` 目前没有独立业务端点，统一通过通用 update 触发；若后续新增完成/取消接口，复用同一 `can_transition_to` 即可。
