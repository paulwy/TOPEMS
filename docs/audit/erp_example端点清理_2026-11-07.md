# ERP Example 端点清理执行记录

日期：2026-11-07
执行人：agent（erp smoke 修复包）

## 背景

web-contract-smoke 中 `[erp]` 段有 3 个 500 handler_error 失败：
- `GET /api/erp/example/employees` → readOps.ts:105
- `GET /api/erp/example/departments` → readOps2.ts:23
- `GET /api/erp/example/companies` → readOps2.ts:25

根因：这 3 个 handler 调 `state.hrm_client.*`（外部 HRM 微服务），HRM 未启动 → 连接失败 → 500。

## 取证结论

**纯示例代码，零真实消费。** 证据：

1. **后端引用面**：全仓 grep `hrm_integration_example`，仅命中 `mod.rs` 的模块声明和路由 merge 两处，无其他 Rust 模块 import 或调用。
2. **前端页面面**：`erpReadApi`（readOps.ts）和 `erpReadOps2`（readOps2.ts）导出后，全仓 `apps/web/src` grep 无任何页面/组件 import。
3. **测试面**：无测试文件引用这些端点。
4. **文档面**：仅历史归档文档提及，非活跃代码依赖。

文件头自述：「HRM 服务集成示例 / 架构改进计划的最佳实践示例」。

## 处置方式：双向删除

### 后端改动

| 文件 | 改动 |
|------|------|
| `svc/erp/src/modules/mod.rs:37` | 删除 `pub mod hrm_integration_example;` |
| `svc/erp/src/modules/mod.rs:159` | 删除 `.merge(hrm_integration_example::create_routes())` |
| `svc/erp/src/modules/hrm_integration_example.rs` | 整文件删除（4 条路由：employees, employees/{id}, departments, companies） |

### 前端改动

| 文件 | 改动 |
|------|------|
| `apps/web/src/api/erp/readOps.ts:104-105` | 删除 `listEmployeesFromHrm2`（→ `/example/employees`） |
| `apps/web/src/api/erp/readOps2.ts:22-25` | 删除 `listDepartmentsFromHrm`、`listCompaniesFromHrm` |
| `apps/web/src/api/erp/readOps2.ts:52-55` | 删除 `listDepartmentsFromHrm2`、`listCompaniesFromHrm2` |

### hrm_client 字段：保留不动

`ApiState.hrm_client`（mod.rs:96）在删除后仍有大量消费者：
- `hr_proxy.rs`：17 处调用（`/hr/employees`、`/hr/departments` 等代理路由）
- `addressbook.rs`：8 处调用（通讯录搜索/详情）

**未动 `svc/server/src/modules/erp_real_module.rs`**（禁动清单），hrm_client 构造和注入保持原样。

## 验收数据

### Smoke 跑前（8099 旧二进制）

- `[erp]` 段：363/366 PASS, 3 FAIL
- 总计：4649/4664 PASS, 15 FAIL（3 erp + 12 mobile）

### Smoke 跑后（8199 新编译二进制）

- `[erp]` 段：363/363 PASS, 0 FAIL
- 总计：4661/4661 PASS, 0 FAIL
- 端点总数：4664 → 4661（减少 3，恰好对应 3 条 example 路径）

### 其他门禁

- `cargo check -p topems-erp`：exit 0
- `rustfmt --edition 2021 mod.rs`：通过
- `cargo fmt --check -p topems-erp`：0 diff
- `pnpm --filter topems-portal typecheck`：0 错误
- `eslint --fix readOps.ts readOps2.ts`：0 error
