# 物料退库状态守卫（B180）

- 批次：W5-B / B180
- 日期：2026-11-23
- 列：`mes.material_returns.status`

## 唯一值源

`svc/mes/src/modules/material_bom/return_status.rs` 的 `MaterialReturnStatus`：

| 值 | 含义 |
| --- | --- |
| `pending` | 待审批（DB 默认，仅待审批可删除） |
| `approved` | 已批准 |
| `returned` | 已退库（首次进入该状态时写 return_time） |
| `cancelled` | 已取消 |

与前端 `apps/web/src/schemas/mes/materialReturn.ts` 四项一致。

## 入口绑定

- 列表 `status` 由枚举校验，`all` 与空值视为不过滤，非法值 400。
- 创建硬编码 `'pending'` 改为参数 `$4` 并绑定 `MaterialReturnStatus::DEFAULT`。
- 更新 `status` 由枚举校验后参数绑定，非法值 400。
- `return_time` 的触发条件从旧字面量 `'completed'` 改为参数 `$7` 绑定 `Returned`，修复了状态写 `completed` 但前端/枚举只有 `returned` 的漂移。
- 创建/更新 `query!` 改为运行期 `query_as` + `MaterialReturnRow`，避免 SQLx 离线缓存漂移。

## 数据库约束

- 约束名：`ck_mes_material_returns_status_standard`
- 定义：`CHECK (status = ANY (ARRAY['pending','approved','returned','cancelled'])) NOT VALID`
- 本地已应用 `docs/database/mes-material-return-status-check-candidates-2026-11-23.sql`。
- 表当前 0 行；构造 `status='bogus'` 插入被该约束拒绝后回滚。

## 前端

- `apps/web/src/utils/status.ts` 补 `returned` 色板。

## 门禁

- `cargo clippy -p topems-mes --lib --tests -- -D warnings`：通过
- `cargo test -p topems-mes --lib`：390 passed
- 生产快照只读，未应用本候选；发布前按窗口 `VALIDATE CONSTRAINT`。
