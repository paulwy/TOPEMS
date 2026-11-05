# P5 核心 IAM 表副本归一：现状与方案（2026-11-06）

> 批 9。承接批 6 重大发现。结论：**停在方案阶段**（标注评审 + 给出可执行的三阶段迁移草案），不本批执行数据迁移。

## 一、现状（本地库实测）

### 1.1 副本分布（5 张核心表 × 3 schema）

| 表 | iam | mes | public |
|---|---|---|---|
| `core_permissions` | 0 | **647** | **1033** |
| `core_roles` | 存在 | **空** | superadmin、admin（有数据） |
| `core_role_permissions` | 存在 | 存在 | 存在（含 2 条授权：superadmin/admin → `bi:data_source:read`） |
| `core_users` | 存在 | 存在 | 存在（总用户 0） |
| `core_user_roles` | 存在 | 存在 | 存在 |
| `core_tenant_modules` | 存在 | 存在 | 存在（另有 flow schema 一份），均空 |

### 1.2 运行时解析路径

`SHOW search_path` = **`mes, public`**（应用连接配置）。因此应用查询不带 schema 的表名时：
- `core_permissions` → 命中 **mes**（647 条）
- `core_roles` → 命中 **mes**（空表！）→ 与 public 中真实的 superadmin/admin 分离
- `public` 中的 `core_permissions`（1033 条）与 2 条授权 → **运行时不可见**

### 1.3 漂移成因（证据）

- `20260724000004_seed_module_permissions.sql:62/136/220/285` 用不带 schema 的 `INSERT INTO core_permissions` → 落 mes（search_path 优先）。
- `20260908000014_sync_frontend_permission_codes.sql` 与 `20261102000001_sync_frontend_permission_codes_batch4.sql` 显式 `public.core_permissions` → 落 public。
- 结果是同一逻辑表在 mes/public 各自被不同迁移填充，形成 647 vs 1033 的差集（386 条仅在 public）。

## 二、权威副本选型

| 候选 | 优点 | 缺点 |
|---|---|---|
`mes` | 运行时 search_path 优先命中；权限码 647 条与种子一致 | core_roles 为空表，角色/授权语义不完整 |
`public` | 角色（superadmin/admin）与 2 条授权在此；码 1033 条最全 | 运行时不可见 |

**结论**：没有任何单一副本是完整的。
- 权限码层面：`public` 是内容最全的"事实数据源"，`mes` 是"运行时可见"。
- 角色/授权层面：数据在 `public`，运行时命中的 `mes` 为空 → **说明当前环境很可能未真正跑起租户/角色链路**（core_users=0 亦印证）。

**建议权威**：`public` 作为**唯一权威存储**，并让应用连接把 `public` 放在 search_path 首位（或统一改写为显式 `public.` 前缀）；`iam`/`flow`/`mes` 副本降级为历史归档，P5 末段清理。
理由：public 数据最全、角色/授权完整；改连接配置比搬 1033 条码 + 授权更安全、可回滚（改配置即回滚）。

> 备选（若团队坚持 mes 权威）：需把 public 的 386 条码 + 角色 + 授权全部搬入 mes，工作量与风险更高，且 mes.roles 为空的原因需先查明。

## 三、三阶段迁移草案（评审通过后执行）

### S1 备份（必做，非破坏）

```sql
-- 每副本导出（结构+数据），存 database/backup/p5_20261106/
pg_dump --schema=public --table=core_permissions --table=core_roles \
        --table=core_role_permissions --table=core_users --table=core_user_roles \
        --table=core_tenant_modules -f database/backup/p5_20261106_public.sql "$DATABASE_URL"
（mes / iam / flow 同法）
```

### S2 连接层归一（推荐主路径，可回滚）

- 应用连接串增加 `options=-c search_path=public,mes`（或项目内 `after_connect` 设置 search_path 处调整），使 public 优先。
- 验证：`\d` 解析、`SELECT code FROM core_permissions` 命中 public 1033、角色查询命中 superadmin/admin。
- 回滚：恢复原 search_path 即回到现状，零数据改动。

### S3 数据对齐（幂等，逐项）

1. 缺失码补齐（mes 侧仅作兼容）：`INSERT INTO ... SELECT ... WHERE NOT EXISTS (code)`，从 public 同步 386 条。
2. 授权对齐：按角色 `name` 映射（public role id ≠ mes role id），`INSERT ... ON CONFLICT DO NOTHING`。
3. 清理（**延后至 P5 末段，需单独评审**）：`DROP` 或 rename 为 `core_permissions_archive_20261106`。

### 回滚

- S2：改回原 search_path。
- S3：按 S1 备份恢复对应表（`pg_restore --data-only`）。

## 四、为什么本批不落地（评审项）

1. **search_path 属于运行时关键配置**：改动影响登录、权限校验、租户隔离（用户多轮强调此三类"无把握不动"），必须先评估真实环境（当前 core_users=0 无法验证）。
2. **mes.core_roles 为空的原因未查明**：可能是租户初始化未跑，也可能是副本设计如此；在原因不明时搬数据会掩盖问题。
3. **数据迁移体量与授权映射风险**：1033 条码 + 跨副本 role id 映射，需在演练环境验证后再上生产。

**评审需拍板**：① 权威副本选型（public 优先 vs mes 优先）；② 是否允许调整 search_path（连接层改动）；③ 清理阶段的时间点（建议与 P5 数据层删除同批）。

## 五、与数据层删除（P5 主线）的关系

- 本批不动 navItems/DB 种子（数据层删除仍留 P5）。
- 建议 P5 执行顺序：**S1 备份 → S2 search_path 归一 → S3 数据对齐 → 数据层删除（菜单/种子清理）→ 副本清理**。
- 副本清理必须最后做（前序步骤出问题时它是唯一现场）。
