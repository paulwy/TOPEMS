# B174 · 来料检验状态（2026-11-23）

## 枚举
- `svc/scm/src/modules/incoming_inspection_status.rs` → `IncomingInspectionStatus`：`pending / passed / failed`，默认 `pending`。
- 值集与前端 `apps/web/src/schemas/scm/incomingInspection.ts` 完全一致。

提供 `DB_VALUES / DEFAULT / as_db_str / from_db_str / 单测`。

## 代码收口
- 列表：`status` 参数先解析枚举，非法值返回 400；列表与计数共用规范化绑定。
- 创建：`INSERT` 的 `'pending'` 改为绑定 `IncomingInspectionStatus::DEFAULT`。
- 更新：`UpdateInspectionRequest` 新增可选 `status`，解析后以 `COALESCE($8, status)` 落库，非法值返回 400；此前该接口完全不处理状态。
- 状态流转：检验合格、检验不合格两处 `SET status = '...'` 改为参数绑定，分别绑定 `passed / failed`。

## 本地 DB 应用
文件：`docs/database/incoming-inspection-status-check-candidates-2026-11-23.sql`，约束 `NOT VALID`：

- `scm.incoming_inspections.status` → `ck_scm_incoming_inspections_status_standard`（三值）

表当前 0 行。构造 `status='bogus'` 的新插入，被该约束拦截，随后 `ROLLBACK`，未留下数据。

## 刷新结果
- catalog：**353 条状态 CHECK / 5 个 PG ENUM / 370 个无约束状态列**
- 盘点：**236 个 Rust 枚举 / 210 个值 / 59 个不在 DB CHECK / 220 个前端键 / 色板缺口 0**
- 缺口队列：**45 个枚举 / 59 个值，全部 `internal_state`**
- 前端键不在 DB CHECK：**69**
- 映射：共 **208 条**

## 门禁
- `cargo clippy -p topems-scm --lib --tests -- -D warnings`：PASS
- `cargo test -p topems-scm --lib`：355 passed / 0 failed
- catalog / inventory / queue 的 `--check`：PASS（`--strict-palette` 色板缺口 0）

## 边界
候选只应用到本地 `topems`；生产快照只读，未应用。生产发布需执行候选并按窗口 `VALIDATE`。`inspection_result` 是独立列，本批未纳入约束。
