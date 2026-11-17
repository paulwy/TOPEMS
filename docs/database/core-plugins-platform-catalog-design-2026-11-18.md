# core.core_plugins 平台语料化设计（2026-11-17）

状态：**设计已确认（2026-11-17 五点拍板），迁移/回滚/代码同批落地，待窗口执行**。生产零 DDL、零数据修复、零停服。
关联：`residual-ten-table-triage-2026-11-18.md` §9、`repo-wide-rls-pool-closure-2026-11-18.md` Batch E 的「core 停下」结论。

## 0. 现状证据（生产 topems_prod 只读，2026-11-17）

- 行数：`core.core_plugins` 0 行；`core_plugin_versions` / `reviews` / `instances` / `permissions` / `navigation` / `categories` 均 0 行。
- 列与约束：
  - `tenant_id uuid NULL DEFAULT '00000000-0000-0000-0000-000000000001'`（**默认租户1**）；
  - `UNIQUE (code)`（全局唯一，无租户维度）；
  - `name` 无唯一约束；
  - 安装表 `iam.core_tenant_plugins`：`UNIQUE (tenant_id, plugin_id)`，FK 仅指向 `iam.core_tenants`，**没有**指向 `core.core_plugins` 的外键；`tenant_id NOT NULL`。
  - `core_plugin_versions.plugin_id` 有 FK → `core.core_plugins(id) ON DELETE CASCADE`。
- 当前策略：allow_all（ALL true/true），RLS+FORCE 已开。
- 写入点：
  - `tenant_plugins.rs:1053-1122` 上传插件：插入目录行 + `core_plugin_versions` 版本行；
  - `tenant_plugins.rs:1288-1299` 发布：`UPDATE ... WHERE code=$1`，无租户谓词；
  - `tenant_plugins.rs:1350-1361` 下架：同上；
  - `tenant_plugins.rs:1413-1449` 开发者编辑：`WHERE code=$1`，无租户谓词；
  - `runtime.rs:125` 系统通道安装运行时插件；
  - 版本/升级：`versioning.rs`、`upgrade_workflow.rs` 只更新版本行与目录的 `version` 字段，不改 `tenant_id`。
- 读取点（本次要收口的四处 + 其它）：
  - `tenant_plugins.rs:134` 租户已安装列表 `JOIN core.core_plugins`（请求租户 scope）；
  - `tenant_plugins.rs:449` 卸载按 `code` 读目录（请求租户 scope）；
  - `tenant_plugins.rs:736` 激活、`:855` 停用，均用 `(SELECT id FROM core.core_plugins WHERE code=$2)`（请求租户 scope）；
  - `tenant_plugins.rs:247` 安装按 `code` 读已发布插件（请求租户 scope）；
  - `simple_api.rs:58/111/203/...` 请求租户 scope；
  - `marketplace.rs:62/272` **系统通道**，且 `get_plugin` 不带 `is_published` 过滤（现状会把任意租户草稿暴露给所有调用方）。

结论：目录行当前既当「租户草稿」又当「公开条目」，`code` 全局唯一使二者无法并存；安装关系已独立在 `iam.core_tenant_plugins`。平台语料化只需把**发布**定义为「把行迁到哨兵命名空间」，无需拆表。

## 1. 目标策略（读取 = 哨兵行 OR 本租户行，不放水）

```sql
-- 写：系统通道或本租户行
CREATE POLICY rls_tenant_isolation ON core.core_plugins FOR ALL
USING (
  COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
  OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
)
WITH CHECK ( ...同上... );

-- 读：平台行只在有租户上下文时可见（防止未认证/空上下文读到全部）
CREATE POLICY rls_platform_read ON core.core_plugins FOR SELECT
USING (
  tenant_id = '00000000-0000-0000-0000-000000000000'
  AND NULLIF(current_setting('app.tenant_id', true), '') IS NOT NULL
);
```

配套唯一约束（②）：

```sql
CREATE UNIQUE INDEX core_plugins_platform_name_key
    ON core.core_plugins (name)
    WHERE tenant_id = '00000000-0000-0000-0000-000000000000'
      AND deleted_at IS NULL;
```

不建 allow_all；平台行的写入/迁入迁出只允许系统通道（`app.rls_system='on'`），并在 SQL 里用 `WHERE` 做归属校验，不用策略放宽。

## 2. 逐问回答

### ① 发布后原租户行保留为草稿，还是迁移成平台行？

**决策：迁移成平台行，不保留草稿副本。**

- `publish`：`UPDATE core.core_plugins SET tenant_id = 哨兵, owner_tenant_id = $当前租户, is_published = true, published_at = now() WHERE id = $1 AND tenant_id = $当前租户`（系统通道执行，`WHERE` 锁归属）。
- 理由：
  1. `code` 现有全局 `UNIQUE`，草稿副本与平台行不能同码并存；若保留副本必须改唯一约束与所有按 `code` 的查询，风险和改动面更大。
  2. `core_plugin_versions.plugin_id` 是 FK；原地迁移保 `id`，版本、评论、实例、权限、导航等子表全部不需要搬。
  3. 安装表引用 `plugin_id`，迁移不改变安装关系。
- 需要新增 `owner_tenant_id uuid NULL`（发布方归属；平台原生行为 NULL）。回填：0 行，窗口内 `UPDATE ... SET owner_tenant_id = tenant_id WHERE tenant_id <> 哨兵`；随后 `ALTER COLUMN tenant_id DROP DEFAULT`，禁止再靠默认 `…0001` 落行。
- 草稿定义随之明确：`tenant_id = 发布方 && is_published = false`；平台行：`tenant_id = 哨兵 && is_published = true`。

### ② `code` / `name` 唯一性放在租户维度还是平台维度，冲突怎么处理？

**决策（已拍板）：`code` 保持全局唯一（沿用现有 `UNIQUE (code)`）；`name` 为平台维度唯一（哨兵行维度）。**

- `code` 是插件身份与安装、升级、运行时寻址键，跨租户也不允许重复；上传重复直接 409。
- `name` 唯一域 = `tenant_id = 哨兵 AND deleted_at IS NULL`（草稿与已下线行不参与）：
  - 索引：`core_plugins_platform_name_key`；
  - 发布时若与现有平台条目同名，捕获 `23505`，返回 **409** 并提示「平台已有同名插件，请为名称加前缀后重试」；
  - 草稿之间允许同名（尚未进入平台目录）。
- 不使用 `UNIQUE (tenant_id, name)`：草稿行会随发布迁走，租户维度唯一既拦不住平台重名，也会误伤同租户的历史草稿重新发布。

### ③ install 记录与插件目录如何区分？

**决策：继续分表，不合并。**

- `core.core_plugins` = 目录/条目（平台行 + 租户草稿）；
- `iam.core_tenant_plugins` = 安装关系（谁装了哪个 `plugin_id`、许可证、激活状态、软删），`UNIQUE (tenant_id, plugin_id)` 已具备。
- 建议在窗口内补 `plugin_id` → `core.core_plugins(id) ON DELETE RESTRICT` 外键（当前缺失），防止目录行被误删留下孤儿安装记录。
- 目录上的 `is_installed` / `installed_at` / `is_active` / `activated_at` 是「全局行上的租户状态」，与安装表语义重叠。**本次不删列**，但代码不再写入/依赖；后续单独评估清理。

### ④ uninstall 删的是安装记录还是平台目录行？会不会影响其他租户？

**决策：只删安装记录，目录行不动；不影响其他租户。**

- 现状已如此：`tenant_plugins.rs:529/589` 仅 `UPDATE iam.core_tenant_plugins SET deleted_at = NOW()`；`Delete` 档也只处理安装记录与数据保留，不删 `core.core_plugins`。
- 收严后该路径只需能读到平台行（平台读策略覆盖），无需系统通道。
- 需补一个既有缺口：`install` 时 `install_count + 1`，`uninstall` 未减。设计为在卸载成功后于系统通道 `install_count = GREATEST(install_count - 1, 0)`（平台行不允许租户直接 UPDATE，必须系统通道）。

### ⑤ 取消发布/下架的回收路径

- **租户发布的条目**（`tenant_id = 哨兵 AND owner_tenant_id = $当前租户`）：
  `unpublish` 在系统通道执行 `UPDATE ... SET tenant_id = owner_tenant_id, owner_tenant_id = NULL, last_owner_tenant_id = $当前租户, is_published = false, published_at = NULL, unpublished_at = NOW() WHERE code = $1 AND tenant_id = 哨兵 AND owner_tenant_id = $当前租户`，行回落到发布方成为草稿；其他租户立即不可见。
- **平台原生条目**（`owner_tenant_id IS NULL`）：租户不可下架；只能由平台运维在系统通道软删（`deleted_at`）或转交归属，属单独运维决策。
- **租户下线/删除（已拍板）**：平台行**保留**，`owner_tenant_id` 置空；`last_owner_tenant_id` 记录原发布方、`unpublished_at` 记录下线时间，便于追溯。落库为：
  ```sql
  UPDATE core.core_plugins
  SET owner_tenant_id = NULL,
      last_owner_tenant_id = COALESCE(owner_tenant_id, last_owner_tenant_id),
      unpublished_at = NOW(),
      updated_at = NOW()
  WHERE tenant_id = '00000000-0000-0000-0000-000000000000'
    AND owner_tenant_id = $下线租户;
  ```
  （本批只提供数据形态与列，不在租户删除链路里自动执行；租户下线脚本按此口径接入。）
- 回收后版本行随 `plugin_id` 保留，不删历史；重新发布会复用同一 `id`（`last_owner_tenant_id` 在重新发布时被覆盖为当前发布方）。

### ⑥ 四处读改后的目标形态

| 位置 | 现状 | 目标 |
|---|---|---|
| `tenant_plugins.rs:134` 租户已安装列表 | 请求租户 scope JOIN 目录 | **不改 SQL**：平台读策略让哨兵行可见，JOIN 恢复；补 `p.deleted_at IS NULL` 过滤 |
| `tenant_plugins.rs:449` 卸载按 code 读目录 | 请求租户 scope，无发布过滤 | 保持租户 scope；显式加 `AND (p.is_published = true OR p.tenant_id = 当前租户)`，避免依赖隐式策略 |
| `tenant_plugins.rs:736` 激活子查询 | 请求租户 scope 按 code 取 id | 不改 SQL；平台行经平台读可见；如需只允许已发布，补 `AND is_published = true` |
| `tenant_plugins.rs:855` 停用子查询 | 同上 | 同上 |
| `tenant_plugins.rs:247` 安装按 code 取已发布插件 | 请求租户 scope | 不改 SQL（已带 `is_published = true`）；平台读覆盖 |
| `marketplace.rs:62/272` 市场读 | **系统通道**，`get_plugin` 无发布过滤 | 公开路由不注入请求事务/租户上下文（`tenant.rs:717` 对 `is_public_path` 直接放行），**无法**用租户 scope；改为系统通道 + 强制 `tenant_id = 哨兵 AND is_published = true AND deleted_at IS NULL`，可见集合与「哨兵行 OR 本租户行 + 发布过滤」等价 |
| `tenant_plugins.rs:1288/1350/1413` 发布/下架/编辑 | 请求租户 scope，`WHERE code=$1` 无归属 | 发布/下架改**系统通道 + owner 归属校验**（见①⑤）；开发者编辑改 `WHERE code=$1 AND tenant_id=$当前租户`（只改自己的草稿） |
| `tenant_plugins.rs:331` install_count +1 | 请求租户 scope 直接 UPDATE 平台行（收严后会 42501） | 改系统通道执行计数更新；`uninstall` 补 -1 |
| `simple_api.rs` 各读 | 请求租户 scope | 策略覆盖后自然可见平台行；补 `is_published`/`deleted_at` 过滤 |

## 3. 迁移与代码改动清单（已落地，同批）

迁移（一条）：`database/migrations/20261118123000_core_plugins_platform_catalog.sql`
1. 前置断言：两表存在、安装表孤儿 `plugin_id = 0`、哨兵行同名重复组 `= 0`、NULL 租户行 `= 0`（任何一项不满足即 RAISE，**不靠外键被拒发现孤儿**）；
2. `ADD COLUMN owner_tenant_id / last_owner_tenant_id / unpublished_at` + COMMENT；
3. 回填（0 行）`owner_tenant_id = last_owner_tenant_id = tenant_id WHERE tenant_id <> 哨兵`；
4. `ALTER COLUMN tenant_id DROP DEFAULT`（禁止再落默认 `…0001`）；
5. `core_plugins_platform_name_key`（name 哨兵维度唯一）+ `idx_core_plugins_owner_tenant` + `idx_core_plugins_platform_tenant`；
6. 补 `iam.core_tenant_plugins.plugin_id → core.core_plugins(id) ON DELETE RESTRICT`（先跑孤儿检查，无孤儿才加）；
7. 动态 DROP 既有策略 → `ENABLE` + `FORCE` → `rls_tenant_isolation`(ALL) + `rls_platform_read`(SELECT)；
8. 后置断言：策略数 = 2、两条策略定义、RLS/FORCE、name 唯一索引、FK `convalidated`、`tenant_id` 默认已移除。

回滚：`database/rollback/20261118123000_core_plugins_platform_catalog.rollback.sql`（还原 allow_all、默认租户、删三列/三索引/外键，RLS/FORCE 保持开启）。

代码（同批，`svc/plugin-registry`）：
- `tenant_plugins.rs`：
  - `publish_plugin` / `unpublish_plugin`：`Extension(claims)` + `TenantScope::require_tenant`，在请求事务内 `set_config('app.rls_system','on',true)` 开系统通道，`WHERE` 锁归属；发布把行原地迁哨兵，下架回落到发布方；`23505` → **409**，非本人 → 404。
  - `update_plugin`：`Extension(claims)` + `AND tenant_id = $11`，只允许改自己的草稿。
  - `list_tenant_plugins`（:134）：补 `p.deleted_at IS NULL`。
  - `install_plugin_inner`（:247）：补 `AND deleted_at IS NULL`；`install_count + 1` 前开系统通道。
  - `uninstall_plugin_inner`（:449）：加 `AND (is_published = true OR tenant_id = $3)`；`Uninstall`/`Delete` 成功后在系统通道 `install_count = GREATEST(install_count - 1, 0)`。
  - `:736` / `:855`：不改 SQL，平台读策略覆盖。
  - `upload_plugin`：显式写 `owner_tenant_id` / `last_owner_tenant_id`（服务身份落 NULL，即平台原生）。
  - `upload_plugin_version`：版本号落在目录行上，系统通道 + owner 校验（仅草稿所属租户或平台行 owner）。
  - `versioning.rs` 版本回退 / `upgrade_workflow.rs` 升级：目录行版本号写入走系统通道（保持既有语义；「升级改全局目录行」是否应改为写安装记录另议）。
- `marketplace.rs`：保持系统通道，全部查询强制 `tenant_id = 哨兵 AND is_published = true AND deleted_at IS NULL`（versions/reviews 用 `EXISTS` 守住父插件）；改写「禁止 tenant_id 谓词」的旧注释。
- `runtime.rs:125`：保持系统通道（平台行写入）；显式哨兵不变。

## 4. 演练与回滚计划

- 克隆库 `m2_dryrun_20261116` 夹具（4 行）：A 草稿（`tenant=A, owner=A`）、B 草稿（`tenant=B, owner=B`）、B 发布的平台行（`tenant=哨兵, owner=B, is_published=true`）、平台原生未发布行（`tenant=哨兵, owner=NULL`）。
- 六档期望（裸 `SELECT ... FROM core.core_plugins`）：未设 0 / 空串 0 / 全零 2（两条哨兵行，tenant_isolation 的等值分支）/ A 3（A 草稿 + 2 条哨兵）/ B 3（B 草稿 + 2 条哨兵）/ A+`app.rls_system=on` 4。
- 关键断言：**A 能看到 B 发布的插件（哨兵行），但看不到 B 的草稿行**。
- 写校验：A 不能 UPDATE B 行、不能把行迁到哨兵（应 42501，除非系统通道）；系统通道 + owner 校验可发布/下架；A 卸载只删安装记录，目录与 B 不变；非 owner 发布 → 404；平台重名 → 409。
- 回滚：删两条策略 → 重建 allow_all → 删三索引/三列/外键 → 断言 RLS/FORCE 与策略数；克隆库回基线。

## 5. 五点确认结论（2026-11-17 拍板）

1. **①** 不保留草稿副本：发布原地迁哨兵行 + `owner_tenant_id`。
2. **②** `name` 平台维度唯一（哨兵行、未删除），冲突返回 409 并提示加前缀；`code` 保持全局唯一。
3. **③** 租户下线时平台行保留、`owner_tenant_id` 置空，`last_owner_tenant_id` 与 `unpublished_at` 留痕。
4. **④** 外键 `iam.core_tenant_plugins.plugin_id → core.core_plugins(id)` 同批补；迁移内先跑孤儿检查，存在孤儿即 RAISE 停批。
5. **⑤** 发布/下架/`install_count` 走系统通道 + owner 校验，哨兵行不开放写入策略。
