# forecast_v53 合成数据：标记为不可信（2026-11-14）

## 结论

`forecast_v53` 的现金流预测与模型精度在**缺少真实历史凭证**时会用代码内生成的合成序列产出，
并把结果落库、对外返回。**这些数据属于合成数据，不可用于任何经营决策，也不得对外当作真实预测引用。**

本次处置只做"标记 + 服务层拒绝"，**不删除任何数据**；数据链路的彻底修复另立项。

## 取证（生产只读，2026-11-14）

| 项 | 事实 |
| --- | --- |
| 表全名 | `finance.finance_cash_flow_predictions_v53`（预测结果）<br>`finance.finance_prediction_models_v53`（模型精度）<br>`finance.finance_budget_variances_v53`（预算差异，非合成来源） |
| 生产行数 | 三张表均为 **0 行** |
| 数据怎么来的 | `svc/finance/src/modules/forecast_v53.rs`：`fetch_historical_data()` 查近 12 个月凭证，**结果为空时静默返回 `generate_synthetic_history()`**（500,000 起步 + 正弦季节项 + 正弦噪声，共 12 个月）；`predict()` 据此落预测行；`retrain_model()` 的 `compute_retrain_accuracy()` **无条件**用同一合成序列算精度；`get_accuracy()` 在无模型时返回硬编码 `overall_accuracy=0.85`、`sample_count=120` |
| 谁在读 | `svc/finance/src/modules/forecast_v53.rs` 自身（`get_predictions` / `get_accuracy`）；`apps/web` 与本仓库其他 crate **0 引用** |

## 本次变更

1. 迁移 `database/migrations/20261114190000_forecast_v53_mark_synthetic.sql`
   - 两张表新增 `is_synthetic boolean NOT NULL DEFAULT true`；
   - 既有行回填 `true`（来源不可考，不得冒充真实数据）；
   - 表注释与列注释写明"合成数据 / 不可用于决策"；
   - `finance_budget_variances_v53` 明确不在范围：其行来自请求传入的预算/实际数。
2. 服务层（同批提交）
   - 无真实历史时 `predict()` / `retrain_model()` 直接返回明确错误，不再生成合成行；
   - 写入预测/模型时显式 `is_synthetic = false`；
   - 读路径 `get_predictions()` / `get_accuracy()` 只返回 `is_synthetic = false` 的行（合成行表现为空集）；
   - 删除 `get_accuracy()` 硬编码 0.85 假精度兜底；`sample_count` 改为训练时记录的真实月数。
3. 回滚脚本 `database/rollback/20261114190000_forecast_v53_mark_synthetic.rollback.sql`
   - 只撤销标记（删列、清表注释）；代码侧缺陷修复不随回滚一起回退。

## 演练（本地 prod 克隆库 topems_group_drill_20261114）

- 迁移前插入 1 行"旧预测"+1 行"旧模型" → 应用迁移后两行均为 `is_synthetic = true`；
- 显式写入 `is_synthetic = false` 的新行可正常保留，读路径（`WHERE is_synthetic = false`）可见；
- 表注释落库为"含合成数据…不可用于决策"；
- 迁移重复执行两次通过；回滚后列与注释移除，再应用仍然通过。

## 另立项（本次不做）

- 历史真实凭证的接入与回填链路（当前 `vouchers`/`voucher_lines` 口径与 `entity_id` 的可用性）；
- 合成数据的清理与终态下线（本次不删数据）；
- `finance.finance_budget_variances_v53` 是否需要同类来源标记。
