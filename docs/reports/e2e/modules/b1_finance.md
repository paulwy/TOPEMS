# finance 模块测试报告（b1 批次）

- 执行：b1（OrganizeAgent 子代理）｜执行时间 2026-10-27 00:47 CST｜登录账号 test_admin（超管）
- 被测入口：http://localhost:8099

## 用例清单
| # | method | path | body(摘要) | 响应(状态码+关键字段) | 结论 |
|---|---|---|---|---|---|
| 1 | POST | /api/core/iam/auth/login | {"username":"test_admin","password":"admin123"} | success=true, access_token | ✅ |
| 2 | POST | /api/finance/sales-invoices | {"invoice_number":"e2e_fin_b1_001","customer_id":"<crm客户uuid>","customer_name":"e2e_crm_b1_001","amount":"1000.00","tax_amount":"130.00","invoice_date":"2026-10-27","due_date":"2026-11-27"}（**未传 invoice_type**） | **code=500, success=false, message="内部服务器错误"** | ❌ |
| 3 | POST | /api/finance/sales-invoices | 同 #2，但显式补 `"invoice_type":"tax"` | code=200, success=true, data.id=0b1dd475-cbac-4a0b-a0da-3d2f3267647d, total_amount="1130.00"（自动=1000+130）, status="draft" | ✅ |
| 4 | GET | /api/finance/sales-invoices/0b1dd475-cbac-4a0b-a0da-3d2f3267647d | - | code=200, success=true，invoice_number/customer_id/amount/tax_amount/total_amount/invoice_type 与创建一致 | ✅ |

## 读回验证
创建返回 id=0b1dd475-cbac-4a0b-a0da-3d2f3267647d → get-by-id 取回核对：
- invoice_number=e2e_fin_b1_001 ✅
- customer_id=59398ed2-931c-4fb4-8dfd-5ef12b5b2811（= 本批次 crm 客户 id，跨模块资源共享）✅
- customer_name=e2e_crm_b1_001 ✅
- amount="1000.00"、tax_amount="130.00"、total_amount="1130.00"（handler 自动合计）✅
- invoice_date=2026-10-27、due_date=2026-11-27 ✅
- status="draft"、invoice_type="tax"、paid_amount="0" ✅

关键字段全部落库一致。

## 结论
**通过**（经一次失败重试后成功）。

### 失败根因（第 2 次调用 500，已定位并修复）
- 错误响应原文：`{"code":500,"success":false,"data":null,"message":"内部服务器错误"}`。
- 源码定位 `svc/finance/src/modules/sales_invoice.rs:65-83`：`InvoiceCreatePayload.invoice_type` 标注 `#[serde(default)]`，调用方不传时反序列化为**空串 ""**，handler 第 447 行将空串直接绑定进 INSERT。
- DB 实测 `finance.sales_invoices` 存在 CHECK 约束 `sales_invoices_invoice_type_check`：`invoice_type IN ('tax','普通发票','专用发票')`。空串违反约束 → sqlx 报错 → handler `err_resp` 吞掉细节返回通用 500。
- **修复方式**：请求体显式传 `"invoice_type":"tax"`（api_reference 已注明该字段 default），重试即成功。
- 遗留问题（非本测试范围，仅记录）：handler 未对 `invoice_type` 空串做缺省兜底（应默认 "tax"），属实现层小缺陷。

## 备注
- 测试数据保留：sales-invoice e2e_fin_b1_001（id=0b1dd475-cbac-4a0b-a0da-3d2f3267647d，status=draft）。
- customer_id 复用本批次 crm 客户（id=59398ed2-931c-4fb4-8dfd-5ef12b5b2811）。
- 未调用 delete（draft 删除虽允许，但遵守禁硬删约束保留数据）。
