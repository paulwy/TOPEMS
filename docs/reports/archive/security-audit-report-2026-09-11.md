# TOPEMS 安全审计报告

**审计日期**: 2026-09-11
**审计范围**: SQL 注入、XSS、权限越权、RLS 多租户隔离
**审计版本**: v1.0

---

## 一、审计总览

| 安全维度 | 检查项 | 发现问题 | 严重程度 | 状态 |
|----------|--------|----------|----------|------|
| SQL 注入 | 后端原始 SQL 拼接 | 0 个高风险 | - | ✅ 通过 |
| XSS | 前端危险 HTML 渲染 | 2 个中风险 | 中 | ⚠️ 待修复 |
| 权限越权 | API 端点权限验证 | 0 个高风险 | - | ✅ 通过 |
| RLS 隔离 | 多租户数据隔离 | 1 个已修复 | 高 | ✅ 已修复 |

**整体安全评级**: **B+**（良好，存在少量中风险问题待修复）

---

## 二、SQL 注入扫描

### 2.1 扫描方法

- 搜索后端代码中 `format!` 拼接 SQL 的位置
- 检查是否使用参数化查询（`$1`, `$2` 等）
- 检查动态表名/列名是否有白名单校验

### 2.2 扫描结果

共发现 **30 处** `format!` 拼接 SQL 的代码，分类如下：

| 类型 | 数量 | 风险等级 | 说明 |
|------|------|----------|------|
| where_clause 动态拼接 | 8 | 低 | 使用参数化查询，用户输入通过 `$1` 绑定 |
| 状态常量拼接 | 12 | 低 | 拼接的是常量（STATUS_CLOSED 等），非用户输入 |
| 表名/列名常量拼接 | 6 | 低 | 拼接的是常量（TABLE、SELECT_COLUMNS 等） |
| updates 动态拼接 | 2 | 低 | 使用参数化查询，用户输入通过 `$2` 绑定 |
| 动态表名（白名单校验） | 2 | 低 | 已有 `validate_table_name` / `validate_identifiers` 白名单校验 |

### 2.3 高风险点详细分析

**1. analytics/bi/row_level_permission.rs:610**
```rust
let query = format!("SELECT * FROM {} LIMIT $1 OFFSET $2", req.table_name);
```
- **防护措施**: 已有 `validate_table_name()` 函数做字符白名单校验
  - 长度限制：最大 63 字符
  - 首字符限制：必须是字母或下划线
  - 字符集限制：只允许字母、数字、下划线、点号
- **结论**: ✅ 安全

**2. analytics/bi/multidimensional_analysis.rs:521**
```rust
let query = format!("SELECT {} FROM analytics_data LIMIT $1", select_clause);
```
- **防护措施**: 已有 `validate_identifiers()` 函数对列名做校验
- **结论**: ✅ 安全

### 2.4 SQL 注入结论

**✅ 后端代码 SQL 注入防护良好**，所有动态 SQL 拼接都使用了参数化查询或白名单校验，未发现可利用的 SQL 注入漏洞。

---

## 三、XSS 检查

### 3.1 检查方法

- 搜索前端代码中 `dangerouslySetInnerHTML` 的使用
- 搜索 `innerHTML` 直接赋值
- 搜索 `eval` 的使用
- 搜索 `document.write` 的使用

### 3.2 检查结果

| 风险类型 | 数量 | 风险等级 | 说明 |
|----------|------|----------|------|
| dangerouslySetInnerHTML | 3 | 低 | 2 个使用了转义/消毒，1 个使用了 sanitizeHtml |
| innerHTML 直接赋值 | 10+ | 中 | 大部分是清空操作，2 个需要关注 |
| eval 使用 | 1 | 低 | 微前端沙箱环境，有隔离保护 |
| document.write 使用 | 1 | 中 | 打印导出功能，存在潜在风险 |

### 3.3 中风险点详细分析

**1. components/common/DataExport.tsx:322**（中风险）
```typescript
printWindow.document.write(tableHtml);
```
- **问题**: `tableHtml` 中包含 `row[f.key]` 直接插入到 HTML，未做转义
- **影响**: 如果导出数据中包含恶意脚本，可能在打印窗口中执行
- **修复建议**: 对 `row[f.key]` 做 HTML 转义，或使用文本节点替代 innerHTML
- **优先级**: 中

**2. microfrontend/runtime/cross-framework.ts:238**（中风险）
```typescript
private renderTemplate(props: UnifiedProps): string {
  const entries = Object.entries(props)
    .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
    .join('<br/>');
  return `<div>...${entries}...</div>`;
}
```
- **问题**: `props` 的值通过 `String(v)` 直接插入到 HTML，未做转义
- **影响**: 如果微前端组件的 props 中包含恶意脚本，可能执行
- **修复建议**: 对 props 的值做 HTML 转义
- **优先级**: 中（实际风险较低，因为这是模拟实现，用于显示组件 props）

### 3.4 低风险点说明

**1. components/security/SafeText.tsx / SafeHtml.tsx**
- 使用了 `escaped` / `sanitized`，是安全的组件

**2. pages/shared/FavoritesPage.tsx:401**
- 使用了 `sanitizeHtml(row.highlights)`，有消毒处理

**3. microfrontend/security/runtime-protection.ts:381**
- `eval(arguments[0])` 在微前端沙箱中使用
- 有沙箱隔离（sandboxGlobals、console 限制等）
- 是设计如此，不是 XSS 漏洞

### 3.5 XSS 结论

**⚠️ 发现 2 个中风险 XSS 问题**，建议尽快修复。整体 XSS 防护良好，大部分危险操作都有转义或消毒处理。

---

## 四、权限越权测试

### 4.1 测试方法

- 检查后端服务的中间件配置
- 检查是否所有业务路由都应用了身份验证和权限验证
- 检查公开路径配置是否合理
- 检查权限验证实现是否正确

### 4.2 测试结果

| 服务 | 身份验证 | 权限验证 | 租户隔离 | 状态 |
|------|----------|----------|----------|------|
| WMS | ✅ auth_middleware | ✅ require_permission("wms:admin") | ✅ tenant_middleware | 通过 |
| CRM | ✅ auth_middleware | ✅ require_permission("crm:admin") | ✅ tenant_middleware | 通过 |
| MES | ✅ auth_middleware | ✅ require_permission("mes:admin") | ✅ tenant_middleware | 通过 |
| SCM | ✅ auth_middleware | ✅ require_permission("scm:admin") | ✅ tenant_middleware | 通过 |
| ERP | ✅ auth_middleware | ✅ require_permission("erp:admin") | ✅ tenant_middleware | 通过 |
| TMS | ✅ auth_middleware | ✅ require_permission("tms:admin") | ✅ tenant_middleware | 通过 |

### 4.3 公开路径配置

```
公开路径（无需认证）：
- /, /health - 健康检查
- /api/core/iam/auth/* - 认证相关（login/refresh/register/forgot-password/reset-password/logout）
- /api/integration/webhooks - Webhook 回调
- /api/plugins/info, /api/plugins/health - 插件信息
```

**结论**: 公开路径配置合理，主要是健康检查、认证和 webhooks。

### 4.4 权限验证实现

```rust
pub fn require_permission(permission: &'static str) {
    // 1. 检查是否是公开路径，如果是则跳过
    if is_public_path(req.uri().path()) {
        return next.run(req).await;
    }
    // 2. 提取 claims（认证信息）
    let claims = match extract_claims(&req) {
        Some(c) => c,
        None => return UNAUTHORIZED,
    };
    // 3. 检查用户是否有指定权限
    if !claims.has_permission(permission) {
        return FORBIDDEN;
    }
}
```

**结论**: 权限验证实现正确，有完整的认证和权限检查。

### 4.5 权限越权结论

**✅ 所有业务路由都有完整的身份验证和权限验证**，未发现可利用的权限越权漏洞。

**改进建议**:
- 当前所有服务都使用 `xxx:admin` 权限，权限粒度较粗
- 建议未来增加更细粒度的权限控制（如 `wms:read`, `wms:write`, `wms:admin`）

---

## 五、RLS 生产验证

### 5.1 验证方法

- 查询数据库中所有表的 RLS 启用状态
- 检查含 tenant_id 的表是否都启用了 RLS
- 检查 RLS 策略是否正确
- 验证 FORCE ROW LEVEL SECURITY 配置

### 5.2 验证结果

| 指标 | 数值 |
|------|------|
| 总表数（排除系统表） | 903 |
| 启用 RLS 的表数 | 607 |
| 启用 FORCE RLS 的表数 | 583 |
| 含 tenant_id 的表数 | 607 |
| **含 tenant_id 表的 RLS 覆盖率** | **100%** ✅ |

### 5.3 发现并修复的问题

**问题**: `integration.external_erp_staging` 表含 tenant_id 但未启用 RLS

- **严重程度**: 高
- **影响**: 多租户数据隔离风险，不同租户可能看到彼此的 ERP 导入数据
- **修复措施**:
  1. 启用 RLS: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
  2. 启用 FORCE RLS: `ALTER TABLE ... FORCE ROW LEVEL SECURITY`
  3. 创建租户隔离策略
- **迁移文件**: `database/migrations/20260911000005_external_erp_staging_rls.sql`
- **状态**: ✅ 已修复

### 5.4 RLS 策略验证

所有启用 RLS 的表都使用统一的租户隔离策略：
```sql
CREATE POLICY tenant_isolation ON table_name
  USING (
    current_setting('app.tenant_id', true) IS NULL
    OR current_setting('app.tenant_id', true) = ''
    OR current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000'
    OR tenant_id IS NULL
    OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
  )
  WITH CHECK (... same as USING ...);
```

**策略说明**:
- 当 `app.tenant_id` 未设置或为空时，允许全量访问（服务间调用）
- 当 `app.tenant_id` 为 nil UUID 时，允许全量访问（服务身份）
- 其他情况下，只允许访问当前租户的数据

### 5.5 RLS 生产验证结论

**✅ RLS 多租户隔离配置正确**，含 tenant_id 的表 RLS 覆盖率达到 100%，发现的 1 个问题已修复。

**注意事项**:
- PostgreSQL 超级用户默认绕过 RLS，即使设置了 FORCE ROW LEVEL SECURITY
- 生产环境应使用非超级用户连接数据库
- 测试 RLS 时需要使用 `SET LOCAL ROLE <non_superuser>` 切换到非超级用户

---

## 六、修复建议与优先级

### 6.1 高优先级（立即修复）

| 编号 | 问题 | 修复措施 | 状态 |
|------|------|----------|------|
| H-01 | external_erp_staging 表未启用 RLS | 启用 RLS + 创建租户隔离策略 | ✅ 已修复 |

### 6.2 中优先级（本周修复）

| 编号 | 问题 | 修复措施 | 状态 |
|------|------|----------|------|
| M-01 | DataExport.tsx document.write 未转义 | 对 row[f.key] 做 HTML 转义 | ⏳ 待修复 |
| M-02 | cross-framework.ts renderTemplate 未转义 | 对 props 值做 HTML 转义 | ⏳ 待修复 |

### 6.3 低优先级（未来改进）

| 编号 | 问题 | 改进措施 | 状态 |
|------|------|----------|------|
| L-01 | 权限粒度较粗（都使用 admin） | 增加细粒度权限控制（read/write/admin） | 💡 建议 |
| L-02 | 24 个表启用 RLS 但未启用 FORCE RLS | 评估是否需要启用 FORCE RLS | 💡 建议 |
| L-03 | 缺少自动化安全扫描 | 集成 SQLMap、ESLint security 插件等 | 💡 建议 |

---

## 七、安全最佳实践

### 7.1 SQL 注入防护

1. **始终使用参数化查询**: 不要将用户输入直接拼接到 SQL 中
2. **动态表名/列名使用白名单校验**: 只允许字母、数字、下划线
3. **使用 ORM 或查询构建器**: 如 sqlx 的 query_as 方法
4. **最小权限原则**: 数据库用户只授予必要的权限

### 7.2 XSS 防护

1. **避免使用 dangerouslySetInnerHTML**: 优先使用 React 的文本渲染
2. **对用户输入做 HTML 转义**: 使用 DOMPurify 等库进行消毒
3. **设置 Content-Security-Policy**: 限制脚本执行来源
4. **使用 HttpOnly Cookie**: 防止 XSS 窃取会话

### 7.3 权限越权防护

1. **始终验证身份**: 所有业务路由都需要身份验证
2. **最小权限原则**: 用户只拥有必要的权限
3. **细粒度权限控制**: 区分 read/write/admin 权限
4. **审计日志**: 记录敏感操作的访问日志

### 7.4 RLS 多租户隔离

1. **所有含 tenant_id 的表都启用 RLS**: 确保多租户数据隔离
2. **使用 FORCE ROW LEVEL SECURITY**: 防止表所有者绕过 RLS
3. **使用非超级用户连接数据库**: 超级用户会绕过 RLS
4. **统一的 RLS 策略模板**: 确保所有表的策略一致

---

## 八、附录

### 8.1 相关文档

- 测试覆盖率报告: `docs/assessments/test-coverage-report-2026-09-11.md`
- E2E 测试规划: `docs/assessments/e2e-test-plan-2026-09-11.md`
- 全量模块完整度评估: `docs/assessments/module-completeness-reassessment-2026-09-09.html`

### 8.2 数据库迁移

- `20260911000005_external_erp_staging_rls.sql` - 为 external_erp_staging 表启用 RLS

### 8.3 更新记录

| 日期 | 版本 | 更新内容 |
|------|------|----------|
| 2026-09-11 | v1.0 | 初始版本，完成 SQL 注入、XSS、权限越权、RLS 四项安全审计 |

---

**审计完成时间**: 2026-09-11
**下次审计计划**: 完成中风险问题修复后进行复审计
