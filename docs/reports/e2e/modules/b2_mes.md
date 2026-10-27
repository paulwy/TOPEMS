# mes 模块测试报告（b2 批次）

- 执行：b2（子代理批次）｜执行时间 2026-10-27 00:46 CST｜登录账号 test_admin（超管）

## 用例清单
| # | method | path | body(摘要) | 响应(状态码+关键字段) | 结论 |
|---|---|---|---|---|---|
| 1 | POST | /api/core/iam/auth/login | {"username":"test_admin","password":"admin123"} | success=true, data.access_token(JWT) | ✅ |
| 2 | POST | /api/mes/orders | {"product_name":"e2e_mes_b2_001","product_code":"E2E-MES-B2-001","quantity":100} | HTTP 200, envelope code=200, success=true, data.id=5f41208d-77df-48f0-ab85-bad628f1757b, order_no=MO202610267595, quantity=100.0, status=pending, source=manual, message="生产工单创建成功" | ✅ |
| 3 | GET | /api/mes/orders?page=1&page_size=10 | - | HTTP 200, envelope code=200, success=true, data.total=1，目标记录在列表首位（数组字段 data.items） | ✅ |
| 4 | GET | /api/mes/orders/{id} | id=5f41208d-77df-48f0-ab85-bad628f1757b | HTTP 200, success=true, message="获取生产工单成功"，各字段与创建一致 | ✅ |

## 读回验证
创建响应返回 id=5f41208d-77df-48f0-ab85-bad628f1757b → list 与 get-by-id 均取回：
- product_name=e2e_mes_b2_001、product_code=E2E-MES-B2-001、quantity=100.0（f64，JSON 数值）、status=pending、order_no=MO202610267595，与创建请求完全一致，落库成功。

## 结论
**通过**。create→list→get-by-id 全链路 OK。envelope={code,success,data,message,timestamp}；create 返回 envelope code=200（非 201），读回 code=200。quantity 为 f64 按数值透传/返回无损。

## 备注
- 测试数据保留：生产工单 e2e_mes_b2_001（id=5f41208d-77df-48f0-ab85-bad628f1757b，order_no=MO202610267595，status=pending）。
- mes 无硬删除（取消走 PUT /{id}/cancel），未做删除。
- list 数组字段为 data.items + data.total。
