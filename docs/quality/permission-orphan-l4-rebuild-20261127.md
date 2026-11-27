# L4 orphan 权限码四向比对清单（2026-11-27）

> **只读专项**：仅比对与落台账，未写种子迁移、未投放、未改 prod。
> 数据源：prod `topems_prod.public.core_permissions`（`deleted_at IS NULL`，1162 码），peer socket `host=/tmp user=xingzhai` 只读连接。
> 工具：`artifacts/audit/orphan-review/l4_orphan_rebuild.py`；全量四向数据：`artifacts/audit/orphan-review/l4-orphan-codes.json`（`artifacts/` 为本地工作产物目录，已 gitignore；本清单为入库台账，脚本/JSON 留本地可复跑）。

## 1. 四向口径

| 方向 | 采集范围 | 说明 |
|---|---|---|
| ① DB | prod `core_permissions` | code/name/resource/action/level/角色绑定（角色名聚合自 `core_role_permissions ⋈ core_roles`） |
| ② SQL 种子 | `database/init` + `database/migrations` + `database/seeds` 中 `core_permissions` INSERT 块 | 兼容 `public.` schema 前缀、`(code,…)` 与 `(gen_random_uuid(),code,…)` 两种列序、`VALUES` 与 `SELECT … FROM (VALUES …)` 变体；剔除 `--` 注释与 `WHERE code=` 改写行 |
| ③ FE 基线 | `packages/app-shell/src` + `apps/web/src`（除派生表）+ `packages/business-tools-sdk/src` | 排除 `apps/web/src/config/permissions.ts`（由 DB/类型派生的再导出全量表，1166 码覆盖 DB 全集，不计入手写基线）；`.ts/.tsx/.js/.jsx` 字符串字面量 |
| ④ BE 引用 | `svc/` + `lib/` 下 `.rs` 字符串字面量 | 排除 `target/`、测试文件 |

## 2. 总览统计（prod 1162 码）

| 指标 | 数量 | 口径 |
|---|---:|---|
| DB 码总数 | 1162 | prod `core_permissions` 未删 |
| 种子 SQL 已登记 | 1162 | 目录 INSERT 块可查字面量 |
| **不在种子 SQL** | **0** | DB 有、目录 INSERT 未登记的缺口 |
| FE 手写基线字面量 | 788 | 排除派生表后 |
| 不在 FE 基线 | 720 | 含后端动态授权 / 前端 DB 拉取渲染码 |
| 不在 BE 字面量 | 869 | 后端多走枚举/常量，静态扫不全 |
| FE/BE 零静态引用 | 581 | **全部种子在册**；后端枚举/常量动态授权或前端 DB 渲染，非 orphan 残留 |
| 未挂任何角色 | 2 | 见 §5，方言残留码 |
| L4 双缺口（不在 FE ∧ 不在种子） | 0 | 无「前端未用且种子未登记」双缺口码 |

## 3. 旧台账 L4 代表码复核

旧台账（role-ownership v1.153 前）定性「33 orphan：19 两段聚合码 + 14 三级码（13 `master-data:*` + `lims:test-method:read`），运行期真实使用但未进迁移种子基线」。逐条复核结果：**代表码均已由后续补码批次消化，种子目录在册并挂角色**，旧「未进基线」定性当前已不成立。

| code | name | resource | action | 种子登记 | FE | BE | 角色映射 | 复核状态 |
|---|---|---|---|:--:|:--:|:--:|---|---|
| `finance:read` | 财务模块访问 | finance | read | ✓ `20260724000004` | — | ✓ | admin, finance_manager, tenant_admin | 已在册 |
| `system:read` | system:read | system | read | ✓ `20260908000014` | ✓ | ✓ | admin | 已在册 |
| `rd:admin` | 研发-管理 | rd | admin | ✓ `20261020000024` | — | — | admin, tenant_admin | 已在册（BE 枚举动态授权） |
| `rd:read` | 研发-只读 | rd | read | ✓ | — | ✓ | tenant_admin | 已在册 |
| `master-data:read` | 主数据-读取 | master-data | read | ✓ `20261023000004` | — | — | admin, scm_manager, tenant_admin, wms_manager | 已在册（BE 枚举动态授权） |
| `master-data:write` | 主数据-写入 | master-data | write | ✓ `20261023000004` | — | — | admin, scm_manager, tenant_admin, wms_manager | 已在册（BE 枚举动态授权） |
| `crm:read` | 客户关系模块访问 | crm | read | ✓ | — | ✓ | admin, crm_manager, tenant_admin | 已在册 |
| `ehs:read` | 安全环保模块访问 | ehs | read | ✓ | — | ✓ | admin, ehs_manager, tenant_admin | 已在册 |
| `mes:work_order:write` | MES 工单写入 | mes:work_order | write | ✓ | ✓ | ✓ | admin, mes_manager, tenant_admin | 已在册 |
| `lims:test-method:read` | lims:test-method:read | lims:test-method | read | ✓ `20261102000001`（batch4） | ✓ | — | admin, tenant_admin | 已在册 |
| `master-data:lineage:read` | master-data:lineage:read | master-data:lineage | read | ✓ `20261102000001`（batch4） | ✓ | — | admin, tenant_admin | 已在册 |

## 4. `master-data:*` 批次全量（14 码）

| code | action | FE | BE | 角色映射 |
|---|---|:--:|:--:|---|
| `master-data:admin` | admin | — | — | admin, tenant_admin |
| `master-data:read` | read | — | — | admin, scm_manager, tenant_admin, wms_manager |
| `master-data:write` | write | — | — | admin, scm_manager, tenant_admin, wms_manager |
| `master-data:ai_governance:read` | read | ✓ | — | admin, tenant_admin |
| `master-data:commercial:read` | read | ✓ | — | admin, tenant_admin |
| `master-data:data-asset:read` | read | ✓ | — | admin, tenant_admin |
| `master-data:disaster:read` | read | ✓ | — | admin, tenant_admin |
| `master-data:governance:read` | read | ✓ | ✓ | admin, tenant_admin |
| `master-data:knowledge:read` | read | ✓ | — | admin, tenant_admin |
| `master-data:lineage:read` | read | ✓ | — | admin, tenant_admin |
| `master-data:quality:read` | read | ✓ | ✓ | admin, tenant_admin |
| `master-data:schema:read` | read | ✓ | ✓ | admin, tenant_admin |
| `master-data:semantic:read` | read | ✓ | — | admin, tenant_admin |
| `master-data:versioning:read` | read | ✓ | — | admin, tenant_admin |

14 码全部种子在册；11 个三级 `:read` 由 batch4 前端使用同步补录，`read/write/admin` 伞码由 MDM 种子批次登记。BE 侧多为枚举/常量动态授权，静态字面量扫不到，非死码。

## 5. 残余关注：未挂角色方言码（2 码）

这两码种子在册、BE 运行期仍有引用，但 `role_cnt=0`（未绑定任何业务角色，普通角色不可达，仅超管兜底可见），属 IAM 目录统一专项的方言收口遗留，**不是 L4 种子缺口**。

| code | name | resource | action | 种子登记 | BE 引用 | FE | 角色映射 | 备注 |
|---|---|---|---|---|---|:--:|---|---|
| `iam:dictionaries_read` | 字典读取 | iam | dictionaries_read | ✓ `20261119233000`（legacy 收敛迁移保留） | `svc/erp/src/modules/dict.rs:89` | — | （无绑定） | 下划线方言；待 IAM 目录统一专项收口 |
| `iam:dictionaries_update` | 字典更新 | iam | dictionaries_update | ✓ `20261119233000`（legacy 收敛迁移保留） | `svc/erp/src/modules/dict.rs:118,147` | — | （无绑定） | 下划线方言；待 IAM 目录统一专项收口 |

## 6. 结论与静态局限

**结论**
- 当前 prod 1162 码在 `core_permissions` 目录 INSERT 口径下 **0 未登记缺口**；旧台账 33 orphan 清单所列两段聚合码与 `master-data`/`lims` 三级码，经 `20260724000004` 模块种子、`20260908000014` 前端同步、`20261020000024` 网关补缺、`20261023000004` MDM、`20261102000001` batch4、`20261118125000` 伞码、`20261119233000` 方言收敛等批次补录后，均已在册并挂角色。
- 方向维持旧定性：若后续发现真实缺口，处置方向是**补 DB 种子迁移纳入基线**，而非清理 prod 残留。
- 唯一运行期待收口项为 §5 两个未挂角色的下划线方言码，归口 IAM 目录统一专项。

**静态解析局限（复跑时需知）**
1. SQL 种子按元组首列字面量解析；动态 `DO $$`/函数内拼串、`INSERT … SELECT` 非 VALUES 写法可能漏纳，已抽样复核代表码在册。
2. 后端权限走枚举/常量/表名映射而非字符串字面量，BE 静态扫描覆盖不全（869 码不在 BE 字面量不等于无后端引用）。
3. 前端菜单/SDK/i18n 全资源未穷尽；`permissions.ts` 派生全量表已排除出手写基线口径。
4. 本清单基于 2026-11-27 prod 快照；本机 dev 账本水位滞后（L3），不参与本次权威比对。
