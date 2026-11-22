# B173 · 供应商送货预约状态（2026-11-23）

## 枚举
- `svc/scm/src/modules/delivery_appointment_status.rs` → `DeliveryAppointmentStatus`：`pending / approved / rejected / arrived / completed / cancelled`，默认 `pending`。
- 值集与前端 `apps/web/src/schemas/scm/deliveryAppointment.ts` 完全一致。

提供 `DB_VALUES / DEFAULT / as_db_str / from_db_str / 单测`。

## 代码收口
- 列表：`status` 参数先解析枚举，非法值返回 400；列表与计数共用规范化绑定。
- 创建：`INSERT` 的 `'pending'` 改为绑定 `DeliveryAppointmentStatus::DEFAULT`。
- 更新：`req.status` 或存量状态都先解析枚举，非法值返回 400，不再原样透传。
- 状态流转：审批通过、驳回、到货确认、完成、取消五处 `SET status = '...'` 全部参数绑定。

## 本地 DB 应用
文件：`docs/database/delivery-appointment-status-check-candidates-2026-11-23.sql`，约束 `NOT VALID`：

- `scm.supplier_delivery_appointments.status` → `ck_scm_supplier_delivery_appointments_status_standard`（六值）

存量 1 行：1 `completed`，合规。对存量行执行 `status='bogus'` 的 UPDATE 被标准约束拦截，随后 `ROLLBACK`。

## 刷新结果
- catalog：**352 条状态 CHECK / 5 个 PG ENUM / 371 个无约束状态列**
- 盘点：**235 个 Rust 枚举 / 210 个值 / 59 个不在 DB CHECK / 220 个前端键 / 色板缺口 0**
- 缺口队列：**45 个枚举 / 59 个值，全部 `internal_state`**
- 前端键不在 DB CHECK：**69**
- 映射：共 **207 条**

## 门禁
- `cargo clippy -p topems-scm --lib --tests -- -D warnings`：PASS
- `cargo test -p topems-scm --lib`：353 passed / 0 failed
- catalog / inventory / queue 的 `--check`：PASS（`--strict-palette` 色板缺口 0）

## 边界
候选只应用到本地 `topems`；生产快照只读，未应用。生产发布需执行候选并按窗口 `VALIDATE`。
