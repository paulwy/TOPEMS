# W5-B 状态枚举单一源：B1 DB 状态目录（2026-11-21）

## 1. 结论

DEC-09 原口径「以 DB CHECK 为唯一源」只覆盖了数据库里一部分状态列，不能直接支撑
「Rust 枚举 / 前端常量 / OpenAPI enum 三方一致」。先把 DB 侧事实固化成可复现目录，
再决定哪些状态集可以生成、哪些必须先由产品定义 FSM。

## 2. B1 生成物

- 脚本：`scripts/ci/dump-status-checks.mjs`
- 目录：`docs/database/status-check-catalog.json`
- 数据源：`pg_constraint` 中作用在 `status` / `state` 列上的 CHECK 约束
- 同时导出没有 CHECK 约束的 `status` / `state` 列，作为 B2 待确认清单
- 排序：`schema.table.constraint`，输出稳定，可直接逐字比对

实测（本地 `topems`，2026-11-21）：

- 状态 CHECK 约束 **215 条**，覆盖 **32 个 schema**
- 不同状态集 **28 种**
- 其中 `active, archived, inactive` 通用生命周期占 **187 条**
- WMS 仅 **5 条**状态 CHECK

## 3. 关键缺口

同一库中，`status` / `state` 列没有 CHECK 约束的有 **520 列**，按 schema 前几位：

`public 68 / ehs 44 / wms 41 / mes 37 / finance 33 / portal 29 / hrm 25 /
scm 24 / pm 22 / erp 21 / qms 21 / lims 20 ...`

也就是说：

- 通用主数据/生命周期状态大部分有 CHECK，且高度同质（active/inactive/archived）；
- 业务单据状态（入库/出库/盘点/工单/财务凭证等）多数没有 CHECK，状态集合由各模块
  FSM 与代码字面量维护，格式是自由文本；
- 直接把 DB CHECK 当唯一源，只能覆盖约三成状态列（215 / 735），且无法表达模块
  FSM 的迁移关系与初始态。

## 4. 使用方式

```bash
node scripts/ci/dump-status-checks.mjs --dsn 'postgres:///topems?host=/tmp'
node scripts/ci/dump-status-checks.mjs --dsn 'postgres:///topems?host=/tmp' --check
```

`--check` 与已提交目录逐字比对（215 条 CHECK + 520 个无 CHECK 列），漂移即非 0。当前未接入 hook：目录需要先固化，
且迁移演练库与开发库的 schema 版本可能不同，接入前要选定唯一比对库。

## 5. 下一步（B2/B3）

1. B2：按模块列出「有 CHECK 的通用状态」与「无 CHECK 的业务 FSM 状态」两张清单，
   业务 FSM 由产品/模块负责人确认状态集与迁移边；
2. B3：只对已确认的集合生成 OpenAPI `enum` 与前端常量，CI 比对生成物；
3. 不满足上述前提的模块保持现状并登记，不做机械合并。

本批不改 Rust 枚举、不改前端常量、不动 OpenAPI schema。
