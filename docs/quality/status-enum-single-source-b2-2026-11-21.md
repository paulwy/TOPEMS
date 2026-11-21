# W5-B 状态枚举单一源：B2 代码侧盘点（2026-11-21）

## 1. 结论

B2 把代码侧手写状态源盘成了可复现清单：Rust 125 个 `*Status` 枚举、142 个归一化
值；前端 `STATUS_COLOR_MAP` 61 个键。对照 B1 的 DB CHECK 值并集（39 个值）：

- Rust 有 **113 个状态值**不在任何 DB CHECK 内；
- 前端有 **38 个状态键**不在任何 DB CHECK 内；
- 不是少量漏配，而是业务 FSM 状态整体没有进 DB 约束。

审计文档中的 108/113 是 `#[ignore]` 测试统计；本盘点恰好也得到 113 个未覆盖状态值，
两者数字相同但含义不同，不能互相替代。

## 2. 生成物

- 脚本：`scripts/ci/dump-status-code-inventory.mjs`
- 清单：`docs/database/status-code-inventory.json`
- 输入：`docs/database/status-check-catalog.json`
- 支持 `--check` 逐字比对，代码新增/删除状态枚举后可直接发现盘点过期

清单字段：

- `enums[]`：模块、文件、枚举名、原始值、归一化值；
- `frontend.keys[]`：前端状态色板的全部键；
- `not_in_db_check`：未进入 DB CHECK 的 Rust 值 / 前端键；
- `stats`：上述计数。

## 3. 模块分布

Rust 枚举值数量前几位：

`erp 11 个枚举 / 47 值`、`finance 23 / 46`、`portal 32 / 45`、
`master-data 16 / 39`、`lib/shared-event 5 / 17`、`ai 6 / 17`。

WMS 没有任何 `*Status` 枚举，只有 41 个无 CHECK 的 `status` / `state` 列，状态值全部
是 SQL 字面量，进一步说明“DB CHECK + Rust 枚举 + 前端常量”三方模型不成立。

## 4. B3 试点选择

按“枚举最多、状态值最集中、可独立闭环”排序，B3 先做 **finance**：

1. 把 23 个 finance 枚举与 DB 列建立显式映射；
2. 对已确认的业务状态补 DB CHECK（或确认该列不需要 CHECK）；
3. 只对映射完成的枚举生成 OpenAPI `enum` 与前端常量；
4. 其余模块按同一模板推进，不做一次性机械合并。

本批仍不改 Rust 枚举、不改前端常量、不动 OpenAPI schema。
