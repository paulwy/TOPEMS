# TOPEMS Finance Core 用户手册

<lark-toc />

## 1. 系统概述

### 1.1 什么是 Finance Core

Finance Core 是 TOPEMS 企业管理系统的财务核心模块，提供完整的会计核算功能，包括：

- 会计科目管理
- 凭证管理（创建、提交、审核、过账）
- 账簿查询（总账、明细账）
- 财务报表（试算平衡表、资产负债表、利润表、现金流量表）
- 辅助核算（项目、部门、客户、供应商等维度核算）
- 会计期间管理

### 1.2 核心概念

| 概念 | 说明 |
|------|------|
| 会计科目 | 核算经济业务的账户，如"银行存款"、"应收账款" |
| 凭证 | 记录经济业务发生的书面证明，包含借方和贷方 |
| 账簿 | 记录凭证信息的账册，包括总账和明细账 |
| 辅助核算 | 按项目、部门等维度进行更细化的核算 |
| 会计期间 | 财务核算的时间单位，通常为一个月 |
| 审批工作流 | 统一的审批流程，支持凭证、合并报表等多种单据类型 |

### 1.3 凭证工作流

```
[创建凭证] → [提交凭证] → [审核凭证] → [过账凭证]
     ↓            ↓            ↓            ↓
   草稿        已提交       已审核       已过账
```

### 1.4 统一审批工作流

Finance Core 提供统一的审批工作流，支持多种单据类型的审批管理：

**支持的单据类型：**
- `voucher` - 凭证
- `consolidation_report` - 合并报表
- `financial_statement` - 财务报表
- `journal_entry` - 日记账

**审批状态：**
- `pending` - 待审批
- `approved` - 已审批
- `rejected` - 已驳回
- `cancelled` - 已撤回

```
[生成报表] → [提交审批] → [待审批] → [审批通过] → [发布]
                          ↓
                     [审批驳回]
```

**ERP 整合：**

ERP 系统的合并报表审批已与 Finance Core 统一审批工作流整合。完整审批流程：

1. **生成报表** `POST /api/erp/consolidation/reports` - 创建合并报表
2. **提交审批** `POST /api/erp/consolidation/reports/{id}/submit` - 提交到 Finance Core
3. **审批通过** `POST /api/erp/consolidation/reports/{id}/approve` - 调用 Finance Core 审批
4. **发布报表** `POST /api/erp/consolidation/reports/{id}/publish` - 发布已审批报表

可通过 Finance Core 的 `/api/core/finance/approvals/pending` 接口查询所有待审批单据。

**环境配置：**

ERP 服务需要配置以下环境变量：

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `FINANCE_CORE_URL` | Finance Core 服务地址 | `http://localhost:8000` |

---

## 2. 快速开始

### 2.1 环境准备

确保已启动 unified-core 服务：

```bash
curl http://localhost:8000/health
```

正常返回：

```json
{
  "status": "healthy",
  "message": "topems-unified-core is running"
}
```

### 2.2 登录获取 Token

```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

返回的 `access_token` 用于后续 API 调用：

```json
{
  "success": true,
  "data": {
    "access_token": "eyJ0eXAiOiJKV1Q..."
  }
}
```

### 2.3 打开会计期间

创建凭证前，需要先打开会计期间：

```bash
curl -X POST http://localhost:8000/api/core/finance/periods/2026/7/open \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 3. 会计科目管理

### 3.1 创建会计科目

**请求示例：**

```bash
curl -X POST http://localhost:8000/api/core/finance/accounts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "code": "6602",
    "name": "研发费用",
    "account_type": "expense",
    "currency": "CNY",
    "description": "研发费用科目"
  }'
```

**科目类型：**

| 类型 | 说明 | 余额方向 |
|------|------|----------|
| `asset` | 资产 | 借方 |
| `liability` | 负债 | 贷方 |
| `equity` | 权益 | 贷方 |
| `income` | 收入 | 贷方 |
| `expense` | 费用 | 借方 |
| `cost` | 成本 | 借方 |

### 3.2 查询科目列表

```bash
curl http://localhost:8000/api/core/finance/accounts \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3.3 按编码查询科目

```bash
curl http://localhost:8000/api/core/finance/accounts/code/1001 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 4. 凭证管理

### 4.1 创建凭证

**请求示例：**

```bash
curl -X POST http://localhost:8000/api/core/finance/vouchers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "voucher_type": "general",
    "voucher_date": "2026-07-15",
    "description": "研发项目费用支出",
    "lines": [
      {
        "account_code": "1001",
        "description": "银行存款支出",
        "debit": "0",
        "credit": "30000.00",
        "project_id": "PROJECT_UUID"
      },
      {
        "account_code": "6602",
        "description": "研发费用",
        "debit": "30000.00",
        "credit": "0",
        "project_id": "PROJECT_UUID"
      }
    ]
  }'
```

**凭证类型：**

| 类型 | 说明 |
|------|------|
| `general` | 记账凭证 |
| `payment` | 付款凭证 |
| `receipt` | 收款凭证 |
| `transfer` | 转账凭证 |

**日期格式支持：**
- `YYYY-MM-DD`（如 `2026-07-15`）
- RFC3339 格式（如 `2026-07-15T00:00:00Z`）

### 4.2 提交凭证

将凭证从"草稿"状态提交到"已提交"状态：

```bash
curl -X POST http://localhost:8000/api/core/finance/vouchers/VOUCHER_ID/submit \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4.3 审核凭证

将凭证从"已提交"状态审核到"已审核"状态：

```bash
curl -X POST http://localhost:8000/api/core/finance/vouchers/VOUCHER_ID/approve \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4.4 过账凭证

将凭证从"已审核"状态过账到"已过账"状态，并写入账簿：

```bash
curl -X POST http://localhost:8000/api/core/finance/vouchers/VOUCHER_ID/post \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4.5 批量操作

**批量提交：**

```bash
curl -X POST http://localhost:8000/api/core/finance/vouchers/batch/submit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "voucher_ids": ["UUID1", "UUID2", "UUID3"]
  }'
```

**批量审核：**

```bash
curl -X POST http://localhost:8000/api/core/finance/vouchers/batch/approve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "voucher_ids": ["UUID1", "UUID2", "UUID3"]
  }'
```

**批量过账：**

```bash
curl -X POST http://localhost:8000/api/core/finance/vouchers/batch/post \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "voucher_ids": ["UUID1", "UUID2", "UUID3"]
  }'
```

**批量响应格式：**

```json
{
  "success": true,
  "data": {
    "success_count": 2,
    "fail_count": 1,
    "results": [
      {"voucher_id": "UUID1", "voucher_no": "记20260001", "success": true, "message": "提交成功"},
      {"voucher_id": "UUID2", "success": false, "message": "凭证状态不允许提交"}
    ]
  }
}
```

---

## 5. 账簿查询

### 5.1 查询总账

```bash
curl "http://localhost:8000/api/core/finance/ledger" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**查询参数：**

| 参数 | 说明 |
|------|------|
| `account_id` | 科目ID（可选） |
| `account_code` | 科目编码（可选） |
| `period` | 会计期间，如 `202606`（可选） |
| `start_date` | 开始日期（可选） |
| `end_date` | 结束日期（可选） |

**示例 - 查询科目 6602 在 202607 期间的明细：**

```bash
curl "http://localhost:8000/api/core/finance/ledger?account_code=6602&period=202607" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 6. 财务报表

### 6.1 试算平衡表

```bash
curl http://localhost:8000/api/core/finance/trial-balance/202606 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**响应示例：**

```json
{
  "success": true,
  "data": [
    {
      "account_code": "1001",
      "account_name": "现金",
      "account_type": "asset",
      "debit_balance": "50000.0000",
      "credit_balance": "0"
    }
  ]
}
```

### 6.2 资产负债表

```bash
curl http://localhost:8000/api/core/finance/balance-sheet/202606 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 6.3 利润表

```bash
curl http://localhost:8000/api/core/finance/income-statement/202606 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 6.4 现金流量表

```bash
curl http://localhost:8000/api/core/finance/cash-flow/202606 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**响应示例：**

```json
{
  "success": true,
  "data": {
    "period": "202606",
    "items": [
      {
        "item_code": "1002",
        "item_name": "银行存款",
        "item_type": "inflow",
        "amount": "50000.0000"
      }
    ],
    "total_inflow": "50000.0000",
    "total_outflow": "30000.0000",
    "net_change": "20000.0000",
    "opening_balance": "0",
    "closing_balance": "20000.0000"
  }
}
```

---

## 7. 辅助核算

### 7.1 辅助核算类型

| 类型 | 说明 |
|------|------|
| `project` | 项目核算 |
| `department` | 部门核算 |
| `customer` | 客户核算 |
| `supplier` | 供应商核算 |
| `employee` | 员工核算 |
| `custom1/2/3` | 自定义核算 |

### 7.2 创建辅助科目

```bash
curl -X POST http://localhost:8000/api/core/finance/aux-accounts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "aux_type": "project",
    "code": "P001",
    "name": "研发项目A",
    "description": "2026年研发项目"
  }'
```

### 7.3 查询辅助科目列表

```bash
curl "http://localhost:8000/api/core/finance/aux-accounts?aux_type=project" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 7.4 创建带辅助核算的凭证

在凭证的 `lines` 中添加 `project_id` 或 `department_id`：

```bash
curl -X POST http://localhost:8000/api/core/finance/vouchers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "voucher_type": "general",
    "voucher_date": "2026-07-15",
    "description": "项目费用",
    "lines": [
      {
        "account_code": "1001",
        "description": "银行存款支出",
        "debit": "0",
        "credit": "30000.00",
        "project_id": "AUX_ACCOUNT_UUID"
      },
      {
        "account_code": "6602",
        "description": "研发费用",
        "debit": "30000.00",
        "credit": "0",
        "project_id": "AUX_ACCOUNT_UUID"
      }
    ]
  }'
```

### 7.5 查询项目账簿

```bash
curl "http://localhost:8000/api/core/finance/aux-ledger?aux_type=project" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 7.6 查询项目余额表

```bash
curl "http://localhost:8000/api/core/finance/aux-balance?aux_type=project&period=202607" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 8. 会计期间管理

### 8.1 打开期间

```bash
curl -X POST http://localhost:8000/api/core/finance/periods/2026/7/open \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 8.2 关闭期间

```bash
curl -X POST http://localhost:8000/api/core/finance/periods/2026/6/close \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**注意：** 已关闭的期间不能再创建凭证。

---

## 9. 期末结转

### 9.1 年末结转

将收入和费用类账户结转到本年利润账户：

```bash
curl -X POST http://localhost:8000/api/core/finance/year-end-close \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "year": 2026,
    "description": "2026年度结转"
  }'
```

**响应示例：**

```json
{
  "success": true,
  "data": {
    "voucher_id": "UUID",
    "voucher_no": "记2026120001",
    "total_income": "500000.0000",
    "total_expense": "300000.0000",
    "net_profit": "200000.0000",
    "income_accounts_closed": 5,
    "expense_accounts_closed": 8
  }
}
```

**说明：**
- 结转收入：将贷方发生额转入本年利润（3101或3103科目）借方
- 结转费用：将借方发生额转入本年利润贷方
- 生成一张结转凭证，记录结转过程

---

## 10. 凭证导出

### 10.1 导出凭证

支持 CSV 和 JSON 格式导出：

**导出全部凭证（CSV）：**

```bash
curl -X POST http://localhost:8000/api/core/finance/vouchers/export \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "voucher_ids": [],
    "format": "csv",
    "period": "202606"
  }'
```

**按凭证ID导出（JSON）：**

```bash
curl -X POST http://localhost:8000/api/core/finance/vouchers/export \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "voucher_ids": ["UUID1", "UUID2"],
    "format": "json"
  }'
```

**按日期范围导出：**

```bash
curl -X POST http://localhost:8000/api/core/finance/vouchers/export \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "format": "csv",
    "start_date": "2026-01-01T00:00:00Z",
    "end_date": "2026-06-30T23:59:59Z"
  }'
```

**导出响应：**

```json
{
  "success": true,
  "data": {
    "file_name": "vouchers_export_20260623120000.csv",
    "format": "csv",
    "total_count": 100,
    "total_debit": "500000.0000",
    "total_credit": "500000.0000",
    "file_data": "凭证明细CSV内容..."
  }
}
```

**支持格式：**

| 格式 | 说明 |
|------|------|
| `csv` | CSV 格式，可用 Excel 打开 |
| `json` | JSON 格式，便于程序处理 |

**筛选参数：**

| 参数 | 说明 |
|------|------|
| `voucher_ids` | 凭证ID列表（为空则按其他条件筛选） |
| `format` | 导出格式（csv/json） |
| `period` | 会计期间筛选 |
| `status` | 凭证状态筛选 |
| `start_date` | 开始日期 |
| `end_date` | 结束日期 |

---

## 9. API 参考

### 9.1 基础信息

| 项目 | 值 |
|------|-----|
| 基础URL | `http://localhost:8000/api/core/finance` |
| 认证方式 | Bearer Token (JWT) |
| Content-Type | `application/json` |

### 9.2 完整 API 列表

| 方法 | 端点 | 说明 |
|------|------|------|
| POST | `/accounts` | 创建会计科目 |
| GET | `/accounts` | 查询会计科目列表 |
| GET | `/accounts/{id}` | 查询单个会计科目 |
| GET | `/accounts/code/{code}` | 按编码查询科目 |
| POST | `/vouchers` | 创建凭证 |
| GET | `/vouchers` | 查询凭证列表 |
| GET | `/vouchers/{id}` | 查询单个凭证 |
| POST | `/vouchers/{id}/submit` | 提交凭证 |
| POST | `/vouchers/{id}/approve` | 审核凭证 |
| POST | `/vouchers/{id}/post` | 过账凭证 |
| POST | `/vouchers/batch/submit` | 批量提交凭证 |
| POST | `/vouchers/batch/approve` | 批量审核凭证 |
| POST | `/vouchers/batch/post` | 批量过账凭证 |
| GET | `/ledger` | 查询账簿 |
| GET | `/trial-balance/{period}` | 试算平衡表 |
| GET | `/balance-sheet/{period}` | 资产负债表 |
| GET | `/income-statement/{period}` | 利润表 |
| GET | `/cash-flow/{period}` | 现金流量表 |
| POST | `/periods/{year}/{month}/open` | 打开会计期间 |
| POST | `/periods/{year}/{month}/close` | 关闭会计期间 |
| POST | `/aux-accounts` | 创建辅助科目 |
| GET | `/aux-accounts` | 查询辅助科目列表 |
| GET | `/aux-ledger` | 查询辅助账簿 |
| GET | `/aux-balance` | 查询辅助余额表 |
| POST | `/year-end-close` | 年末结转 |
| POST | `/vouchers/export` | 导出凭证 |
| POST | `/approvals/submit` | 提交审批 |
| POST | `/approvals/approve` | 审批通过 |
| POST | `/approvals/reject` | 审批驳回 |
| POST | `/approvals/cancel` | 撤回审批 |
| GET | `/approvals/status` | 查询审批状态 |
| GET | `/approvals/pending` | 待审批列表 |

### 9.3 响应格式

所有 API 返回统一格式：

```json
{
  "success": true,
  "data": { ... },
  "message": "操作成功",
  "timestamp": "2026-06-22T10:00:00Z"
}
```

**错误响应：**

```json
{
  "success": false,
  "data": null,
  "message": "错误描述",
  "timestamp": "2026-06-22T10:00:00Z"
}
```

### 9.4 审批工作流 API 详解

**提交审批：**

```bash
curl -X POST http://localhost:8000/api/core/finance/approvals/submit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "doc_type": "consolidation_report",
    "doc_id": "REPORT_UUID",
    "doc_no": "CR2026060001"
  }'
```

**审批通过：**

```bash
curl -X POST http://localhost:8000/api/core/finance/approvals/approve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '["consolidation_report", "REPORT_UUID", {"comment": "同意"]}]'
```

**审批驳回：**

```bash
curl -X POST http://localhost:8000/api/core/finance/approvals/reject \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '["consolidation_report", "REPORT_UUID", {"reason": "数据不准确", "comment": "请核对后重新提交"}]'
```

**撤回审批：**

```bash
curl -X POST http://localhost:8000/api/core/finance/approvals/cancel \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '["consolidation_report", "REPORT_UUID"]'
```

**查询审批状态：**

```bash
curl "http://localhost:8000/api/core/finance/approvals/status?doc_type=voucher&doc_id=VOUCHER_UUID" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**查询待审批列表：**

```bash
curl "http://localhost:8000/api/core/finance/approvals/pending?doc_type=consolidation_report&page=1&page_size=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 10. 常见问题

### 10.1 凭证创建失败 - 科目不存在

**错误信息：** `数据库记录不存在: 记录不存在`

**解决方案：** 确保凭证中使用的 `account_code` 对应的会计科目已创建。

### 10.2 凭证创建失败 - 期间已关闭

**错误信息：** `会计期间已关闭`

**解决方案：** 调用 `POST /periods/{year}/{month}/open` 重新打开期间。

### 10.3 凭证借贷不平衡

**错误信息：** `借贷不平`

**解决方案：** 确保所有分录的借方合计等于贷方合计。

### 10.4 日期格式错误

**错误信息：** `Invalid date format`

**解决方案：** 使用 `YYYY-MM-DD` 格式（如 `2026-07-15`）或 RFC3339 格式。

### 10.5 辅助核算账簿无数据

**可能原因：**

1. 凭证未过账 - 只有过账后的凭证才会写入账簿
2. 查询参数错误 - 检查 `aux_type` 是否正确

**解决方案：** 确保凭证已完成"提交→审核→过账"全流程。

---

## 附录 A: 数据类型

### A.1 Decimal 处理

所有金额字段使用 `Decimal` 类型，格式为字符串，避免浮点数精度问题：

```json
{
  "debit": "30000.0000",
  "credit": "15000.0000"
}
```

### A.2 UUID 格式

所有 ID 字段使用 UUID 格式：

```
550e8400-e29b-41d4-a716-446655440000
```

### A.3 时间格式

| 格式 | 示例 |
|------|------|
| 日期 | `2026-07-15` |
| 时间戳 | `2026-07-15T00:00:00Z` |
| 会计期间 | `202607`（YYYYMM 格式） |

---

*文档版本：1.3.0*
*最后更新：2026-06-23*
*更新内容：*
- *v1.3.0 新增合并报表完整审批流程（生成→提交→审批→发布）*
- *v1.2.0 新增 ERP 合并报表与 Finance Core 审批工作流整合*
- *v1.1.0 新增期末结转、凭证导出、统一审批工作流功能*
- *v1.0.0 初始版本*
