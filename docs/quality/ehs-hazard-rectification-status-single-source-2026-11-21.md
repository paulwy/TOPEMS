# B52 · ehs.qa_ehs_hazard_rectifications 状态单一源（2026-11-21）

## 现状（改动前）
- `ehs.qa_ehs_hazard_rectifications`：本地 78 行，全部 `in_progress`；列默认 `'in_progress'`；无 CHECK。
- 创建时 SQL 写死 `'pending'`，而数据库默认和全部存量都是 `in_progress`，新建整改单与默认口径不一致。
- 更新接口从 JSON 取 status 后直接 `COALESCE($6, status)`，接受任意字符串、允许回退；0 行返回 404，无法区分不存在与状态不允许。
- 提交接口把该隐患下所有整改单直接改 `submitted`，没有起始态过滤；重复提交仍命中行并返回成功。

## 改动
1. 新增 `svc/ehs/src/modules/rectification_status.rs`：`RectificationStatus`（pending/in_progress/submitted，`DEFAULT = InProgress`，submitted 终态，只允许停留或前进），附 2 单测。
2. `hazard.rs`：
   - 创建整改单绑定 `DEFAULT`，与 DB 默认和存量对齐；
   - 更新状态严格解析，未知 400，加起始态谓词，0 行 404→409；
   - 提交状态绑定 `Submitted`，加 `pending/in_progress` 起始谓词，重复提交 404→409；
   - 行映射默认值改引用枚举。
3. 候选 DDL `docs/database/ehs-hazard-rectification-status-check-candidates-2026-11-21.sql`：三值 CHECK，`NOT VALID`。

## 验证
- `cargo check -p topems-ehs`、`cargo clippy -p topems-ehs --all-targets -- -D warnings`、`cargo fmt --all` 干净。
- `cargo test -p topems-ehs --lib rectification_status`：2 passed。
- 本地演练（事务内 ROLLBACK，残留 0）：pending → in_progress → submitted 各 `UPDATE 1`；`completed` → 23514。
- 盘点：枚举 163→164、值 163、不在 DB CHECK 124、色板缺口 0；映射 98→99；队列 113 不变。

## 残留
- 创建整改单的状态从 `pending` 改为 `in_progress`，与 DB 默认和历史数据一致；如果产品要求先 `pending` 再手动开始，需要另加开始动作。
- 更新接口 `started_at = COALESCE(started_at, now())` 仍在任意更新时补开始时间，未按状态精确控制。
- 提交动作按 `hazard_id` 批量更新该隐患下所有未提交整改单，一次提交多个；如果产品要求逐单提交，需要改成按整改单 id。
- 候选 CHECK 未进 `database/migrations/`、未在生产执行。
