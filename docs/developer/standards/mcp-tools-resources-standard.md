# TOPEMS MCP 工具与资源标准化规范

**版本**：V1.0  
**日期**：2026-08-28  
**状态**：正式发布  
**适用范围**：TOPEMS 平台所有 MCP（Model Context Protocol）工具、资源、提示词

---

## 1. 概述

### 1.1 目的

本规范定义了 TOPEMS 平台中 MCP 工具、资源、提示词的命名、结构、文档和错误处理标准，确保所有 MCP 组件具有一致的接口设计、完整的文档和可预测的行为。

### 1.2 适用范围

本规范适用于：
- 所有业务模块的 MCP 工具定义
- 所有 MCP 资源定义
- 所有 MCP 提示词模板
- MCP 服务器实现
- MCP 客户端集成

---

## 2. 命名规范

### 2.1 工具命名规范

**格式**：`{业务域}_{操作}_{对象}`

**示例**：
- `erp_create_sales_order` - ERP 模块创建销售订单
- `finance_get_voucher` - 财务模块获取凭证
- `crm_update_customer` - CRM 模块更新客户信息
- `wms_query_inventory` - WMS 模块查询库存

**命名规则**：
1. 全部使用小写字母
2. 单词之间使用下划线 `_` 分隔
3. 业务域使用模块缩写（3-5 个字母）
4. 操作使用动词（create/get/update/delete/query/list/execute）
5. 对象使用名词（单数形式）
6. 名称长度不超过 50 个字符

**业务域缩写表**：

| 业务域 | 缩写 | 说明 |
|--------|------|------|
| 企业资源计划 | erp | Enterprise Resource Planning |
| 财务管理 | finance | Finance Management |
| 客户关系管理 | crm | Customer Relationship Management |
| 仓库管理 | wms | Warehouse Management System |
| 人力资源 | hrm | Human Resource Management |
| 项目管理 | pm | Project Management |
| 制造执行 | mes | Manufacturing Execution System |
| 供应链 | scm | Supply Chain Management |
| 系统管理 | sys | System Management |
| 统一核心 | core | Unified Core |
| AI 智能 | ai | Artificial Intelligence |

**操作动词表**：

| 操作 | 动词 | 说明 |
|------|------|------|
| 创建 | create | 创建新记录 |
| 获取 | get | 获取单条记录 |
| 更新 | update | 更新记录 |
| 删除 | delete | 删除记录 |
| 查询 | query | 条件查询 |
| 列表 | list | 获取列表 |
| 执行 | execute | 执行操作 |
| 导入 | import | 导入数据 |
| 导出 | export | 导出数据 |
| 审批 | approve | 审批操作 |
| 统计 | stats | 统计数据 |

### 2.2 资源命名规范

**格式**：`{业务域}://{资源类型}/{资源标识}`

**示例**：
- `erp://sales-order/SO-2026-001` - ERP 销售订单
- `finance://voucher/V-2026-001` - 财务凭证
- `crm://customer/C-001` - CRM 客户

### 2.3 提示词命名规范

**格式**：`{业务域}_{场景}_{用途}`

**示例**：
- `erp_sales_order_analysis` - ERP 销售订单分析
- `finance_voucher_generation` - 财务凭证生成
- `crm_customer_service_reply` - CRM 客户服务回复

---

## 3. 工具 Schema 规范

### 3.1 输入 Schema

每个工具必须定义完整的输入 Schema，包括：

```json
{
  "name": "erp_create_sales_order",
  "description": "创建销售订单",
  "inputSchema": {
    "type": "object",
    "properties": {
      "customer_id": {
        "type": "string",
        "description": "客户 ID",
        "minLength": 1,
        "maxLength": 50
      },
      "items": {
        "type": "array",
        "description": "订单商品列表",
        "items": {
          "type": "object",
          "properties": {
            "product_id": {"type": "string", "description": "商品 ID"},
            "quantity": {"type": "integer", "description": "数量", "minimum": 1},
            "price": {"type": "number", "description": "单价", "minimum": 0}
          },
          "required": ["product_id", "quantity", "price"]
        },
        "minItems": 1
      },
      "remark": {
        "type": "string",
        "description": "备注",
        "maxLength": 500
      }
    },
    "required": ["customer_id", "items"]
  }
}
```

**输入 Schema 规则**：
1. 必须指定 `type`
2. 每个字段必须有 `description`
3. 字符串字段指定 `minLength`/`maxLength`
4. 数字字段指定 `minimum`/`maximum`
5. 数组字段指定 `items` 和 `minItems`/`maxItems`
6. 必填字段在 `required` 数组中声明
7. 使用枚举时指定 `enum`

### 3.2 输出 Schema

推荐使用统一响应结构：

```json
{
  "success": true,
  "code": "SUCCESS",
  "message": "操作成功",
  "data": {
    "order_id": "SO-2026-001",
    "order_no": "SO202608280001",
    "created_at": "2026-08-28T10:00:00Z"
  },
  "metadata": {
    "request_id": "req-abc123",
    "processing_time_ms": 150,
    "timestamp": "2026-08-28T10:00:00Z"
  }
}
```

---

## 4. 错误码规范

### 4.1 错误码格式

**格式**：`{业务域}_{错误类型}_{序号}`

**示例**：
- `ERP_VALIDATION_001` - ERP 验证错误
- `FINANCE_AUTH_001` - 财务认证错误
- `CRM_NOT_FOUND_001` - CRM 未找到错误

### 4.2 错误类型

| 类型 | 说明 | HTTP 状态码 |
|------|------|-------------|
| `VALIDATION` | 参数验证错误 | 400 |
| `AUTH` | 认证错误 | 401 |
| `PERMISSION` | 权限错误 | 403 |
| `NOT_FOUND` | 资源未找到 | 404 |
| `CONFLICT` | 资源冲突 | 409 |
| `RATE_LIMIT` | 限流错误 | 429 |
| `INTERNAL` | 内部错误 | 500 |
| `SERVICE_UNAVAILABLE` | 服务不可用 | 503 |

### 4.3 错误响应格式

```json
{
  "success": false,
  "code": "ERP_VALIDATION_001",
  "message": "客户 ID 不能为空",
  "data": null,
  "error": {
    "type": "VALIDATION",
    "field": "customer_id",
    "details": "客户 ID 是必填字段",
    "suggestion": "请提供有效的客户 ID"
  },
  "metadata": {
    "request_id": "req-abc123",
    "timestamp": "2026-08-28T10:00:00Z"
  }
}
```

---

## 5. 文档规范

### 5.1 工具文档要求

每个工具必须包含以下文档信息：

1. **名称**：工具名称（符合命名规范）
2. **描述**：清晰的功能描述（1-3 句话）
3. **参数说明**：每个参数的类型、含义、是否必填、约束条件
4. **返回值说明**：返回数据结构和字段说明
5. **错误码**：可能返回的错误码及含义
6. **使用示例**：至少一个调用示例
7. **注意事项**：使用限制、副作用、并发注意事项等

### 5.2 文档模板

```markdown
## 工具：erp_create_sales_order

**描述**：创建新的销售订单

**参数**：
- `customer_id` (string, 必填)：客户 ID
- `items` (array, 必填)：订单商品列表
  - `product_id` (string, 必填)：商品 ID
  - `quantity` (integer, 必填)：数量，最小值 1
  - `price` (number, 必填)：单价，最小值 0
- `remark` (string, 可选)：备注，最大 500 字符

**返回值**：
- `order_id` (string)：订单 ID
- `order_no` (string)：订单编号
- `created_at` (string)：创建时间（ISO 8601）

**错误码**：
- `ERP_VALIDATION_001`：客户 ID 不能为空
- `ERP_NOT_FOUND_001`：客户不存在

**示例**：
```json
{
  "customer_id": "C-001",
  "items": [
    {"product_id": "P-001", "quantity": 2, "price": 99.99}
  ],
  "remark": "加急订单"
}
```

**注意事项**：
- 创建订单后会自动扣减库存
- 订单创建后状态为"待审核"
```

---

## 6. 安全规范

### 6.1 权限控制

1. 每个工具必须声明所需权限
2. 权限格式：`{业务域}:{资源}:{操作}`
3. 示例：`erp:sales-order:create`
4. 工具执行前必须验证用户权限
5. 未授权访问返回 `PERMISSION` 错误

### 6.2 数据脱敏

1. 敏感字段必须脱敏处理
2. 敏感字段包括：密码、密钥、身份证号、银行卡号、手机号
3. 脱敏规则：
   - 手机号：`138****1234`
   - 身份证：`110***********1234`
   - 银行卡：`6222 **** **** 1234`
4. 日志中不得记录敏感数据

### 6.3 输入验证

1. 所有输入参数必须验证
2. 字符串长度限制
3. 数字范围限制
4. 防止 SQL 注入、XSS、命令注入
5. 使用参数化查询

### 6.4 审计日志

1. 所有工具调用必须记录审计日志
2. 日志内容：调用时间、用户 ID、工具名称、参数摘要、结果状态、耗时
3. 审计日志保留时间：不少于 1 年
4. 审计日志不可篡改

---

## 7. 性能规范

### 7.1 响应时间

| 工具类型 | 目标响应时间 | 最大响应时间 |
|----------|-------------|-------------|
| 查询类 | < 500ms | < 2s |
| 创建/更新类 | < 1s | < 5s |
| 删除类 | < 500ms | < 2s |
| 复杂计算类 | < 5s | < 30s |
| 批量操作类 | < 10s | < 60s |

### 7.2 并发限制

1. 每个用户每分钟最多调用 100 次
2. 每个租户每分钟最多调用 1000 次
3. 超过限制返回 `RATE_LIMIT` 错误
4. 批量操作应支持分页和异步处理

---

## 8. 版本管理

### 8.1 版本号格式

使用语义化版本：`MAJOR.MINOR.PATCH`

- **MAJOR**：不兼容的 API 变更
- **MINOR**：向下兼容的功能新增
- **PATCH**：向下兼容的问题修复

### 8.2 版本变更规则

1. 新增可选参数：MINOR 版本
2. 新增必填参数：MAJOR 版本
3. 删除参数：MAJOR 版本
4. 修改参数类型：MAJOR 版本
5. 修复 Bug：PATCH 版本
6. 废弃参数：先标记 deprecated，下一个 MAJOR 版本删除

---

## 9. 检查清单

### 9.1 工具发布检查清单

- [ ] 工具名称符合命名规范
- [ ] 工具描述清晰完整
- [ ] 输入 Schema 完整定义
- [ ] 输出格式符合规范
- [ ] 错误码定义完整
- [ ] 文档完整（参数、返回值、错误码、示例）
- [ ] 权限声明正确
- [ ] 输入验证实现
- [ ] 敏感数据脱敏
- [ ] 审计日志记录
- [ ] 单元测试通过（覆盖率 > 80%）
- [ ] 集成测试通过
- [ ] 性能测试达标
- [ ] 版本号正确
- [ ] CHANGELOG 更新

---

## 附录 A：工具定义模板

```rust
/// 创建销售订单
///
/// 为指定客户创建新的销售订单。
///
/// # 参数
/// * `customer_id` - 客户 ID（必填）
/// * `items` - 订单商品列表（必填）
/// * `remark` - 备注（可选）
///
/// # 返回
/// 返回创建的订单信息，包含订单 ID、订单编号和创建时间。
///
/// # 错误
/// * `ERP_VALIDATION_001` - 客户 ID 不能为空
/// * `ERP_NOT_FOUND_001` - 客户不存在
///
/// # 权限
/// 需要 `erp:sales-order:create` 权限
#[tool(
    name = "erp_create_sales_order",
    description = "创建销售订单",
    version = "1.0.0"
)]
async fn create_sales_order(
    customer_id: String,
    items: Vec<OrderItem>,
    remark: Option<String>,
) -> Result<SalesOrder, ToolError> {
    // 实现逻辑
}
```

---

*文档结束*
