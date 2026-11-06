# P4 · tier 与 module_code 体系统一 执行记录（批 13）

- 批次：批 13
- 日期：2026-11-06
- 关联：批 11（tier 列落地）、批 12（`ListPageTemplate.writePermission`）
- 拍板口径：一级权威 = 业务域 code；module_code 统一 `<域>:<功能>` 两级；tier 固定三级 basic/standard/enterprise，平台级统一映射；菜单过滤一次性生效不做灰度；无激活记录兜底放行

## 1. 盘盘结论：两套体系的结构性差异

| 维度 | `core_tenant_modules.module_code`（现状） | 前端一级菜单 code |
|---|---|---|
| 形态 | `<域>:<功能>`，如 `erp:addressbook` | 业务域 code，如 `mes` / `wms` / `scm` |
| 域覆盖 | **仅 `erp:` / `pm:` 两个前缀**（`BASIC_MODULE_CODES` 50 条） | **36 个业务域**（`apps/web/src/modules/*/config.ts` 顶层 `code`） |
| 粒度 | 功能点级 | 域级 |
| 数据 | 表 **0 行**（703 个租户均未落激活记录） | 静态注册 |

**结论**：格式本身（`<域>:<功能>`）无需改造，缺的是**域覆盖面**——只有 erp/pm 两个域有条目。若直接按前缀过滤菜单，`mes`/`wms`/`scm` 等 34 个域将全部被隐藏，等于打挂应用。因此落地采用 **"域级 `<domain>:core` 条目叠加"**，让 module_code 前缀与菜单 code 一一对齐。

## 2. tier 36 域映射定稿（前后端同源）

| tier | 数量 | 业务域 |
|---|---|---|
| basic | 15 | admin iam notification workflow doc erp mes wms scm crm finance asset hrm oa master |
| standard | 11 | pm qms aps lims pdm srm tms ehs bi report mobile |
| enterprise | 10 | ai gis monitor plugin im integration automation rd registry ticket |

归属原则：basic = 平台基座（admin/iam/notification/workflow/doc/master）+ 核心业务域（erp/mes/wms/scm/crm/finance/asset/hrm/oa）；standard = 进阶业务域与分析与移动端；enterprise = 集成/智能/监控/插件等增值能力。

**同源落点**：
- FE：`apps/web/src/config/moduleTiers.ts`（`DOMAIN_TIER_MAP` 36 条 + `tierOfDomain`/`domainsOfTier`/`domainOfModuleCode`/`ALL_DOMAINS`）
- BE：`svc/unified-core/src/modules/tenant/tier.rs`（`DOMAIN_TIER_MAP` 36 条 + `tier_of_domain`/`domains_of_tier`/`basic_domains`）

两处必须同步修改；本批已加单测双向校验「三级不重叠、并集 = 36」。

## 3. 落地内容

### 3.1 前端菜单过滤（一次性生效）

`apps/web/src/hooks/useTenantModules.ts`：
- `isModuleEffective(row)`：`is_active !== false` 且（`expires_at` 为空 或 `> now`），到期时间无法解析时放行；
- `collectActiveDomains(rows)`：把生效条目的 `module_code` 前缀聚合为业务域集合；**空数组 / 全部失效 → 返回 `null`**（= 无激活记录）；
- `useTenantModules()`：`apiClient.core.get('/tenant/tenants/{id}/modules')`；无 tenant id、接口异常、返回不成功、空数据 **一律回落 `activeDomains = null`**（放行），不白屏不误隐藏。

`apps/web/src/layouts/GlobalLayoutV3.tsx`：
- `buildSidebarItems` 增第 4 参 `activeDomains: Set<string> | null`；
- 一级导航过滤链追加 `.filter(item => !activeDomains || activeDomains.has(item.code))`；
- 组件内 `const { activeDomains } = useTenantModules()` 并传入 `useMemo`。

**行为矩阵**：

| 场景 | activeDomains | 菜单表现 |
|---|---|---|
| 无 tenant id / 接口 500 / 加载中 | `null` | 全量展示（兜底放行，存量 703 租户当前行为） |
| 表内 0 行 | `null` | 全量展示（同上） |
| 有生效记录（如仅 `mes:core`、`wms:inbound`） | `{mes, wms}` | 只展示 mes / wms 两级域 |
| 记录全部停用或到期 | `null` | 全量展示（视同未激活） |
| 域的 module_code 前缀未登记在 tier 表 | 仍在集合中 | 该域照常展示（不误隐藏） |

### 3.2 后端同源与 activate 适配

`activate_basic_modules`（`handlers.rs`）在功能级 50 条循环**之前**新增域级循环：为 15 个 basic 域各写一条 `<domain>:core`（`tier='basic'`、`is_active=TRUE`、`ON CONFLICT DO NOTHING` 幂等）。

设计取舍：**复用功能级条目的同一 SQL 模板**（相同 SQL 文本、仅 bind 值不同），使 sqlx 离线缓存无需重建，也让域级/功能级条目在同一事务内原子落地。功能级 50 条（erp/pm 明细）保留不动 —— 它们仍是精细化授权单位，域级条目只是为菜单可见性提供上级锚点。

## 4. 数据库改动

**无 schema 变更、无数据改写**：
- `tier` 列已在批 11 落地（public 有、iam 新增、mes/flow 副本已删）；
- `core_tenant_modules` 为 **0 行**，不存在需要改写的存量 module_code；
- 按拍板"无激活记录兜底放行"，**不为 703 个存量租户预置**激活记录（预置会让过滤对多数租户永久失效，反而偏离一刀切目标）。

因此本批不新增迁移文件，迁移四件套仅做现网校验。

## 5. 验证

| 项 | 结果 |
|---|---|
前端单测（`useTenantModules.test.ts`） | **9 passed**：36 域总数、三级不重叠并集=36、域归属抽查、未登记域→null、空/全失效→null、多模块聚合、停用/到期过滤、异常到期时间放行 |
BE 单测（`tier::tests`） | **2 passed** |
`cargo check -p topems-unified-core` | ✅ Finished，无 error |
`pnpm --filter topems-portal typecheck` | ✅ |
`eslint`（4 个改动文件） | 见门禁结论 |
`rustfmt`（tier.rs / handlers.rs / mod.rs） | ✅ 已格式化 |

## 6. 未落地 / 登记项

1. **存量 `erp:*`/`pm:*` 50 条不改写**：它们已是 `<域>:<功能>` 合法形态，改写无收益、且有授权表联动风险；域级条目已解决菜单对齐问题。
2. **菜单过滤的正例未实测**：`core_tenant_modules` 0 行 → 本地只能验证"兜底放行路径"（全量展示）。要验证"过滤真的生效"需临时插入激活记录，属污染生产数据的操作，未执行；逻辑已由单测覆盖（`collectActiveDomains` 四类输入）。
3. **tier 命名统一**：代码注释中的 `advanced` / `infrastructure` 与拍板 `standard` / `enterprise` 不一致，本批以新文件（`tier.rs` / `moduleTiers.ts`）承载**正确命名**，旧注释在批 14 与 CrudPage 专项一并清理（避免本批同时改多个语义面）。
4. **`activate_module`（单模块激活）仍落列默认 `basic`**：未按域映射推导 tier，登记待精细化。
