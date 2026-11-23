# 物料 BOM 状态守卫（B179）

- 批次：W5-B / B179
- 日期：2026-11-23
- 列：`mes.material_boms.status`

## 唯一值源

`svc/mes/src/modules/material_bom/bom_status.rs` 的 `BomStatus`：

| 值 | 含义 |
| --- | --- |
| `draft` | 草稿（DB 默认，仅草稿可删除） |
| `active` | 生效 |
| `inactive` | 停用 |
| `obsolete` | 已废弃（旧料号仍只读保留） |

与前端 `apps/web/src/schemas/mes/materialBom.ts` 四项一致。

## 入口绑定

- 列表 `status` 由枚举校验，`all` 与空值视为不过滤，非法值 400。
- 创建 BOM 的硬编码 `'draft'` 改为参数 `$6` 并绑定 `BomStatus::DEFAULT`。
- 更新 `status` 由枚举校验后参数绑定，非法值 400。
- 创建/更新的 `sqlx::query!` 改为运行期 `query_as`，避免离线缓存漂移；新增 `MaterialBomRow` 映射行。

## 前端

- `materialBom.ts` 新建默认值从 `active` 改为 `draft`，与 DB 默认及创建行为一致。
- `apps/web/src/utils/status.ts` 补 `obsolete` 色板。

## 数据库约束

- 约束名：`ck_mes_material_boms_status_standard`
- 定义：`CHECK (status = ANY (ARRAY['draft','active','inactive','obsolete'])) NOT VALID`
- 本地已应用 `docs/database/mes-bom-status-check-candidates-2026-11-23.sql`。
- 表当前 0 行；构造 `status='bogus'` 插入被该约束拒绝后回滚。

## 门禁

- `cargo clippy -p topems-mes --lib --tests -- -D warnings`：通过
- `cargo test -p topems-mes --lib`：388 passed
- 生产快照只读，未应用本候选；发布前按窗口 `VALIDATE CONSTRAINT`。
