# B43 · ehs.qa_ehs_risks 状态单一源（2026-11-21）

## 现状（改动前）
- `ehs.qa_ehs_risks`：本地 361 行，`identified` 321 / `controlled` 39 / `assessed` 1；无 CHECK 约束；列默认 `'identified'`、可空。
- 后端所有状态均为字面量或请求透传：创建默认 `identified` 但接受任意 `status`；编辑 `COALESCE($11, status)` 接受任意串；评估接口把请求里的 `status` 原样写入，客户端传什么就落什么。
- 列表 `status` 过滤不做校验，非法值返回空列表，表现成“没有风险”。
- 评估接口对已 `controlled` 的风险仍可重复评估，且可把状态改回任意值。

## 改动
1. 新增 `svc/ehs/src/modules/risk_status.rs`：
   - `RiskStatus` 三值：identified / assessed / controlled；`DEFAULT = Identified`；
   - 评估起始态 `Identified | Assessed`（已控制不再评估）；
   - 编辑起始态按目标态白名单：identified ← identified；assessed ← identified/assessed；controlled ← identified/assessed/controlled（只允许向前，不允许回退）；
   - 严格解析 + 2 个单测。
2. `risk.rs`：
   - 列表 `status` 严格解析，未知 400；
   - 创建只接受 `identified`（未知 400），实际绑定 `DEFAULT`；
   - 编辑状态严格解析，未知 400，UPDATE 增加 `status = ANY($n)` 起始态谓词，0 行返回 409；
   - 评估接口不再透传请求 `status`，固定写 `Assessed`，并加 `identified|assessed` 起始态谓词，0 行返回 409；
   - 读取回退值统一为 `RiskStatus::DEFAULT.as_db_str()`。
3. `utils/status.ts`：补 identified / assessed / controlled 色板（此前盘点 3 个缺口）。
4. 候选 DDL `docs/database/ehs-risk-status-check-candidates-2026-11-21.sql`：`qa_ehs_risks_status_check`（三值，`NOT VALID`）。

## 验证
- `cargo check -p topems-ehs`、`cargo clippy -p topems-ehs --all-targets -- -D warnings`、`cargo fmt --all` 干净。
- `cargo test -p topems-ehs --lib risk_status`：2 passed。
- 本地演练（事务内 ROLLBACK，残留 0）：`identified` 插入 → `assessed` → `controlled` 各 `UPDATE 1`；`controlled → 'bogus'` → 23514；回滚后 `B43-DRILL` 行 0、约束 0。
- 盘点：枚举 152→153、值 160→163、不在 DB CHECK 121→124、色板缺口 3→0；前端键 175→178；队列 108→109 枚举 / 121→124 值；映射 87→88。

## 残留
- `controlled` 目前只有编辑接口可写入，没有独立“落实控制措施”动作端点；39 行历史 controlled 可能来自导入，语义需业务确认。
- 编辑接口按目标态放行，允许 identified 直接跳到 controlled（跳过评估）；是否需要强制先 assessed 需产品确认。
- 状态列可空：历史 NULL 行按 identified 处理，候选 CHECK 对 NULL 放行。
- 候选 CHECK 未进 `database/migrations/`、未在生产执行。
