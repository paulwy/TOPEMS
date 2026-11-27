# MES 产线写路径：车间引用同租户校验（B356）

## 1. 缺口

`mes.production_lines` 的车间引用已经由并行批次换成复合外键：

```
production_lines_workshop_tenant_fkey
  FOREIGN KEY (workshop_id, tenant_id) REFERENCES mes.workshops(id, tenant_id)
```

但写路径仍在裸绑定 `req.workshop_id`：

- `create_production_line`：`INSERT ... (code, name, workshop_id, ...) VALUES (..., $3, ...)`，`$3` 直接来自请求体。
- `update_production_line`：`workshop_id = COALESCE($3, workshop_id)`，同样是请求体原值。

后果与 B354 在工位/工单上修掉的一样：把本租户产线挂到别租户的车间时，DB 侧 `23503` 外键违例被统一包成 `500 产线创建失败 / 产线更新失败`，调用方看不到「跨租户」这层语义；而在 RLS 下这条产线后续 join 车间必然取不到，表现为车间凭空消失。

## 2. 修复

`svc/mes/src/modules/basics.rs` 的 `create_production_line`、`update_production_line` 在拿到确定租户后、执行 INSERT/UPDATE 之前，先调用 B354 已落地的公共校验：

```rust
crate::shared::workshop_ref::workshop_exists_in_tenant(&mut scope, workshop_id, tenant_id)
```

- `Ok(true)`：继续写。
- `Ok(false)`：`400 车间不存在或不属于当前租户`（不存在、跨租户、已软删三种情形同口径）。
- `Err(e)`：记日志 + `500`。

租户来源保持不变：创建走 `require_tenant(&claims, &headers)`（服务身份缺租户头一律 400），更新走 `require_write_tenant(&claims)`。校验复用请求级 RLS 事务的 `scope`，不额外开连接、不额外提交。

## 3. 影响面与数据

- 本机 `mes.production_lines` **0 行**（`select count(*)` = 0），零行为变更、无需回填。
- 只改写成两条 SQL 之前的守卫，不动列、不动约束、不动响应结构；`workshop_id` 为空时完全跳过校验，保持「产线可以不挂车间」的既有语义。
- 与 B354 的差异：B354 覆盖工位/生产工单，产线当时被漏掉；本批补齐同一张外键的另一半。

## 4. 验证

- `cargo test -p topems-mes --lib`：`432 passed; 0 failed`（`/tmp/b356test.log`）。
- `cargo clippy -p topems-mes --all-targets -- -D warnings`：见 `/tmp/b356clippy.log`。
- `cargo fmt -p topems-mes -- --check`：无差异。

## 5. 遗留

- `workshop_exists_in_tenant` 目前仍被 `work_station.rs`、`production_order.rs`、`basics.rs` 三处调用，实现已统一在 `shared/workshop_ref.rs`，此前 `basics.rs` 的私有副本已在 B352 收口，无重复实现。
- 产线 `code` 的租户内唯一仍未加约束（本机 0 行，具备直接加索引的条件，但需与 `20261127110000` 的幂等重建口径对齐后再排批）。
