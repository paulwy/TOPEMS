# B53 · ehs.qa_ehs_risk_controls 状态单一源（2026-11-21）

## 现状（改动前）
- `ehs.qa_ehs_risk_controls`：本地 2 行，`active` 1 / `completed` 1；列可空，DB 默认 `'active'`；无 CHECK。
- 创建接口 SQL 写死 `'active'`，行映射缺值 fallback 也是字面量 `"active"`。
- 更新接口 `status = COALESCE($6, status)` 接受任意字符串、允许 completed 回退 active；0 行返回 404，无法区分不存在与状态不允许。
- `measure_type` 也是自由文本，但本批只收敛 status。

## 改动
1. 新增 `svc/ehs/src/modules/risk_control_status.rs`：`RiskControlStatus`（active/completed，`DEFAULT = Active`，completed 终态，只允许停留或前进），附 2 单测。
2. `risk.rs`：
   - 创建状态由字面量 `'active'` 改绑 `DEFAULT`；
   - 列表/创建返回的行映射 fallback 改引用枚举；
   - 更新状态严格解析，未知 400；加起始态谓词，completed → active 不再命中；
   - 0 行 404→409。
3. 候选 DDL `docs/database/ehs-risk-control-status-check-candidates-2026-11-21.sql`：两值 CHECK，`NOT VALID`。

## 验证
- `cargo check -p topems-ehs`、`cargo clippy -p topems-ehs --all-targets -- -D warnings`、`cargo fmt --all` 干净。
- `cargo test -p topems-ehs --lib risk_control_status`：2 passed。
- 本地演练（事务内 ROLLBACK，残留 0）：active → completed `UPDATE 1`；completed 自身 `UPDATE 1`；`closed` → 23514；completed → active 带起始态谓词 `UPDATE 0`。

## 残留
- `measure_type` 仍为自由文本（已有 engineering 等值），需要产品给出值集后再做下一批。
- 创建接口对 `title` 缺省写「未命名措施」，未做必填校验。
- 列表无状态筛选参数；如前端需要按 active/completed 过滤，需要另加严格解析的 query 参数。
- 候选 CHECK 未进 `database/migrations/`、未在生产执行。
