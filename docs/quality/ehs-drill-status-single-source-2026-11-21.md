# B51 · ehs.qa_ehs_drill_plans / qa_ehs_drill_records 状态单一源（2026-11-21）

## 现状（改动前）
- `ehs.qa_ehs_drill_plans`：本地 3 行，全部 `planned`；列默认 `'planned'`；无 CHECK。创建写死 planned，列表状态筛选接受任意字符串。
- `ehs.qa_ehs_drill_records`：本地 1 行，`in_progress`；列默认 `'in_progress'`；无 CHECK。创建写死 in_progress，列表筛选任意字符串，更新接受任意状态且不限制回退。
- 前端演练页使用 `scheduled/in_progress/completed`，其中 `scheduled` 与后端 `planned` 不一致，计划状态无法命中色板/文案。

## 改动
1. 新增 `svc/ehs/src/modules/drill_status.rs`：
   - `DrillPlanStatus`（planned/completed/cancelled，默认 planned）；
   - `DrillRecordStatus`（in_progress/completed/cancelled，默认 in_progress，completed/cancelled 终态不可回退）；
   - 附 2 单测。
2. `emergency_drill.rs`：
   - 计划创建状态绑定 `DEFAULT`；计划列表筛选严格解析，未知 400；
   - 记录创建绑定 `DEFAULT`；记录列表筛选严格解析，未知 400；
   - 记录更新状态严格解析，未知 400，加起始态谓词，阻止终态回退；
   - 行映射默认值改引用枚举。
3. 前端 `EhsDrillPage.tsx` 将 `scheduled` 改为 `planned`，与后端和 i18n「已计划」对齐。
4. 候选 DDL `docs/database/ehs-drill-status-check-candidates-2026-11-21.sql`：两个 CHECK，均 `NOT VALID`。

## 验证
- `cargo check -p topems-ehs`、`cargo clippy -p topems-ehs --all-targets -- -D warnings`、`cargo fmt --all` 干净。
- `cargo test -p topems-ehs --lib drill_status`：2 passed。
- 本地演练（事务内 ROLLBACK，残留 0）：plan planned → completed → cancelled 各 `UPDATE 1`，`scheduled` 23514；record in_progress → completed `UPDATE 1`，`planned` 23514。
- 盘点：枚举 161→163、值 163、不在 DB CHECK 124、色板缺口 0；映射 96→98；队列 113 不变。

## 残留
- 计划没有更新接口（`UpdateDrillPlanRequest` 定义存在但无路由），completed/cancelled 目前只能直接改库；补齐计划流转接口是后续独立事项。
- 记录更新仍是动态字符串拼接 SQL，JSON 字段（participants/attachments）按文本绑定到 jsonb 列的历史写法未动，真实写入需要在有数据环境验证一次。
- 计划列表仍支持 `drill_type` 筛选，记录表也有 `drill_type` 列，两处筛选保留。
- 候选 CHECK 未进 `database/migrations/`、未在生产执行。
