# B206 · HRM 绩效双列护栏证据（2026-11-23）

## 范围

| 表 | 列 | 类型 | 默认 |
| --- | --- | --- | --- |
| `hrm.performance_reviews` | `status` | varchar(20) NOT NULL | `draft` |
| `hrm.performance_goals` | `status` | varchar(20) NOT NULL | `pending` |

- 代码：`svc/hrm/src/modules/performance.rs`
- 枚举：`svc/hrm/src/modules/performance_status.rs`（新增，两个枚举）
- 本地数据：两表均 0 行

## 值集

- **PerformanceReviewStatus**（8 值，默认 `draft`）：
  `draft / pending / submitted / approved / self_reviewed / manager_reviewed / completed / archived`
  - 前端 `apps/web/src/schemas/hrm/performance.ts` 给出 pending / self_reviewed /
    manager_reviewed / completed / archived；
  - 后端 `submit_review` 写 `submitted`、`approve_review` 写 `approved`，创建态与删除守卫用 `draft`。
  - 两套词表当前各走一条链路（前端展示态 vs 后端审批流），本批**只做值域护栏**，
    统一口径留作后续专项；届时删变体并收窄约束即可（两表无数据，无迁移成本）。
- **PerformanceGoalStatus**（4 值，默认 `pending`）：`pending / in_progress / completed / cancelled`。

## 修掉的缺陷

1. **评核更新自由串**：`update_review` 的 `status = COALESCE($2, status)` 原样绑定
   `req.status`，任意字符串可落库。现校验后绑定，非法 400，空串/缺省视为不变。
2. **目标更新自由串**：`update_goal` 的 `COALESCE($6, status)` 同样透传，现同样校验。
3. **两个列表过滤静默查空**：评核/目标列表都用 `params.status` 原样绑定，
   非法值查空、空串当真实值。现 `parse_filter`：空/`all` 不过滤，未知值 400。
4. **状态机字面量**：
   - 评核创建 `'draft'`、提交 `SET status='submitted' WHERE status='draft'`、
     批准 `SET status='approved' WHERE status='submitted'`、删除守卫 `status='draft'`；
   - 目标创建 `'pending'`。
   全部改为参数绑定 + 枚举常量，禁止绕过状态机写任意跳转。
5. **响应出口**：两个列表（含 `/employees/{id}/performance-*` 两个员工维度接口）、
   两个创建、两个详情、两个更新、提交、批准共 13 处出口统一经
   `normalize_review` / `normalize_goal`。

## 本地验证

```sql
ALTER TABLE hrm.performance_reviews ADD CONSTRAINT ck_hrm_performance_reviews_status_standard
  CHECK (status IN ('draft','pending','submitted','approved','self_reviewed','manager_reviewed','completed','archived')) NOT VALID;
ALTER TABLE hrm.performance_goals ADD CONSTRAINT ck_hrm_performance_goals_status_standard
  CHECK (status IN ('pending','in_progress','completed','cancelled')) NOT VALID;
```

- 两条均执行成功，`convalidated = f`。
- 负向验证：`INSERT hrm.performance_goals ... status='bogus'` 被
  `ck_hrm_performance_goals_status_standard` 拒绝，事务回滚，表仍 0 行。
- 生产快照 `topems_prod_verify_20261106` 未应用。

## 附带修正

`apps/web/src/utils/status.ts` 补 `self_reviewed`（info）/ `manager_reviewed`（warning），
与前端 `performance.ts` 的 `colorMap` 语义一致；前端键 241 → 243，色板缺口 0。

## 刷新与门禁

- catalog：**393 条状态 CHECK / 5 个 PG ENUM / 330 个无约束列**
- 盘点：**276 个 Rust 枚举 / 234 值 / 57 不在 DB CHECK / 243 前端键 / 色板缺口 0**
- 缺口队列：**44 枚举 / 57 值，全部 internal_state**
- 前端键不在 DB CHECK：**66**
- 映射新增 2 条：`performance.rs#PerformanceReviewStatus` / `#PerformanceGoalStatus`

## 已知取舍

评核状态是 8 值并集，语义偏宽。真正的收敛动作是「把后端 submit/approve 的
submitted/approved 映射到前端的 self_reviewed/manager_reviewed」，属于业务流程改造，
不在本次状态列治理范围内；本批先把自由串堵死，保证任何新写入都落在已知值域。
