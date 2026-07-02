# Vite 代理配置规范

## 1. 概述

本文档定义 TOPEMS 前端项目中 Vite 代理配置的规范和最佳实践，确保代理规则的一致性、可维护性和正确性。

## 2. 代理规则顺序原则

### 2.1 精确匹配优先

Vite 代理按照配置顺序匹配，**先匹配的规则优先**。必须遵循以下顺序：

1. **精确路径**（如 `/lims/health`）
2. **带通配符的具体路径**（如 `/lims/api/`）
3. **通用路径**（如 `/lims/`）

```typescript
// ❌ 错误：通用路径先匹配
'/lims/': { ... },
'/lims/health': { ... },

// ✅ 正确：精确路径优先
'/lims/health': { ... },
'/lims/': { ... },
```

### 2.2 优先级排序

| 优先级 | 规则类型 | 示例 |
|--------|---------|------|
| 1 | 精确路径匹配 | `/lims/health` |
| 2 | 带末尾斜杠的路径 | `/lims/api/` |
| 3 | 通用路径 | `/lims/` |
| 4 | 插件健康检查 | `/plugin-health/lims` |

## 3. 服务端口管理

### 3.1 端口定义来源

所有服务端口必须与以下文件保持一致：

- `scripts/topems.sh` - 服务启动脚本
- `apps/web/src/config/runtime.ts` - 前端服务配置
- `vite.config.ts` - Vite 代理配置

### 3.2 标准端口列表

| 服务 | 端口 | 后端目录 |
|------|------|---------|
| unified-core | 8000 | svc/unified-core |
| ERP | 8010 | svc/erp |
| AI | 8013 | svc/ai |
| Doc | 8012 | svc/doc |
| HRM | 8020 | svc/hrm |
| PM | 8023 | svc/pm |
| CRM | 8029 | svc/crm |
| MES | 8030 | svc/mes |
| PDM | 8031 | svc/pdm |
| SCM | 8040 | svc/scm |
| WMS | 8041 | svc/wms |
| SRM | 8042 | svc/srm |
| QMS | 8050 | svc/qms |
| LIMS | 8051 | svc/lims |
| EHS | 8052 | svc/ehs |
| RS | 8053 | svc/rs |
| BI | 8060 | svc/analytics (bi) |
| Report | 8061 | svc/analytics (report) |
| Monitor | 8062 | svc/monitor |
| Portal | 8063 | svc/portal |
| Mobile | 8070 | svc/mobile |
| GIS | 8071 | svc/gis |
| Integration | 8072 | svc/integration |

### 3.3 端口验证

添加新服务或修改端口时，必须执行以下验证：

```bash
# 检查服务状态
./scripts/topems.sh status

# 验证端口监听
lsof -i :<端口号>

# 运行代理测试
./scripts/test-proxy.sh
```

## 4. 代理规则配置规范

### 4.1 标准规则模板

使用 `createServiceProxyConfig` 和 `createHealthProxyConfig` 辅助函数：

```typescript
// 1. API路径（带rewrite，转为 /api/service/xxx）
'/service/api': createServiceProxyConfig('service', 'http://localhost:<端口>'),

// 2. 健康检查（精确路径，转为 /health）
'/service/health': createHealthProxyConfig('service', 'http://localhost:<端口>'),

// 3. 通用路径（带rewrite）
'/service/': {
  target: 'http://localhost:<端口>',
  changeOrigin: true,
  rewrite: (path: string) => path.replace(/^\/service/, '/api/service'),
  configure: createProxyLogger('service', 'http://localhost:<端口>'),
},
```

### 4.2 Rewrite 规则规范

| 前端路径 | 使用函数 | Rewrite 规则 | 后端路径 |
|---------|---------|-------------|---------|
| `/erp/api/xxx` | `createServiceProxyConfig` | `/erp` → `/api/erp` | `/api/erp/xxx` |
| `/erp/health` | `createHealthProxyConfig` | `/erp` → `` | `/health` |
| `/hrm/api/xxx` | `createServiceProxyConfig` | `/hrm` → `/api/hrm` | `/api/hrm/xxx` |
| `/hrm/health` | `createHealthProxyConfig` | `/hrm` → `` | `/health` |
| `/lims/api/xxx` | `createServiceProxyConfig` | `/lims` → `/api/lims` | `/api/lims/xxx` |
| `/lims/health` | `createHealthProxyConfig` | `/lims` → `` | `/health` |
| `/plugin-health/erp/xxx` | 手动配置 | `/plugin-health/erp` → `` | `/xxx` |

### 4.3 特殊路径处理

#### IAM 认证路径

```typescript
// 登录认证 - 重写为 /api/v1/auth/
'/iam/auth/': {
  target: 'http://localhost:8000',
  changeOrigin: true,
  rewrite: (path: string) => path.replace(/^\/iam\/auth\//, '/api/v1/auth/'),
},

// IAM API - 重写为 /api/core/iam/
'/iam/': {
  target: 'http://localhost:8000',
  changeOrigin: true,
  rewrite: (path: string) => path.replace(/^\/iam\//, '/api/core/iam/'),
},
```

#### 文档服务路径

```typescript
'/doc': {
  target: 'http://localhost:8012',
  changeOrigin: true,
  rewrite: (path: string) => path.replace(/^\/doc(\/.*)$/, '/api/doc$1'),
},
```

## 5. 日志配置规范

### 5.1 必须配置日志

所有代理规则必须包含 `configure: createProxyLogger()` 配置，确保请求转发过程可追踪。

```typescript
'/service/': {
  target: 'http://localhost:8010',
  changeOrigin: true,
  rewrite: (path: string) => path.replace(/^\/service/, '/api/service'),
  configure: createProxyLogger('service', 'http://localhost:8010'),
},
```

### 5.2 日志格式

```
[Vite Proxy] SERVICE_NAME METHOD original_path -> target_url
[Vite Proxy] SERVICE_NAME METHOD original_path <- status_code
```

### 5.3 颜色编码

| 状态码 | 颜色 | 含义 |
|--------|------|------|
| 2xx | 绿色 | 成功 |
| 4xx | 黄色 | 客户端错误 |
| 5xx | 红色 | 服务端错误 |

## 6. 三段映射表维护

### 6.1 映射表结构

每个代理规则必须维护三段映射关系：

| 阶段 | 路径 | 示例 |
|------|------|------|
| 前端请求 | `/erp/assets` | 用户实际请求路径 |
| Rewrite 后 | `/api/erp/assets` | Vite 重写后的路径 |
| 后端目标 | `http://localhost:8010/api/erp/assets` | 最终转发地址 |

### 6.2 映射表示例

```
ERP 服务映射:
┌─────────────────────────┬─────────────────────────┬─────────────────────────────────────┐
│ 前端请求路径            │ Rewrite 后路径          │ 后端目标地址                        │
├─────────────────────────┼─────────────────────────┼─────────────────────────────────────┤
│ /erp/health            │ /health                 │ http://localhost:8010/health       │
│ /erp/assets            │ /api/erp/assets         │ http://localhost:8010/api/erp/assets│
│ /erp/system/dict-types │ /api/erp/dict-types     │ http://localhost:8010/api/erp/dict-types │
└─────────────────────────┴─────────────────────────┴─────────────────────────────────────┘
```

## 7. 测试验证流程

### 7.1 自动化测试

使用 `scripts/test-proxy.sh` 进行全面测试：

```bash
# 运行所有模块测试
./scripts/test-proxy.sh

# 测试结果判断标准：
# - 200 OK: 代理配置正确，后端正常响应
# - 401/403: 代理配置正确，需要认证（通过）
# - 404: 代理配置或后端路由有问题（失败）
# - 502: 后端服务未运行或不可用（失败）
```

### 7.2 手动验证

```bash
# 1. 检查服务是否运行
./scripts/topems.sh status

# 2. 测试健康检查
curl http://localhost:3000/<service>/health

# 3. 测试API路径
curl http://localhost:3000/<service>/api/xxx

# 4. 查看代理日志（Vite终端输出）
# 观察格式: [Vite Proxy] SERVICE GET /path -> http://localhost:port/path
```

## 8. 常见问题排查

### 8.1 404 错误

**原因分析：**
1. 代理规则顺序错误（通用路径先匹配）
2. Rewrite 规则不正确
3. 后端路由不存在

**排查步骤：**
```bash
# 1. 检查Vite代理日志，确认转发路径
# 2. 直接访问后端验证路径是否存在
curl http://localhost:<port>/expected/path
# 3. 检查代理规则顺序
```

### 8.2 502 错误

**原因分析：**
1. 后端服务未运行
2. 端口配置错误
3. 网络连接问题

**排查步骤：**
```bash
# 1. 检查服务状态
./scripts/topems.sh status

# 2. 检查端口监听
lsof -i :<port>

# 3. 验证端口配置是否一致
# - vite.config.ts vs scripts/topems.sh
```

### 8.3 503 错误

**原因分析：**
1. 代理目标端口错误（服务运行在其他端口）
2. 服务启动失败

**排查步骤：**
```bash
# 1. 查找服务实际监听端口
lsof -i | grep <service-name>

# 2. 更新vite.config.ts中的端口配置
```

### 8.4 特殊服务路由格式

部分服务使用不同的路由前缀格式：

| 服务 | 路由前缀 | 示例 |
|------|---------|------|
| Monitor | `/api/v1/monitor` | `/api/v1/monitor/alerts` |
| 其他服务 | `/api/{service}` | `/api/pm/projects` |

**Monitor 代理配置示例：**
```typescript
'/monitor/api': {
  target: 'http://localhost:8062',
  changeOrigin: true,
  rewrite: (path: string) => path.replace(/^\/monitor\/api/, '/api/v1/monitor'),
  configure: createProxyLogger('monitor', 'http://localhost:8062'),
},
```

### 8.5 常见错误修复案例

| 错误现象 | 根因 | 修复方案 |
|---------|------|---------|
| `/pm/api/projects` 返回 404 | rewrite 规则错误，重写为 `/api/pm/api/projects` | 修改 `createServiceProxyConfig` 规则为 `/service/api` → `/api/service` |
| `/pm/health` 返回 404 | 健康检查也使用了 API 重写规则 | 创建 `createHealthProxyConfig`，重写为 `/health` |
| `/hrm/api/employees` 返回 404 | 缺少 `/hrm/api` 规则，被 `/hrm/` 规则匹配 | 添加 `/hrm/api` 规则在通用规则之前 |
| `/monitor/api/alerts` 返回 404 | Monitor 路由前缀为 `/api/v1/monitor` | 单独配置 Monitor 的 rewrite 规则 |
| 重复代理规则 | 同一服务的代理规则定义多次 | 删除重复定义，保留包含日志配置的规则 |

## 9. 变更流程

### 9.1 添加新服务代理

```bash
# 1. 在vite.config.ts中添加代理规则
# 2. 更新scripts/test-proxy.sh添加测试用例
# 3. 运行测试验证
./scripts/test-proxy.sh
# 4. 更新文档中的端口列表和映射表
```

### 9.2 修改现有代理

```bash
# 1. 修改vite.config.ts
# 2. 运行测试验证
./scripts/test-proxy.sh
# 3. 确认所有相关服务正常运行
./scripts/topems.sh status
```

## 10. 代码审查检查清单

- [ ] 代理规则顺序是否正确（精确匹配优先）
- [ ] 端口配置是否与 `scripts/topems.sh` 一致
- [ ] 是否配置了 `createProxyLogger` 日志
- [ ] 健康检查路径是否使用 `createHealthProxyConfig`（重写为 `/health`）
- [ ] API路径是否使用 `createServiceProxyConfig`（重写为 `/api/service/xxx`）
- [ ] 是否存在重复的代理规则定义
- [ ] Rewrite 规则是否与后端路由匹配（后端路由格式为 `/api/service/xxx`）
- [ ] 是否通过了 `scripts/test-proxy.sh` 测试
- [ ] 是否更新了相关文档

## 附录：代理规则模板

```typescript
// 标准服务代理模板（推荐使用辅助函数）
'/<service>/api': createServiceProxyConfig('<service>', 'http://localhost:<port>'),
'/<service>/health': createHealthProxyConfig('<service>', 'http://localhost:<port>'),

// 通用路径（按需添加）
'/<service>/': {
  target: 'http://localhost:<port>',
  changeOrigin: true,
  rewrite: (path: string) => path.replace(/^\/<service>/, '/api/<service>'),
  configure: createProxyLogger('<service>', 'http://localhost:<port>'),
},

// Plugin Health 代理模板
'/plugin-health/<service>': {
  target: 'http://localhost:<port>',
  changeOrigin: true,
  rewrite: (path: string) => path.replace(/^\/plugin-health\/<service>/, ''),
  configure: createProxyLogger('plugin-health-<service>', 'http://localhost:<port>'),
},
```

### 辅助函数说明

```typescript
// createServiceProxyConfig - API路径代理
// 输入: /service/api/xxx → 输出: http://localhost:port/api/service/xxx
// 重写规则: /service/api → /api/service
const createServiceProxyConfig = (serviceName, target) => ({
  target,
  changeOrigin: true,
  rewrite: (path) => path.replace(new RegExp(`^/${serviceName}/api`), `/api/${serviceName}`),
  configure: createProxyLogger(serviceName, target),
});

// createHealthProxyConfig - 健康检查代理
// 输入: /service/health → 输出: http://localhost:port/health
// 重写规则: /service → 空字符串
const createHealthProxyConfig = (serviceName, target) => ({
  target,
  changeOrigin: true,
  rewrite: (path) => path.replace(new RegExp(`^/${serviceName}`), ''),
  configure: createProxyLogger(serviceName, target),
});
```

### 路径重写映射表

| 前端请求 | 重写规则 | 后端目标 |
|---------|---------|---------|
| `/pm/api/projects` | `/pm/api` → `/api/pm` | `http://localhost:8023/api/pm/projects` |
| `/pm/health` | `/pm` → `` | `http://localhost:8023/health` |
| `/erp/api/assets` | `/erp/api` → `/api/erp` | `http://localhost:8010/api/erp/assets` |
| `/erp/health` | `/erp` → `` | `http://localhost:8010/health` |