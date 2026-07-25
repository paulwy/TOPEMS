# TOPEMS 系统架构与命名规范标准

> 版本：2.1
> 最后更新：2026-06-26
> 适用范围：前端（React/TypeScript）、后端（Rust/Axum）、CI/CD、Git Hooks
> 本标准为**强制执行**，所有新代码必须符合本标准

---

## 1. 目录结构标准

### 1.1 后端服务目录结构（Rust/Axum）

所有后端服务**必须**统一采用以下目录结构：

```
svc/{service-name}/
├── src/
│   ├── api/              # API 层：路由定义 + Handler
│   │   ├── mod.rs        # 统一导出 + 路由注册函数 create_api_routes()
│   │   ├── {resource}.rs # 资源 API（如 supplier.rs, order.rs）
│   │   └── openapi.rs    # OpenAPI 文档（可选）
│   ├── models/           # 数据模型层
│   │   ├── mod.rs        # 统一导出
│   │   ├── {model}.rs    # 数据模型（如 supplier.rs, order.rs）
│   │   └── audit_log.rs  # 审计日志模型
│   ├── services/         # 业务逻辑层
│   │   ├── mod.rs        # 统一导出
│   │   ├── {service}.rs  # 业务服务（如 permission.rs, audit.rs）
│   │   └── cache.rs      # 缓存服务
│   ├── utils/            # 工具函数（可选）
│   │   ├── mod.rs
│   │   ├── errors.rs
│   │   └── validation.rs
│   ├── main.rs           # 服务入口
│   └── plugin.rs         # 插件注册
├── migrations/           # 数据库迁移
├── tests/                # 集成测试
├── Cargo.toml
└── plugin.yaml
```

**已退役服务处理**：功能迁移完成后，将原服务目录重命名为 `{name}.deprecated`，从 workspace 的 `Cargo.toml` 中移除，保留作为历史参考。

**多二进制服务**：对于包含多个独立二进制的服务（如 analytics 包含 main.rs + main_bi.rs + main_report.rs），允许各二进制共享基础路由（`/health`, `/api/info`, `/metrics` 等），这些重复不计入违规。

### 1.2 前端目录结构（React/TypeScript）

```
apps/web/src/
├── api/                  # API 层：所有 API 调用封装
│   ├── client.ts         # API 客户端（axios 封装）
│   ├── request.ts        # 请求工具函数
│   ├── permission-interceptor.ts  # 权限拦截器
│   ├── {module}/         # 模块 API 目录（拆分后）
│   │   ├── types.ts      # 类型定义
│   │   ├── utils.ts      # 工具函数（可选）
│   │   ├── {feature}.ts  # 功能 API（如 hazard.ts, inspection.ts）
│   │   └── index.ts      # Barrel export + 聚合对象
│   └── {module}.ts       # 小模块 API（未拆分的单一文件）
├── components/           # 组件
│   ├── common/           # 通用组件
│   ├── layout/           # 布局组件
│   ├── templates/        # 页面模板组件
│   ├── {module}/         # 模块专用组件
│   └── index.ts          # 统一导出
├── pages/                # 页面
│   └── {module}/         # 模块页面（如 crm/, srm/）
├── routes/               # 路由配置
│   ├── index.ts          # 统一导出
│   └── {module}.ts       # 模块路由（如 crm.ts, srm.ts）
├── hooks/                # 自定义 Hooks
├── store/                # 状态管理
├── utils/                # 工具函数
└── config/               # 配置
```

**大文件拆分标准**（**强制执行**）：
- 超过 500 行的 API 文件**必须**拆分为子目录结构
- 按功能/资源模块拆分，每个文件不超过 500 行
- 使用 `index.ts` 作为 barrel export，保持向后兼容
- 聚合 API 对象（如 `ehsApi`, `qmsApi`）在 `index.ts` 中通过展开合并维护
- 拆分后原文件保留为 re-export 代理，确保导入路径不变
- 拆分模式参考 `api/lims/`、`api/ehs/` 的目录结构

---

## 2. 命名规范

### 2.1 目录命名

- 全小写，使用 kebab-case
- 简洁明了，使用通用术语
- 示例：`user-management`, `order-history`

### 2.2 文件命名

**后端 Rust 文件：**
- 全小写，使用 snake_case
- 资源文件使用复数形式：`suppliers.rs`, `orders.rs`
- 模型文件与表名对应：`supplier.rs`, `order.rs`
- API 路由文件：`{resource}.rs`

**前端 TypeScript/React 文件：**
- 组件文件：PascalCase，与组件名一致：`UserTable.tsx`
- 工具/API 文件：kebab-case：`api-client.ts`, `permission-interceptor.ts`
- 类型定义：`types.ts`
- 目录下的 barrel export：`index.ts`

### 2.3 API 路径命名

**基础格式**：
- 全小写，使用 kebab-case
- 统一使用 `/api/{service}/{resource}` 格式
- 资源使用复数形式：`/api/srm/suppliers`, `/api/crm/customers`
- 嵌套资源：`/api/srm/suppliers/{id}/evaluations`
- 动作路径：`/api/srm/suppliers/{id}/activate`

**带版本号的路径**（**强制执行**）：
- 唯一合法格式：`/api/v{n}/{service}/{resource}`
- 示例：`/api/v1/crm/customers`、`/api/v2/srm/suppliers`
- 版本号后**必须**有服务名，禁止 `/api/v1/xxx` 这种只有版本号没有服务名的路径
- portal、unified-core 等聚合服务也必须带服务名前缀

**禁止的路径格式**：
- ❌ 路径层级不足：`/api/addressbook`（缺少服务名）
- ❌ 使用点号分隔：`/api/hrm.positions`（应使用斜杠）
- ❌ 版本号后无服务名：`/api/v1/todos`（应是 `/api/v1/portal/todos`）

**通用功能路径例外**：
以下通用功能路径允许跨服务实现，不视为违规：
- `/api/v1/auth/login` - 认证登录
- `/api/v1/auth/register` - 认证注册
- `/api/v1/auth/refresh` - Token 刷新
- `/api/v1/audit-logs` - 审计日志
- `/api/v1/notifications` - 通知
- `/health` - 健康检查
- `/api/info` - 服务信息
- `/api/plugins` - 插件列表

**聚合服务路径例外**：
以下聚合服务的路径因设计原因允许使用 `/api/v{n}/{resource}` 格式（版本号后直接跟资源名，跳过服务名）：

| 服务 | 允许的路径模式 | 说明 |
|------|---------------|------|
| **portal** | `/api/v1/services`, `/api/v1/user`, `/api/v1/todos`, `/api/v1/monitoring/*` | 统一门户服务，聚合所有子服务信息，作为统一入口 |
| **unified-core** | `/api/v1/auth/*`, `/api/v1/notifications` | 统一核心服务，提供 IAM/认证/通知等基础能力 |

**例外说明**：
- 聚合服务作为平台级入口，其路径设计强调简洁性和统一访问
- unified-core 已同时提供标准格式路径（`/api/iam/`）作为兼容方案
- 新开发的聚合服务建议优先使用 `/api/v{n}/{service}/{resource}` 标准格式
- 现有聚合服务路径可保持不变，但建议逐步迁移到标准格式

### 2.4 数据库命名

- Schema 名：`plugin_{service}`（如 `plugin_srm`, `plugin_crm`）
- 表名：snake_case，复数形式：`suppliers`, `purchase_orders`
- 列名：snake_case：`supplier_name`, `created_at`
- 主键：统一使用 `id` (UUID)
- 时间戳：统一使用 `created_at`, `updated_at`

### 2.5 前端命名规范

**组件命名**：
- PascalCase，文件名与组件名完全一致
- 页面组件后缀：`{Name}Page`（如 `SupplierListPage`）
- 模态框后缀：`{Name}Modal`
- 表单后缀：`{Name}Form`
- 卡片后缀：`{Name}Card`

**变量与函数**：
- 变量/函数：camelCase
- 常量：UPPER_SNAKE_CASE
- 类型/接口：PascalCase
- 枚举成员：UPPER_SNAKE_CASE

**导入路径**：
- 强制使用 `@/` 别名，禁止使用相对父级路径（`../`）
- 导入排序：内置模块 → 第三方库 → 内部模块（`@/`） → 同级模块

---

## 3. 分层架构规范

### 3.1 后端分层职责

| 层级 | 职责 | 示例 |
|------|------|------|
| API Layer | 路由定义、参数校验、权限检查、响应封装 | `api/supplier.rs` |
| Service Layer | 业务逻辑、事务管理、多表操作 | `services/supplier_service.rs` |
| Model Layer | 数据结构定义、数据库操作封装 | `models/supplier.rs` |

### 3.2 调用流向

```
HTTP Request → API Handler → Service → Model → Database
```

- API 层**不直接**操作数据库
- Service 层封装业务逻辑，可跨多个 Model
- Model 层只负责单表/关联表的数据操作

### 3.3 路由注册规范

- 每个 API 模块文件提供 `create_routes() -> Router` 函数
- `api/mod.rs` 提供 `create_api_routes() -> Router` 聚合所有子模块
- `main.rs` 中统一调用 `api::create_api_routes()`

---

## 4. 组件规范

### 4.1 组件命名规则

- 使用 PascalCase
- 组件名与文件名完全一致
- 后缀明确：
  - 页面组件：`{Name}Page`（如 `SupplierListPage`）
  - 通用组件：`{Name}`（如 `DataTable`, `Button`）
  - 模态框：`{Name}Modal`（如 `EditSupplierModal`）
  - 表单：`{Name}Form`（如 `SupplierForm`）
  - 卡片：`{Name}Card`（如 `SupplierCard`）

### 4.2 组件目录组织

- 通用组件放在 `components/common/`
- 布局组件放在 `components/layout/`
- 模板组件放在 `components/templates/`
- 模块专用组件放在 `components/{module}/`
- 所有可复用组件**必须**在 `components/index.ts` 中导出
- **禁止**在 `components/` 根目录放置组件文件（统一放在子目录中）

### 4.3 重复组件清理

- 组件文件**禁止**在根目录和子目录同时存在
- 发现重复时，保留功能更完整的版本，统一导入路径
- 所有组件引用必须通过 `components/index.ts` 或具体子目录导入

---

## 5. 路由规范

### 5.1 路由文件组织

- 每个模块一个独立的路由文件：`routes/{module}.ts`
- 路由文件导出 `{module}Routes: RouteConfig[]`
- 统一在 `routes/index.ts` 中导出
- 在 `App.tsx` 中注册路由时使用 `renderRoutes()` 渲染

### 5.2 路径规范

- 前端页面路径：`/{module}/{page}`（如 `/srm/dashboard`）
- 后端 API 路径：`/api/{service}/{resource}`
- 动态参数使用 `:id` 格式
- 嵌套路由清晰反映层级关系

---

## 6. 代码组织原则

1. **单一职责**：每个文件/函数只做一件事
2. **避免重复**：DRY 原则，公共逻辑抽取到 utils 或 services
3. **分层清晰**：严格遵守分层架构，不跨层调用
4. **命名清晰**：名称反映功能，无歧义
5. **易于扩展**：预留扩展点，新增功能无需大量修改现有代码
6. **向后兼容**：结构调整时，通过 barrel export 或代理文件保持导入路径不变

---

## 7. 服务划分标准

### 7.1 已整合服务（合并）

| 整合后服务 | 包含模块 | 路径前缀 | 说明 |
|-----------|----------|----------|------|
| analytics | bi, report | /api/bi, /api/analytics/report | BI 功能 + 正式报表 |
| quality-assurance | qms, lims, ehs | /api/qa/* | 质量、实验室、安全健康 |
| manufacturing | mes, pdm | /api/mfg/* | 制造执行 + 产品数据 |

### 7.2 独立服务

| 服务 | 路径前缀 | 说明 |
|------|----------|------|
| iam | /iam | 身份认证与授权 |
| hrm | /hrm | 人力资源 |
| crm | /crm | 客户关系 |
| erp | /erp | 企业资源 |
| srm | /srm | 供应商关系 |
| scm | /scm | 供应链 |
| wms | /wms | 仓储管理 |
| pm | /pm | 项目管理 |
| rd | /rd | 研发管理 |
| ai | /ai | AI 服务 |
| gis | /gis | 地理信息 |
| workflow | /flow | 工作流（前端统一使用 workflow 命名） |
| integration | /integration | 系统集成 |

---

## 8. CI/CD 规范

### 8.1 GitHub Actions 工作流

| 工作流 | 触发条件 | 检查内容 |
|--------|----------|----------|
| code-quality.yml | push, PR | API 路径唯一性、组件命名规范 |
| frontend-test.yml | push, PR (apps/web/*) | TypeScript 类型检查、ESLint、测试、覆盖率 |
| backend-test.yml | push, PR (svc/*) | cargo check, fmt, clippy, test |

### 8.2 工作流要求

- 使用路径过滤，仅在相关代码变更时触发
- 配置 pnpm/cargo 缓存，加速构建
- 失败时阻止合并，并生成清晰的错误报告
- 覆盖率报告作为构建产物保留 7 天

---

## 9. Pre-commit Hook 规范

### 9.1 配置

- 使用 **husky** + **lint-staged**
- 自动安装：`package.json` 中添加 `prepare: "husky install"`

### 9.2 检查内容

**前端（暂存的 .ts/.tsx 文件）**：
- ESLint `--fix`
- Prettier `--write`
- 组件命名检查（仅当 .tsx 文件变更时）

**后端（暂存的 .rs 文件）**：
- `cargo fmt`
- API 路径检查（仅当 Rust 文件变更时）

**通用**：
- 禁止提交 >500KB 的文件
- 禁止提交密码/密钥等敏感信息（正则检查）

### 9.3 使用规范

- 只对**暂存文件**运行检查（lint-staged 特性）
- 检查失败时阻止 commit，显示清晰的错误信息
- 紧急情况下可使用 `git commit --no-verify` 跳过（不推荐）

---

## 10. ESLint 规范

### 10.1 命名规范规则

| 规则 | 强度 | 说明 |
|------|------|------|
| `@typescript-eslint/naming-convention` | warn | 变量 camelCase/UPPER_CASE，函数 camelCase/PascalCase，类型 PascalCase |
| `check-file/filename-naming-convention` | warn | 组件文件 PascalCase (.tsx)，工具文件 camelCase (.ts) |

### 10.2 导入规范规则

| 规则 | 强度 | 说明 |
|------|------|------|
| `import-x/order` | warn | 内置 → 外部 → 内部 → 父级 → 同级，字母序排列 |
| `import-x/no-relative-parent-imports` | warn | 禁止 `../` 相对父级导入，强制使用 `@/` |
| `import-x/no-cycle` | warn | 禁止循环依赖 |
| `import-x/no-duplicates` | warn | 禁止重复导入 |

### 10.3 代码质量规则

| 规则 | 强度 | 说明 |
|------|------|------|
| `@typescript-eslint/no-explicit-any` | warn | 禁止 `any` 类型 |
| `no-console` | warn | 禁止 `console.log`（允许 warn/error/info） |
| `@typescript-eslint/no-unused-vars` | warn | 禁止未使用的变量（允许 `_` 前缀） |
| `prefer-const` | warn | 优先使用 `const` |
| `no-var` | error | 禁止使用 `var` |

---

## 11. 自动化工具清单

| 工具 | 位置 | 用途 | 使用方式 |
|------|------|------|----------|
| API 路径扫描 | `scripts/scan_api_paths.py` | 扫描所有后端路由 | `python scripts/scan_api_paths.py` |
| 前后端对应检查 | `scripts/check_api_correspondence.py` | 验证前后端 API 对应 | `python scripts/check_api_correspondence.py` |
| API 路径 CI 检查 | `scripts/check_api_duplicates_ci.py` | CI 集成路径唯一性 | `python scripts/check_api_duplicates_ci.py --ci` |
| 组件命名检查 | `scripts/check_component_naming.py` | 组件命名规范检查 | `python scripts/check_component_naming.py --ci` |

---

## 12. 合规检查清单

### 12.1 后端检查项

- [ ] 所有服务采用 `api/ + models/ + services/` 标准目录结构
- [ ] `api/mod.rs` 提供 `create_api_routes()` 函数
- [ ] `main.rs` 使用 `api::create_api_routes()` 注册路由
- [ ] 没有已退役服务的活跃代码（应重命名为 `.deprecated`）
- [ ] API 路径符合 `/api/{service}/{resource}` 格式
- [ ] 数据库表名使用 `plugin_{service}` schema
- [ ] 同一服务内无重复路由（多二进制服务的基础路由除外）
- [ ] 跨服务无重复路径（通用功能如 auth/login 除外）

### 12.2 前端检查项

- [ ] API 大文件（>500行）已拆分为子目录结构
- [ ] 组件文件使用 PascalCase，与组件名一致
- [ ] 组件文件统一放在 `components/` 子目录中，不在根目录
- [ ] 导入路径使用 `@/` 别名，不使用 `../`
- [ ] 所有可复用组件在 `components/index.ts` 中导出
- [ ] 路由按模块拆分，每个模块独立文件
- [ ] 命名统一（如 flow → workflow）

### 12.3 CI/CD 检查项

- [ ] GitHub Actions 工作流配置完整
- [ ] Pre-commit Hook 配置正确
- [ ] ESLint 规则配置完整
- [ ] 自动化工具脚本可正常运行

---

## 附录 A：标准迭代记录

| 版本 | 日期 | 变更内容 |
|------|------|----------|
| 1.0 | - | 初始版本，基础目录结构和命名规范 |
| 2.0 | 2026-06-26 | 新增大文件拆分标准、CI/CD 规范、Pre-commit 规范、ESLint 规范、服务合并记录、合规检查清单 |
| 2.1 | 2026-06-26 | 大文件拆分从建议提升为强制执行；明确 API 版本号路径唯一合法格式；放宽通用功能跨服务重复限制；新增 8 条通用功能路径例外清单 |

---

## 附录 B：遗留问题与待办

### 前端待办

1. **大文件拆分**：以下文件仍超过 500 行，**必须**拆分（强制执行）：
   - `rs.ts` (1,159 行)
   - `consolidation-contract.ts` (916 行)
   - `hrm.ts` (875 行)
   - `finance.ts` (853 行)
   - `workflow.ts` (729 行)
   - `gis.ts` (679 行)
   - `bi.ts` (673 行)
   - `external-erp.ts` (638 行)
   - `integration.ts` (570 行)
   - `plugin.ts` (564 行)
   - `iam.ts` (526 行)

2. **ESLint 规则升级**：当前所有新增规则为 warn 级别，团队适应后可逐步提升为 error

### 后端待办

1. **目录结构转换**：以下服务仍需转换为标准架构：
   - `unified-core`（使用 modules/shared 模式）
   - `portal`（无 api/models/services 结构）
   - `doc`、`mail`（结构简单，需评估）

2. **API 路径规范化**：以下路径不符合标准，需逐步修复：
   - `/api/v1/services` → 应改为 `/api/portal/v1/services`
   - `/api/v1/todos` → 应改为 `/api/portal/v1/todos`
   - `/api/v1/user` → 应改为 `/api/portal/v1/user`
   - `/api/v1/notifications` (portal) → 应改为 `/api/portal/v1/notifications`
   - `/api/v1/notifications` (unified-core) → 应改为 `/api/unified-core/v1/notifications`

   > 注：`/api/hrm.positions` 和 `/api/addressbook` 已在 v2.1 中修复

3. **跨服务重复路径**：以下通用功能路径**允许**跨服务实现（见 2.3 节通用功能路径例外），不视为违规：
   - `/api/v1/audit-logs`（scm, wms）
   - `/api/v1/auth/*`（pm, unified-core）
   - `/api/v1/notifications`（portal, unified-core）
   - `/health`（所有服务）
   - `/api/info`（所有服务）
   - `/api/plugins`（所有服务）
