# qms 模块测试报告（b2 批次）

- 执行：b2（子代理批次）｜执行时间 2026-10-27 00:46-00:47 CST｜登录账号 test_admin（超管）

## 用例清单
| # | method | path | body(摘要) | 响应(状态码+关键字段) | 结论 |
|---|---|---|---|---|---|
| 1 | POST | /api/core/iam/auth/login | {"username":"test_admin","password":"admin123"} | success=true, data.access_token(JWT) | ✅ |
| 2 | POST | /api/qms/checks | {"inspection_type":"incoming","quantity":50,"product_name":"e2e_qms_b2_001"} | HTTP 200, envelope code=200, success=true, data.id=b0cd9274-f0d5-4908-9cb7-2f0a2a794d6e, inspection_no=INS-B47BA583, inspection_type=incoming, quantity="50", status=pending, message="质量检查创建成功" | ✅ |
| 3 | GET | /api/qms/checks?page=1&page_size=20 | - | HTTP 200, envelope code=200, success=true, data.total=15，目标记录在列表首位（数组字段 data.inspections，按 created_at DESC） | ✅ |
| 4 | GET | /api/qms/checks/{id} | id=b0cd9274-f0d5-4908-9cb7-2f0a2a794d6e | HTTP 200, success=true, message="获取质量检查成功"，各字段与创建一致 | ✅ |

## 读回验证
创建响应返回 id=b0cd9274-f0d5-4908-9cb7-2f0a2a794d6e → list（data.inspections 首条）与 get-by-id 均取回：
- inspection_type=incoming、product_name=e2e_qms_b2_001、quantity="50"（BigDecimal 序列化为字符串）、status=pending、inspection_no=INS-B47BA583，与创建请求完全一致，落库成功。

## 结论
**通过**。create→list→get-by-id 全链路 OK。quantity 为 BigDecimal，请求侧传数值 50、响应侧以字符串 "50" 返回（Decimal 标准 JSON 表示），往返一致。

## 备注
- 测试数据保留：质检单 e2e_qms_b2_001（id=b0cd9274-f0d5-4908-9cb7-2f0a2a794d6e，inspection_no=INS-B47BA583，status=pending）。
- qms list 数组字段为 **data.inspections**（非 items/records）+ data.total/page/page_size；排序为最新优先。
- 未调用 delete（硬删除接口存在 DELETE /{id}），测试数据保留。
