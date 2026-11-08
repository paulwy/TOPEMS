# P1 公司主数据与主体范围上生产记录（2026-11-09）

- 执行时间：2026-11-09 03:01–03:46（Asia/Shanghai）
- 目标库：`topems_prod` @ `xingzhai@192.168.110.115`（PostgreSQL 18 / Homebrew）
- 应用版本：`6a8b5f9b5`（P1 功能）+ `81f43a5c7`（表授权修复）
- 迁移入口：`scripts/migration/apply-forward.sh --prod`（SSH 模式，远端 `psql -X -v ON_ERROR_STOP=1`，单事务）
- 部署方式：`./scripts/deploy-prod.sh --frontend --force`
- 边界遵守：未重启 nginx master（PID 1239，仅 reload）；未修改占位公司名；未使用 `--no-verify`

---

## 一、迁移清单

| 版本 | 文件 | SHA-384（账本，逐字节核对一致） | checksums.txt（SHA-256） |
|---|---|---|---|
| 20261108130000 | `20261108130000_p1_company_master_and_scopes.sql` | `8fb115042c69c6c485f19dd7240b4e72c4c43a4c8c581761434789d847877ae6cd8c19eac7ed661c8542ca52a0c7ae52` | `d2ec211a…` |
| 20261108131000 | `20261108131000_p1_company_scope_table_owner.sql` | `84cb3e0689e31418cde21382254b777dc33979857ad78149fd5a389dfac9b160545b2829f8fda9102921bfe91d7d6171` | `48d7b4c3…` |

- 账本推进：`20261108120000` → `20261108130000` → `20261108131000`
- 两条迁移均通过 `apply-forward.sh --only` 应用，无账本外 DDL

### 1.1 `20261108130000` 做了什么

- `hrm.companies` 新增 `code`（`COMP-` + 主键前 12 位大写十六进制）、`functional_currency`（默认 `CNY`）
- 新增租户内唯一索引 `ux_companies_tenant_code`
- 新建 `public.core_user_company_scopes`（`tenant_id` / `user_id` / `company_id` / `access_level`，`uq` 唯一 + 外键）
- 回填：按 `core_tenant_users` 在职成员与单公司租户规则写入主体范围
- `erp.consolidation_scope_companies` / `erp.company_relations` 增加公司外键

### 1.2 `20261108131000` 做了什么（补救迁移）

修复 `core_user_company_scopes` 表所有权：P1 迁移以执行账号 `xingzhai` 建表，服务运行账号 `topems_prod` 无表级权限。按 `core_roles` 等历史表口径将 owner 归位 `topems_prod`，并对 `topems_app` 补 `GRANT SELECT/INSERT/UPDATE/DELETE`。

---

## 二、影子预演（应用前，事务内 ROLLBACK）

| 断言 | 结果 |
|---|---|
| 迁移整体执行耗时 | 0.08s |
| `hrm.companies.code` NULL 数 / 租户内重复 | 0 / 0 |
| `functional_currency` | 全部 `CNY` |
| `core_user_company_scopes` 回填 | 1 行（`tenant_admin` → 唯一公司，`write`） |
| fail-closed 遗漏（单公司租户在职用户 × 公司） | 0 |
| nil UUID 行（无条件放行分支被复用） | 0 |
| 约束 / 唯一索引 / RLS 策略 | 全部就位 |
| 回滚后账本 | 仍 `20261108120000`，新表与新列均不存在 |

---

## 三、生产盘点（应用前只读）

| 项 | 值 |
|---|---|
| `hrm.companies` | 1 行：`0a000000-0000-4000-8000-000000000001`，租户默认租户，名称「企业全称（请修改）」 |
| `tax_number` / `registration_number` | 均为空 → 无法“优先使用统一社会信用代码” |
| 租户与公司分布 | 1 个租户，单公司租户 1 个，多公司租户 0 个 |
| 在职用户 | 2 个（`admin` 超管、`tenant_admin`）；`core_tenant_users` 仅 `tenant_admin` 1 行 |
| 合并引用表 | `consolidation_scopes` / `consolidation_scope_companies` / `company_relations` 均 0 行 |

**code 口径结论**：税号/工商注册号全空，采用主键派生 `COMP-0A0000000000`（稳定、租户内唯一、不依赖可变名称、非随机 UUID）。

---

## 四、备份

| 项 | 路径 |
|---|---|
| P1 相关表结构与数据（7 张） | `~/topems/backups/pre_p1_20261109/p1_related_tables.sql`（约 22K） |
| 覆盖表 | `hrm.companies`、`erp.consolidation_scope_companies`、`erp.company_relations`、`public.core_tenant_users`、`public.core_user_roles`、`public.core_roles`、`iam.users` |

---

## 五、部署后实测

| 项 | 实测 |
|---|---|
| `/health` | 200，`status=ok`，modules 31，`degraded_count=0` |
| `/ready` | 200，`degraded_modules=[]` |
| 进程 PID | 69620 |
| `public.core_menus` | 449 |
| `hrm.companies` | `code=COMP-0A0000000000`，`functional_currency=CNY` |
| `core_user_company_scopes` | 1 行（`tenant_admin`，`write`） |
| nginx | master 1239 未重启，仅 reload |
| 前端产物 | `topems-6a8b5f9b5-20261109/web` |

接口实测（真实 token 经 nginx）：

| 调用 | 结果 |
|---|---|
| admin → `GET /iam/users/{tenant_admin}/company-scopes` | 200，返回该公司 `write` |
| tenant_admin → `GET /iam/users/{self}/company-scopes` | 200 |
| admin → `GET /iam/users/{admin}/company-scopes` | 400「无法确定目标租户」（admin 不属于任何租户） |
| tenant_admin → `GET /iam/users/{admin}/company-scopes` | 外层 200 + 内层 404「用户不存在」 |
| 无 scope 用户 → `POST /erp/consolidation/scopes/companies` | 403「无主体权限：当前用户未配置该法人的主体范围」 |
| 主体不存在 → 同上 | 404「主体不存在或不属于当前租户」 |
| 合并四接口（generate / publish / execute-elimination / financial-data） | 均 501「未接入」，未写金额 |

> 「无 scope 403」验证方式：临时移除 `tenant_admin` 的 scope 行，实测 403 后按原值（含 `created_at`）恢复，最终行数为 1。
> `admin` 为超管且无租户成员行，迁移不回填其主体范围；合并接口按代码对超管跳过 scope 校验。

---

## 六、本次踩到的坑（后续新建表必查）

**现象**：部署后 `GET /iam/users/{id}/company-scopes` 返回 500 `permission denied for table core_user_company_scopes`。

**根因**：生产迁移以 OS 账号 `xingzhai`（superuser）执行，新建表 owner 即为 `xingzhai`；服务以 `topems_prod` 连接，既非 owner 也无 GRANT。历史表 owner 均为 `topems_prod`，故此前未暴露。

**为什么不能只 GRANT**：该表 `ENABLE ROW LEVEL SECURITY`（与 `core_roles` 同口径，非 FORCE）；owner 绕过策略。只 GRANT 会让 `topems_prod` 变为非 owner，策略要求 `app.tenant_id` 匹配，服务端未设置该 GUC 时查询被过滤为空，功能仍然不可用。

**修复口径**：`ALTER TABLE ... OWNER TO <服务角色>`，并对 `topems_app` 补 GRANT，固化在 `20261108131000`。

**检查清单（新建表迁移）**：
1. 表 owner 是否为服务运行账号（`topems_prod`）
2. 是否需要 `GRANT` 给 `topems_app`（本地/测试环境）
3. RLS 为 `ENABLE` 还是不 `FORCE`，owner 绕过是否符合预期
4. 迁移执行账号与服务账号不一致时，必须显式归位 owner

---

## 七、遗留事项（不随本批）

`POST /erp/consolidation/scopes/companies` 传入真实公司但不存在的 `scope_id` 时返回 500（外键约束冒到接口层）。

- 处理点：`svc/erp/src/modules/consolidation/scope_companies.rs:87` `add_scope_company`
- 错误分支：第 145–148 行 `Err(e) => ApiResponse::from(TopemsError::Internal(...))`，未区分 `23503` 外键违反
- 计划：P2a 批次一并改为 400/404 + 可读提示，不单独发版
