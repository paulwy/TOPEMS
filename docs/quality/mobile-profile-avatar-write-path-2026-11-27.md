# Mobile 资料/头像写路径：租户谓词 + 假成功 + 头像体积闸门（W5-B / B360）

- 日期：2026-11-27
- 范围：`svc/mobile/src/modules/user.rs`
- 基线：`main` @ `a870f963f`

## 缺口

上游 `f7c2aaf4e` 已把 mobile 的个人资料读写从 `iam.users` 迁到自有表 `mobile.mobile_users`（`tenant_id` 可空、有 `rls_tenant_isolation` 策略），但三条写路径仍留着旧写法的三个毛病：

| 位置 | 问题 |
| --- | --- |
| `update_profile`（`PUT /user/profile`） | SQL 只有 `WHERE id = $6`，无 `tenant_id` 谓词、无 `deleted_at IS NULL`；`Extension(_claims)` 未解析租户，超管上下文（`app.rls_system=on`）下 RLS 分支全放行 |
| `upload_avatar`（`POST /user/avatar`） | 同上缺租户谓词与软删过滤；且 `Ok(_)` 无条件返回 200——用户行不存在或被软删也会报「上传头像成功」，头像文件已落盘成孤儿 |
| `upload_avatar` 入参 | 手写 base64 解码对输入无上限，任意大 payload 直接全量展开成 `Vec<u8>`，内存放大无闸门 |

注：`user_id` 取自 JWT，攻击面主要在「超管/系统上下文 + 已删除用户」两类边界，不是任意越权改他人资料。

## 修复

1. `update_profile` / `upload_avatar` 均改为 `Extension(claims)`，进事务前 `tenant_filter(&claims)` 取非 nil 租户，缺失直接 `400 缺少租户上下文`（与 `document.rs` 的既有写法一致，不静默降级）。
2. 两条 `UPDATE mobile.mobile_users` 补 `AND tenant_id = $N::uuid AND deleted_at IS NULL`。
3. `upload_avatar` 的返回从 `Ok(_)` 改为 `Ok(r) if r.rows_affected() > 0`，否则 `404 用户不存在`——不再对不存在的行报成功。
4. 新增 `MAX_AVATAR_BYTES = 2 MiB` 与纯函数 `avatar_within_limit(len)`，解码后超过上限返回 `413 头像超过 2 MiB 上限`（先挡体积再落盘，避免孤儿文件）。

## 验证

- `cargo check -p topems-mobile`：`Finished`。
- `cargo test -p topems-mobile --lib`：见提交日志。
- 新增单测：`avatar_size_gate_rejects_empty_and_oversize`（0 / 1 / 上限 / 上限+1 四边界）、`base64_decode_roundtrip_hello`（合法串 / 空串 / 非法字符）。
- 本机 `mobile.mobile_users` 0 行，无真实数据回归面；`barcode_scans` / `devices` 等外键表同为空。

## 遗留

- `mobile_users_username_key UNIQUE (username)` 仍是**全局唯一**，不是 `(tenant_id, username)`：多租户同名工号会撞键。改唯一约束需迁移窗口，本批不动，登记待办。
- `get_profile` 仍是裸 `WHERE id = $1`（读自身资料，租户谓词留待读入口统一收口）。
- 头像未校验 MIME/魔数，扩展名固定 `.jpg`；仅体积受限，类型校验待后续批次。
