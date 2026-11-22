# B175 · 供应商评价状态（2026-11-23）

## 枚举
- `svc/scm/src/modules/supplier_evaluation_status.rs` → `SupplierEvaluationStatus`：`draft / submitted / approved / completed`，默认 `draft`。
- 值集与前端 `apps/web/src/schemas/scm/evaluation.ts` 完全一致。

提供 `DB_VALUES / DEFAULT / as_db_str / from_db_str / 单测`。

## 代码收口
- 模型：`SupplierEvaluation` 新增 `status` 字段，所有查询与 `RETURNING` 投影补齐，前端终于能拿到状态。
- 列表：`SupplierEvaluationQueryParams` 新增 `status`，解析枚举后参与查询与计数；非法值返回 400。此前前端筛选参数被忽略。
- 创建：`CreateSupplierEvaluationRequest` 新增可选 `status`，未传时绑定 `DEFAULT`，`INSERT` 显式写状态列。
- 更新：`UpdateSupplierEvaluationRequest` 新增可选 `status`，解析后以 `COALESCE($11, status)` 落库；非法值返回 400。

## 本地 DB 应用
文件：`docs/database/supplier-evaluation-status-check-candidates-2026-11-23.sql`，约束 `NOT VALID`：

- `scm.supplier_evaluations.status` → `ck_scm_supplier_evaluations_status_standard`（四值）

表当前 0 行。构造 `status='bogus'` 的新插入，被该约束拦截，随后 `ROLLBACK`，未留下数据。

## 刷新结果
- catalog：**354 条状态 CHECK / 5 个 PG ENUM / 369 个无约束状态列**
- 盘点：**237 个 Rust 枚举 / 210 个值 / 59 个不在 DB CHECK / 220 个前端键 / 色板缺口 0**
- 缺口队列：**45 个枚举 / 59 个值，全部 `internal_state`**
- 前端键不在 DB CHECK：**69**
- 映射：共 **209 条**

## 门禁
- `cargo clippy -p topems-scm --lib --tests -- -D warnings`：PASS
- `cargo test -p topems-scm --lib`：357 passed / 0 failed
- catalog / inventory / queue 的 `--check`：PASS（`--strict-palette` 色板缺口 0）

## 边界
候选只应用到本地 `topems`；生产快照只读，未应用。生产发布需执行候选并按窗口 `VALIDATE`。`evaluation_no` 仍未进入响应模型，属独立缺口，本批未扩面。
