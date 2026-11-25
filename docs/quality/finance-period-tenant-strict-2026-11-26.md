# Finance 会计期间写入口租户严格化（B334）

日期：2026-11-26

## 背景

`finance.core_finance_periods` 本地 1489 行，状态全部 `open`，无软删记录。

B328 已在服务层补会计期间的软删隔离与并发谓词，但四个打开/关闭入口仍使用 `get_tenant_id_from_claims`：

- 该函数在 claims 缺失、非法或 nil 时回退到平台租户 `PLATFORM_TENANT_ID`，且注释明确“写路径禁止使用本函数给业务行兜底”；
- 受影响入口：
  - `close_period`（`POST /periods/{year}/{month}/close`）
  - `open_period`（`POST /periods/{year}/{month}/open`）
  - `open_period_v2`（`POST /periods/open`）
  - `close_period_v2`（`POST /periods/close`）。

无租户上下文的写请求会被落到平台租户期间，而不是显式拒绝。

## 改动

`svc/finance/src/modules/mod.rs`：

- 四个期间写入口统一改用 `topems_shared_auth::middleware::tenant::try_tenant_id_from_claims`；
- 缺失、非法或 nil 租户直接返回 400，不再回退平台租户；
- 服务层状态机、软删谓词、并发谓词与事务提交方式不变。

## 验证

- `cargo fmt -p topems-finance`
- `cargo check -p topems-finance` PASS
- `cargo test -p topems-finance --lib period`：83 passed

本批无 migration、无 DDL。

## 风险与遗留

- 本地 1489 行期间全为 `open`、无软删，无法用存量触发无租户路径；改动属于防御性收紧。
- 超管或系统任务若原本依赖平台租户默认值调用期间打开/关闭，将从“隐式落平台租户”变为 400“缺少租户ID”，需要显式指定租户上下文。
- 期间读取接口仍使用 `get_tenant_id_from_claims` 的平台租户回退，属于只读过滤语义，不在本批写路径范围。
