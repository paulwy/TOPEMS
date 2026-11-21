# W5-B 状态枚举单一源：B2 代码侧盘点（2026-11-21）

## 1. 结论

B2 把代码侧手写状态源盘成了可复现清单：Rust 135 个 `*Status` 枚举（B8/B9/B10 新增付款、核销、对账中心三组）、146 个归一化
值；前端 `STATUS_COLOR_MAP` 61 个键。对照 B1 的 DB 状态值并集（CHECK + 5 个
ENUM 类型，共 47 个值）：

- Rust 有 **108 个状态值**不在任何 DB 约束内；
- 前端有 **35 个状态键**不在任何 DB 约束内；
- 不是少量漏配，而是业务 FSM 状态整体没有进 DB 约束。

审计文档中的 108/113 是 `#[ignore]` 测试统计，与状态枚举无关。

## 2. 生成物

- 脚本：`scripts/ci/dump-status-code-inventory.mjs`
- 清单：`docs/database/status-code-inventory.json`
- 输入：`docs/database/status-check-catalog.json`
- 支持 `--check` 逐字比对，代码新增/删除状态枚举后可直接发现盘点过期

清单字段：

- `enums[]`：模块、文件、枚举名、原始值、归一化值；
- `frontend.keys[]`：前端状态色板的全部键；
- `not_in_db_check`：未进入 DB 约束（CHECK 或 ENUM）的 Rust 值 / 前端键；
- `stats`：上述计数。

## 3. 模块分布

Rust 枚举值数量前几位：

`erp 11 个枚举 / 47 值`、`finance 22 / 46`、`portal 32 / 45`、
`master-data 16 / 39`、`lib/shared-event 5 / 17`、`ai 6 / 17`。

WMS 没有任何 `*Status` 枚举，只有 41 个无 CHECK 的 `status` / `state` 列，状态值全部
是 SQL 字面量，进一步说明“DB CHECK + Rust 枚举 + 前端常量”三方模型不成立。

## 4. B3 试点选择

按“枚举最多、状态值最集中、可独立闭环”排序，B3 先做 **finance**：

0. 先处理 5 个 PostgreSQL ENUM 状态列（`core_finance_vouchers`、`core_finance_periods`、
   `core_finance_reconciliation_items`、`core_finance_reconciliation_sessions`、
   `core_finance_approval_workflows`）；这 5 列已有 DB 单一源，是成本最低的试点；
1. 再把 22 个 finance 枚举与剩余 27 个无约束状态列建立显式映射；
2. 对已确认的业务状态补 DB CHECK（或确认该列不需要 CHECK）；
3. 只对映射完成的枚举生成 OpenAPI `enum` 与前端常量；
4. 其余模块按同一模板推进，不做一次性机械合并。

本批仍不改 Rust 枚举、不改前端常量、不动 OpenAPI schema。
