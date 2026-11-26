# B351：费用报销（finance.expenses）支付专用动作 + 租户/终态收敛

日期：2026-11-26
范围：`svc/finance/src/modules/{operational.rs,expense_status.rs}`
迁移：无 DDL（`finance.expenses.status` 已有 `ck_expenses_status_standard` 五态，`tenant_id` 可空但单行 NULL）

## 一、问题

1. **`approved → paid` 只能借道通用 PUT。** `PUT /expenses/{id}` 同时接受 `amount`、`applicant_name`、`expense_type`、`expense_date` 等字段；终态守卫只在「同态或未传目标态」时生效，跨态流转（`approved` + `status=paid`）会整体放行，已审批金额可被顺手改写。
2. **列表与单条读没有租户谓词。** `list_expenses` / `get_expense` 只写 `deleted_at IS NULL`，安全完全押在 RLS 上：会话缺 `app.tenant_id` 时静默查空，RLS 被关或 `app.rls_system=on` 时跨租户可见。
3. 前端没有支付入口，`approved` 报销只能手工调接口（本批未做 UI，原因见 B350 文档）。

## 二、数据与约束事实（本机）

| 项 | 值 |
| --- | --- |
| `finance.expenses` 行数 | 3 |
| `tenant_id IS NULL` | 1 |
| `status` 分布 | 全部 `submitted` |
| 状态约束 | `ck_expenses_status_standard`：draft/submitted/approved/rejected/paid |
| RLS | `rls_tenant_isolation`：`app.rls_system='on'` 或 `tenant_id = app.tenant_id` |

`tenant_id` 为 NULL 的那 1 行在加显式谓词后不再出现在列表里（与 RLS 行为一致），需要业务确认归属后回填。

## 三、改动

### 支付专用动作

- 新增 `POST /expenses/{id}/pay`（`pay_expense`）：
  - 固定 `approved → paid`，`WHERE id AND tenant_id AND deleted_at IS NULL AND status='approved'`；
  - 命中 0 行返回 409「不存在、已删除或当前状态不允许支付」，不区分以免泄露跨租户存在性；
  - 只写 `status`、`reimbursed_at = COALESCE(reimbursed_at, now)`、`updated_at`，不碰金额与申请人；
  - 挂 `finance:expense:update` 组（`expenses_update` 子 Router）。

### 终态字段封闭

- `update_expense` 增加 `editing_fields` 判定：除 `status` 外任一字段出现（非 null）即视为字段改写；当前态 `approved`/`paid` 且携带字段改写 → 409「只允许状态流转，不可修改字段」。
- 原有「同态/无目标态」拦截保留，两层叠加。

### 租户收敛

- `list_expenses`：`try_tenant_id_from_claims`（缺租户 400，不回退平台租户），行查询与 COUNT 同步补 `tenant_id = $n::uuid`。
- `get_expense`：同样严格租户 + 谓词，跨租户 ID 返回 404。

### 测试

- `expense_status.rs` 新增 `paid_only_reachable_from_approved`：仅 `approved → paid` 合法，draft/submitted/rejected 直接支付全部报错；`paid` 不可回退、不可编辑、不可删除；`approved` 不可编辑。

## 四、验证

| 项 | 结果 |
| --- | --- |
| `cargo fmt -p topems-finance` | 无差异 |
| `cargo check -p topems-finance` | 通过 |
| `cargo test -p topems-finance --lib` | 1158 passed / 0 failed（新增 `paid_only_reachable_from_approved`） |
| `node scripts/ci/check-openapi-coverage.cjs` | PASS（新路由进 missing 白名单，属棘轮允许方向） |
| SQL/状态门禁 | 无 DDL，跳过迁移类门禁 |

## 五、剩余

1. 前端支付入口（行操作 + 确认弹窗）与报销入口一起，在可跑 `web-contract-smoke` 的环境统一补。
2. `finance.expenses` 的 1 行 `tenant_id IS NULL` 待回填，回填前该记录对任何租户不可见。
3. `finance.expenses` 无 `paid_at` 列，支付时间复用 `reimbursed_at`；如需独立列须走迁移窗口。
