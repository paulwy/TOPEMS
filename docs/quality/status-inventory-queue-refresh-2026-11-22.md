# B151 · 状态盘点与缺口队列重算

日期：2026-11-22

## 背景

B150 刷新了 DB 状态 CHECK 目录（215→270 条），但 `status-code-inventory.json` 与 `status-db-check-queue-*.json` 仍是刷新前快照。重新执行门禁后，盘点 `--check` 报不一致；B150 证据里「盘点维持 152 个不在 DB CHECK」的读数是过期值，本批纠正。

## 重算结果

- 盘点：208 个 Rust 枚举 / 191 值 / **92 值不在 DB CHECK** / 206 前端键；Rust 色板缺口 0；前端键 106 个不在 DB CHECK。
- 队列：79 枚举 / 92 值；
  - `internal_state`：40 枚举 / 58 值
  - `api_projection`：25 枚举 / 11 值
  - `persisted_unmapped`：41 枚举 / 23 值
  - `resolved_enums=79`
- 相比 B150 前快照：不在 DB CHECK 的值 152→92，已核销 60 个值；剩余以内部状态、API 投影和少量未落地候选为主。

## 门禁

- `node scripts/ci/dump-status-code-inventory.mjs --check --strict-palette` PASS。
- `node scripts/ci/status-db-check-queue.mjs --check` PASS。
- `node scripts/ci/dump-status-checks.mjs --check` PASS（270 条 CHECK / 5 ENUM / 452 无约束列）。
- 本批只重算两份快照，无代码或数据库变更；生产快照仍只读未应用。

## 后续

`persisted_unmapped` 中仍有 ERP 公告、Master Data 多表、Mobile 推送、SRM 招标/询价等旧候选未真正落库；这些不是本轮重算能消除的，需继续按候选逐表应用。
