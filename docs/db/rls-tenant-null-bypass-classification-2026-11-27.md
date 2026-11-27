# RLS `tenant_id IS NULL` 旁路盘点与处置分级（2026-11-27）

## 一、口径

全库 RLS 策略普遍写成三段式：

```
(tenant_id = NULLIF(current_setting('app.tenant_id'), '')::uuid)
OR (tenant_id IS NULL)
OR (NULLIF(current_setting('app.tenant_id'), '') = '00000000-0000-0000-0000-000000000000')
```

中间那段 `tenant_id IS NULL` 是**「无租户行对所有租户可见」的旁路**：表里只要存在一行 `tenant_id` 为空的记录，任何租户都能读到（写同样放行）。

## 二、总量

| 维度 | dev（`topems`） | prod（`topems_prod`） |
| --- | --- | --- |
| 含 `tenant_id IS NULL` 的策略 | 554 条 | 15 条 |
| 其中 `tenant_id` 列可空的表 | 243 张 | 11 张 |
| 其中**真正存在 NULL 行**的表 | 34 张（合计 6280 行） | 2 张（`core_menu_groups` 130/130、`core_menus` 452/452） |
| 已收紧（本条迁移 `20261127230000`） | 48 条策略 | 0 条（纯空跑） |

结论：**生产侧基本干净**——唯一大量持有 NULL 行的是平台级菜单（`rls_global_read` 策略，刻意设计）。dev 的 34 张表才是历史包袱，主要是重建/迁移遗留。

## 三、dev 34 张表分级

### A. 全局目录 / 平台内容（保留豁免，不改策略）

整表全为 NULL 且语义上本就无租户，属「平台单一实例」数据：

| 表 | NULL/总行 | 说明 |
| --- | --- | --- |
| `public.core_permissions` | 1160/1160 | 权限目录，全局唯一 |
| `public.core_role_permissions` | 3474/3474 | 角色→权限映射，全局 |
| `public.core_roles` | 36/36 | 角色定义，全局 |
| `public.core_tenants` | 797/797 | 租户自身记录 |
| `public.tenants` | 1/1 | 旧租户镜像 |
| `iam.permissions` | 40/40 | 权限目录（iam 侧副本） |
| `public.core_migration_history` | 5/5 | 迁移台账（历史表） |
| `public.core_faqs` | 12/12 | 平台帮助内容 |
| `public.core_guides` | 12/12 | 平台引导内容 |
| `finance.core_finance_report_line_map` | 48/48 | 报表行映射模板 |
| `finance.core_finance_currencies` | 8/16 | 币种主数据（半数为租户覆盖） |
| `mail.templates` | 7/7 | 邮件模板（平台预置） |
| `doc_service.templates` / `doc_service.files` | 13 / 9 | 遗留上传与模板，未接运行期 |

处置建议：**策略不动**，仅在文档与台账登记「这些表的 NULL 行 = 平台级数据，旁路是有意的」。若后续要做「平台级 vs 租户级」显式区分，可改为 `app.rls_system` 口径（与 `system_settings` 一致）。

### B. 业务表里的散落 NULL（建议回填默认租户 + `SET NOT NULL` + 收紧策略）

这些表本该每行都有租户，NULL 属于历史写入路径遗漏或早期迁移残留：

| 表 | NULL/总行 | 备注 |
| --- | --- | --- |
| `notification.notifications` | 62/62 | 全部为空租户，通知必属某租户 |
| `public.search_recent` | 48/48 | 搜索历史，随用户/租户 |
| `public.core_files` | 43/43 | 文件归属应绑定租户 |
| `qms.quality_inspections` | 43/43 | 检验单 |
| `storage.files` | 43/43 | 与 `core_files` 同源 |
| `report.reports` | 40/40 | 报表实例 |
| `rs.audit_logs` | 25/1006 | 仅 25 行无租户，其余正常 |
| `mail.emails` / `public.core_emails` | 23/23 | 邮件同源两副本 |
| `rs.rs_projects` | 17/17 | 研发项目 |
| `public.core_user_roles` | 12/13 | 用户角色绑定必须带租户 |
| `public.search_logs` | 11/244 | 仅少量异常 |
| `qms.dashboard_metrics` | 10/10 | 看板指标 |
| `crm.tags` | 8/10 | 标签 |
| `qms.quality_standards` | 4/4 | 质量标准 |
| `portal.user_preferences` | 3/3 | 用户偏好 |
| `crm.interactions` | 1/1 | 客户互动 |
| `master_data.mdm_supplier_categories` | 1/1 | 供应商分类 |

建议处置（一条迁移完成）：`UPDATE ... SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL` → `ALTER COLUMN tenant_id SET NOT NULL` → 重新执行 `20261127230000` 的收紧逻辑（迁移本身幂等，二次执行会自动纳入这些表）。生产侧这批表全部 0 行，属纯空跑。

风险：若某表在运行期存在「故意不带租户」的写入路径（例如平台预置数据由迁移插入），`SET NOT NULL` 会让该路径失败。需先跑一遍服务冒烟（登录、列表、上传、通知）再放开。

### C. 待业务确认（可能是全局语义，不宜一律回填）

`public.core_menus`（187/213 为空，54 行带租户）、`public.core_menu_groups`（54/62）、`public.core_tenants` 之外的租户维度共享数据。菜单是「平台菜单 + 租户自定义菜单」混合表，回填会把租户菜单覆盖成全局菜单，必须由菜单/权限负责人确认口径后再动。

## 四、另一类更严重的问题：fail-open 方言（227 张表）

dev 还有 **227 张表 / 236 条策略**写成：

```
(current_setting('app.tenant_id', true) IS NULL)      -- 未设 GUC → 整条为真 → 全表放行
OR (current_setting('app.tenant_id', true) = '')
OR (current_setting('app.tenant_id', true) = '0000...0000')
OR (tenant_id IS NULL)
OR (tenant_id = NULLIF(...)::uuid)
```

这不是「NULL 行泄露」，而是**「未设置租户上下文就全开」**：任何忘记 `set_config('app.tenant_id', ...)` 的连接（后台任务、脚本、`psql` 直连、连接池归还未清理）都会拿到全库可见性。生产侧同名方言只出现在 `finance.finance_u8_import_records`（0 行）等少量表。

处置需要先确认一件事：`svc/unified-core/src/middleware/tenant_rls.rs` 对 superuser 走的是 `RESET app.tenant_id`（GUC 为空 = 上面第一段为真 = 全开）。也就是说 **fail-open 方言当前正承担「超管/无租户上下文」的放行职责**。要收紧成 fail-closed，必须同时把超管放行改成显式 `app.rls_system='on'` 口径（`system_settings`/`monitor_settings` 已是这种写法），否则超管、种子迁移、后台任务会集体失去访问。

建议排期：先做「业务表回填 + NOT NULL」（B 组），再单独做「fail-open → fail-closed + 超管走 `app.rls_system`」（C 组之外的独立一批），两者不要混在同一个窗口。

## 五、本次已落地

- `20261127230000_rls_tenant_null_bypass_tighten.sql`：运行时目录发现候选（`tenant_id` 可空 + 该表 0 行 NULL + 策略名 `tenant_isolation_*`/`rls_tenant_isolation` + 标准 `app.tenant_id` 模板），仅删除 ` OR (tenant_id IS NULL)` 片段；改前表达式快照在 `archive.rls_policy_before_20261127`（dev 48 条），rollback 原样还原。
- dev：收紧 48 条，含旁路的策略 554 → 506；prod：0 条（纯空跑）。
- 刻意豁免四类平台共享策略：`*_public_read`、`rls_platform_read`、`rls_global_read`、`*_platform_maintain`。
