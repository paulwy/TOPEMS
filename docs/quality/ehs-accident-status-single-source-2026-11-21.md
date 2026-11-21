# B44 · ehs.qa_ehs_accidents 状态单一源（2026-11-21）

## 现状（改动前）
- `ehs.qa_ehs_accidents`：本地 48 行全部 `reported`，无 CHECK；列默认 `'reported'`。
- 后端只有两处写状态：上报写死 `"reported"`、结案 SQL 写死 `'closed'`；列表 `status` 过滤接受任意串，非法值静默空列表；结案没有起始态谓词，重复结案仍返回成功。
- 前端 `schemas/ehs/accident.ts` 状态选项是「调查中 / 处理中 / 已结案 / 已归档」四个**中文值**，后端只存 reported/closed，表单提交的状态永远匹配不上；色板与 labelMap 也用同一组中文键。
- 另有遗留表 `ehs.safety_incidents`（161 行 reported，列默认 pending，代码零引用），不属于本批收口范围。

## 改动
1. 新增 `svc/ehs/src/modules/accident_status.rs`：`AccidentStatus`（reported/closed，`DEFAULT = Reported`，`close_from = [reported]`），严格解析 + 2 单测。
2. `accident.rs`：列表 `status` 严格解析（未知 400）；上报绑定 `DEFAULT`；结案改绑 `Closed` 并加 `status = ANY($n)` 起始谓词，0 行返回 409；读取回退值统一枚举默认。
3. 前端 `schemas/ehs/accident.ts`：状态值从中文收敛为 `reported` / `closed`，默认 `reported`，色板与标签同步；新增 `ehs.accident.k80`（已上报 / Reported）。
4. 候选 DDL `docs/database/ehs-accident-status-check-candidates-2026-11-21.sql`：`qa_ehs_accidents_status_check`（两值，`NOT VALID`）。

## 验证
- `cargo check -p topems-ehs`、`cargo clippy -p topems-ehs --all-targets -- -D warnings`、`cargo fmt --all` 干净。
- `cargo test -p topems-ehs --lib accident_status`：2 passed。
- 本地演练（事务内 ROLLBACK，残留 0）：insert reported → closed `UPDATE 1`；`closed → 'pending'` → 23514；回滚后 `B44-DRILL` 行 0、约束 0。
- 盘点：枚举 153→154、值 163（reported/closed 已存在）、不在 DB CHECK 124、色板缺口 0；队列 109→110 枚举；映射 88→89。

## 残留
- 前端原有「调查中 / 处理中 / 已归档」展示态被移除；这些语义实际来自调查、处理子资源，若产品需要事故主状态承载，需要后端先扩枚举与迁移。
- `ehs.safety_incidents` 161 行是零引用遗留表，建议下一批确认删表或接线。
- 候选 CHECK 未进 `database/migrations/`、未在生产执行。
