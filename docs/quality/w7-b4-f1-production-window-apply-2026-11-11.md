# W7-B4-F1 生产窗口执行报告（2026-11-11）

> 授权：跨会话整段放行（四硬门槛全过后直接开窗）。
> 目标：`public.core_tenant_users` 登录链路 RLS fail-closed（方案 A）+ 作用域写路径修复。
> 主机：`xingzhai@192.168.110.115`，库 `topems_prod`，服务 `com.topems.server`（`gui/501`，:8099）。
> 证据目录：[backups/f1_prod_window_20261111](file:///Users/air/TOPEMS/backups/f1_prod_window_20261111)（不入库）。

---

## 0. 结论

**窗口执行完成，全部验收通过，服务已恢复。**

| 项 | 结果 |
|---|---|
| 迁移 | ✅ `20261112100000` 已应用，3 条 NOTICE 全过，账本 `max(version)=20261112100000` |
| 策略 | ✅ `core_tenant_users` 仅 1 条严格策略；零 `USING(true)`/`WITH CHECK(true)`；零 `IS NULL` 放行 |
| 登录冒烟 | ✅ 超管 `admin`、非超户 `tenant_admin` 均登录成功；JWT `tenant_id=…0001` |
| 五入口（非超户） | ✅ 列表 200 / 建用户 201 / 授权 200 / 自助改密 200 + 新密重登 / 删除 200 + 列表消失 |
| 建角色（非超户） | ✅ 200，落库 `tenant_id=…0001`，列表可见；验收后已软删清理 |
| 全局行监控 | ✅ `iam_global_rows{core_roles}=16`、`{core_tenants}=1` 已上报 |
| 停机时长 | 首次上线停写 20:30:59 → 恢复 20:33:25（**2 分 26 秒**）；最终换二进制 21:02:2x 约 10 秒 |

---

## 1. 四硬门槛

1. **提交并推送、工作树干净** ✅
   - `26bf3bd31` `fix(iam): 登录链路与角色写路径改租户作用域，membership 查询 fail-closed`
   - `c40374658` `chore(db): F1 core_tenant_users 严格 RLS 迁移、回滚与校验和`
   - `0076e38e8` `docs(quality): 归档 B4/B5/WS 冻结文档与回滚预置 SQL`
   - `c58038e7f` `fix(server): 单体模式启动 IAM 全局行监控`
   - `3f7d29ad8` `fix(iam): 租户读路径可见并授予全局角色`
   - 4.6MB `docs/quality/prod_schema_live_20261109.json` 超 1MB 门禁，移至 `backups/schema_snapshots/` 留存。
2. **二进制三件套** ✅（HEAD `3f7d29ad8057e6fd3962e1fc57895e0ff0948752`，提交 20:37:15；构建开始 20:43:47；mtime 20:59:02）
   - sha256 `307fc6beb4692408b11486cda7456113d0014a751f312170262d9ce2f55a0daf`
   - 断言：构建开始与 mtime 均晚于提交（`backups/f1_rehearsal_20261111/32_binary_final_head_3f7d29a.txt`）。
3. **副本补验全绿** ✅（最终二进制，`backups/f1_rehearsal_20261111/34c–37`）
   - 非超户建角色 200、落库 T1；T1 列表 21（16 全局 + 5 租户）；T2 列表 16（仅全局，看不到 T1 角色）；详情 T1 200 / T2 404。
   - 矩阵：系统通道 15 行、T1 11 / 看不到 T2、T2 4 / 看不到 T1、裸池 0 行、裸池 INSERT 42501。
   - 五入口 HTTP 全过；软删 membership 不参与；`iam_global_rows` 16 / 2。
4. **`create_role` 已修** ✅ 副本与生产均验证 200 且租户正确。

---

## 2. 窗口时间线

| 时间 | 步骤 | 证据 |
|---|---|---|
| 20:30:59 | `launchctl bootout` 停止服务，:8099 释放 | `02_stop_service.log` |
| 20:31:07 | 超户（`xingzhai`）`pg_dump -Fc` 全库备份，4.7MB；本地/远端 sha256 一致 | `04_backup.log` |
| 20:31:29 | 正向迁移（`apply-forward.sh --prod --anchor 20261112095000 --only 20261112100000`），3 条 NOTICE | `06_apply_migration.log`、`06b_migration_notice.log` |
| 20:31:4x | 新二进制上传、sha256 校验、旧二进制备份 `.bak_f1_20261111` | `08_upload_binary.log`、`09_swap_binary.log` |
| 20:33:25 | `bootstrap` 启动，health 200 | `10_start_service.log` |
| 20:33:3x | 首轮验收：五入口中「授权」失败（生产 16 角色全是全局角色，租户列表为空） | `11_acceptance.log` |
| 20:37–20:59 | 修复 `list_roles` / `get_role` / `check_role_target`（全局行对租户可见、可授予），重建二进制 | 提交 `3f7d29ad8` |
| 21:02:2x | 二次换二进制（约 10 秒），health 200 | `13_swap_binary_v2.log` |
| 21:02:31 | 生产验收全绿 | `14_acceptance_v2.log` |
| 21:02:45 | POST `pg_policies` + fail-open 扫描 | `17_post_policies.log` |

> **顺序说明**：实际为「迁移 → 换二进制 → 验收」。严格策略下旧二进制裸池写路径必然 42501，先换二进制才能做非超户验收；停写窗口内无外部流量，风险等价。

---

## 3. 策略前后对照

| 表 | BEFORE | AFTER | `IS NULL` 放行 |
|---|---|---|---|
| `core_tenant_users` | `tenant_isolation_core_tenant_users`（GUC 未设为 fail-open，且含 `IS NULL`） | `rls_tenant_isolation`（`rls_system='on' OR tenant_id=GUC`） | 无 |
| `core_roles` | `rls_global_read` + `rls_tenant_isolation` | 不变 | 仅 `tenant_id IS NULL` 全局角色可读（产品语义） |
| `core_tenants` | `rls_global_read` + `rls_system_only` | 不变 | 仅 `tenant_id IS NULL` 全局租户目录可读（产品语义） |
| `core_sessions` / `core_refresh_tokens` | `rls_system_only` | 不变 | 无 |

- 5 张表均 `ENABLE + FORCE ROW LEVEL SECURITY`。
- fail-open 扫描：7 条策略全部 `using_true=f`、`check_true=f`。
- `core_tenant_users` 断言：`policy_count=1`、`with_is_null=0`、`with_system_branch=1`。
- 全局行保留但只经系统通道写入：`create_tenant` / `onboard` 两处已带 `// tenant-system:` 登记；监控见 §5。

---

## 4. 验收明细（生产，最终二进制）

```text
admin login: ok code=0
tenant_admin login: ok code=0  JWT tenant_id=00000000-0000-0000-0000-000000000001 is_superuser=false
① 用户列表      HTTP=200 total=1
② 创建用户      HTTP=201 id=c6a38eb1-…
③ 分配角色      HTTP=200 “分配角色成功”
④ 自助改密      HTTP=200 “修改密码成功”；新密重登 ok
⑤ 删除用户      HTTP=200；列表不再出现（0）
建角色          HTTP=200 id=f820611c-…；tenant_id=…0001；列表可见=1；验收后软删
```

---

## 5. 监控

- 新增 `iam_global_rows{entity}` gauge 与 `iam_global_rows_added_total{entity}` counter，60s 采样，正向增量打 WARN。
- 独立部署由 unified-core `main.rs` 启动；生产单体由 `UnifiedCoreRealModule::build` 启动（本轮补）。
- 生产实测：`core_roles=16`、`core_tenants=1`，与迁移前基线一致。

---

## 6. 回滚资产

- 迁移回滚：[20261112100000_w7_b4_f1_login_path_rls_fail_closed.rollback.sql](file:///Users/air/TOPEMS/database/rollback/20261112100000_w7_b4_f1_login_path_rls_fail_closed.rollback.sql)（R2：旧可见性 ∪ 系统通道）。
- 二进制：远端 `~/topems/bin/topems-server.bak_f1_20261111`（窗口前）、`topems-server.f1_b1`（最终修复前）。
- 数据库：`~/topems/backups/topems_prod_f1_20261111_pre.dump`（本地同份，sha256 一致）。

---

## 7. 本轮发现并修复

1. **单体模式监控未启动**：`topems-server` 不执行 unified-core `main.rs`，`iam_global_rows` 在生产从未注册。已在 `UnifiedCoreRealModule::build` 启动同一采样任务。
2. **租户看不到全局角色**：生产 16 个角色均为 `tenant_id IS NULL`，`list_roles`/`get_role` 的租户过滤把它们排除，租户管理员无法授权；`check_role_target` 也拒绝全局角色。已按裁决第 4 条「全局行对租户读路径可见」修复，授予上限仍由 `role_permission_codes` 约束。

---

## 8. 未纳入本次（沿用 TODO）

- `update_role` / `delete_role` 仍走裸池，对租户域角色静默 0 行。
- `get_user_permissions` 角色列表走裸池，严格策略下少报租户域角色（fail-closed）。
- 「默认公司/默认租户」语义若需要，应新增 `is_default` 列；当前 `created_at ASC NULLS LAST, id ASC` 仅为确定性排序。
- `iam.core_*` 六张空影子表未动。
