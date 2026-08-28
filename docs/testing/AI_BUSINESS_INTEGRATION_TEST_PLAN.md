# TOPEMS AI 业务智能模块 - 联调测试计划

## 文档信息

- **版本**: 1.0.0
- **日期**: 2024-01-01
- **作者**: TOPEMS AI Team
- **状态**: 待执行

## 1. 测试概述

### 1.1 测试目标

验证 TOPEMS AI 业务智能模块的前后端对接正确性，包括：
- API 端点可用性和正确性
- 数据格式和类型一致性
- 业务流程完整性
- 错误处理和异常情况
- 性能和响应时间

### 1.2 测试范围

| 模块 | API 端点数 | 测试用例数 | 优先级 |
|------|------------|-----------|--------|
| 业务 Copilot | 8 | 24 | P0 |
| 智能表单 | 7 | 21 | P0 |
| 文档智能 | 10 | 30 | P1 |
| 治理仪表盘 | 13 | 39 | P1 |
| **总计** | **38** | **114** | - |

### 1.3 测试环境

- **后端**: http://localhost:8080
- **前端**: http://localhost:3000
- **数据库**: PostgreSQL 14+
- **缓存**: Redis 6+
- **AI 服务**: OpenAI / Dify

## 2. 测试策略

### 2.1 测试层级

1. **单元测试** - 验证单个函数和组件的正确性
2. **集成测试** - 验证模块间的交互
3. **API 测试** - 验证 API 端点的请求/响应
4. **端到端测试** - 验证完整业务流程
5. **性能测试** - 验证响应时间和吞吐量

### 2.2 测试方法

- **黑盒测试**: 基于 API 规范验证输入输出
- **白盒测试**: 基于代码逻辑验证边界条件
- **回归测试**: 确保修改不影响现有功能
- **探索性测试**: 发现非预期的问题

## 3. 测试用例

### 3.1 业务 Copilot API 测试

#### TC-COP-001: 创建会话

- **优先级**: P0
- **前置条件**: 服务正常运行
- **测试步骤**:
  1. 发送 POST /api/ai/copilot/sessions
  2. 请求体: `{"module": "erp", "user_id": "test-user"}`
- **预期结果**:
  - 状态码: 200
  - 返回 session_id
  - module 为 "erp"
  - conversation_history 为空数组

#### TC-COP-002: 获取会话

- **优先级**: P0
- **前置条件**: 已创建会话
- **测试步骤**:
  1. 发送 GET /api/ai/copilot/sessions/{session_id}
- **预期结果**:
  - 状态码: 200
  - 返回会话信息
  - session_id 匹配

#### TC-COP-003: 获取不存在的会话

- **优先级**: P1
- **测试步骤**:
  1. 发送 GET /api/ai/copilot/sessions/nonexistent-id
- **预期结果**:
  - 状态码: 404
  - 返回错误信息

#### TC-COP-004: 删除会话

- **优先级**: P0
- **前置条件**: 已创建会话
- **测试步骤**:
  1. 发送 DELETE /api/ai/copilot/sessions/{session_id}
  2. 再次获取该会话
- **预期结果**:
  - 删除返回 200
  - 再次获取返回 404

#### TC-COP-005: 发送消息

- **优先级**: P0
- **前置条件**: 已创建会话
- **测试步骤**:
  1. 发送 POST /api/ai/copilot/chat
  2. 请求体: `{"session_id": "...", "user_input": "查询采购订单", "module": "erp"}`
- **预期结果**:
  - 状态码: 200
  - 返回 reply 字段
  - 返回 intent 字段
  - 返回 confidence 字段 (0-1)
  - processing_time_ms > 0

#### TC-COP-006: 发送空消息

- **优先级**: P1
- **测试步骤**:
  1. 发送 POST /api/ai/copilot/chat
  2. 请求体: `{"user_input": "", "module": "erp"}`
- **预期结果**:
  - 状态码: 400
  - 返回参数错误信息

#### TC-COP-007: 识别意图

- **优先级**: P0
- **测试步骤**:
  1. 发送 POST /api/ai/copilot/intent
  2. 请求体: `{"text": "创建采购订单", "module": "erp"}`
- **预期结果**:
  - 状态码: 200
  - intent 为 "create"
  - confidence > 0.5

#### TC-COP-008: 获取模块配置

- **优先级**: P0
- **测试步骤**:
  1. 发送 GET /api/ai/copilot/modules/erp
- **预期结果**:
  - 状态码: 200
  - 返回 module 为 "erp"
  - 返回 supported_intents 数组
  - 返回 available_tools 数组

### 3.2 智能表单 API 测试

#### TC-FORM-001: 获取表单定义

- **优先级**: P0
- **测试步骤**:
  1. 发送 GET /api/ai/forms/purchase_request
- **预期结果**:
  - 状态码: 200
  - 返回 form_id
  - 返回 fields 数组
  - 每个 field 有 field_id, name, label, field_type

#### TC-FORM-002: 获取所有表单定义

- **优先级**: P0
- **测试步骤**:
  1. 发送 GET /api/ai/forms
- **预期结果**:
  - 状态码: 200
  - 返回数组
  - 每个元素有 form_id 和 name

#### TC-FORM-003: 按分类筛选表单

- **优先级**: P1
- **测试步骤**:
  1. 发送 GET /api/ai/forms?category=erp
- **预期结果**:
  - 状态码: 200
  - 所有返回的表单 category 为 "erp"

#### TC-FORM-004: 验证有效表单数据

- **优先级**: P0
- **测试步骤**:
  1. 发送 POST /api/ai/forms/purchase_request/validate
  2. 请求体: `{"values": {"title": "测试采购", "amount": 1000}}`
- **预期结果**:
  - 状态码: 200
  - is_valid 为 true
  - field_errors 为空

#### TC-FORM-005: 验证无效表单数据

- **优先级**: P0
- **测试步骤**:
  1. 发送 POST /api/ai/forms/purchase_request/validate
  2. 请求体: `{"values": {"title": "", "amount": -100}}`
- **预期结果**:
  - 状态码: 200
  - is_valid 为 false
  - field_errors 包含 title 和 amount 的错误

#### TC-FORM-006: 自动填充表单

- **优先级**: P1
- **测试步骤**:
  1. 发送 POST /api/ai/forms/purchase_request/auto-fill
  2. 请求体: `{"context": {"user_id": "test-user"}}`
- **预期结果**:
  - 状态码: 200
  - 返回 values 对象
  - 自动填充了申请人等字段

#### TC-FORM-007: 从文本生成表单

- **优先级**: P1
- **测试步骤**:
  1. 发送 POST /api/ai/forms/purchase_request/generate
  2. 请求体: `{"text": "采购10台笔记本电脑，预算5万元"}`
- **预期结果**:
  - 状态码: 200
  - 返回 values 对象
  - item_name 包含 "笔记本电脑"
  - quantity 为 10
  - estimated_amount 为 50000

### 3.3 文档智能 API 测试

#### TC-DOC-001: 上传文档

- **优先级**: P0
- **测试步骤**:
  1. 发送 POST /api/ai/documents
  2. multipart/form-data 上传 PDF 文件
- **预期结果**:
  - 状态码: 200
  - 返回 document_id
  - document_type 为 "pdf"
  - processing_status 为 "pending" 或 "processing"

#### TC-DOC-002: 获取文档信息

- **优先级**: P0
- **前置条件**: 已上传文档
- **测试步骤**:
  1. 发送 GET /api/ai/documents/{document_id}
- **预期结果**:
  - 状态码: 200
  - 返回文档信息
  - file_size > 0

#### TC-DOC-003: 解析文档

- **优先级**: P0
- **前置条件**: 已上传文档
- **测试步骤**:
  1. 发送 POST /api/ai/documents/{document_id}/parse
- **预期结果**:
  - 状态码: 200
  - success 为 true
  - text 非空
  - 可能包含 tables 和 structure

#### TC-DOC-004: 生成文档摘要

- **优先级**: P0
- **前置条件**: 已解析文档
- **测试步骤**:
  1. 发送 POST /api/ai/documents/{document_id}/summary
  2. 请求体: `{"summary_type": "standard"}`
- **预期结果**:
  - 状态码: 200
  - content 非空
  - key_sentences 数组非空
  - keywords 数组非空

#### TC-DOC-005: 搜索文档内容

- **优先级**: P1
- **前置条件**: 已解析文档
- **测试步骤**:
  1. 发送 GET /api/ai/documents/{document_id}/search?q=关键词
- **预期结果**:
  - 状态码: 200
  - 返回数组
  - 每个元素有 line_number, content, match_count

#### TC-DOC-006: 删除文档

- **优先级**: P0
- **前置条件**: 已上传文档
- **测试步骤**:
  1. 发送 DELETE /api/ai/documents/{document_id}
  2. 再次获取该文档
- **预期结果**:
  - 删除返回 200
  - 再次获取返回 404

### 3.4 治理仪表盘 API 测试

#### TC-GOV-001: 获取仪表盘数据

- **优先级**: P0
- **测试步骤**:
  1. 发送 GET /api/ai/governance/dashboard?time_range=24h
- **预期结果**:
  - 状态码: 200
  - 返回 overall_score (0-100)
  - 返回 governance_level
  - 返回 key_metrics 对象
  - 返回 risk_assessment 对象
  - 返回 compliance_status 对象
  - 返回 cost_analysis 对象
  - 返回 performance_metrics 对象

#### TC-GOV-002: 获取治理评分

- **优先级**: P0
- **测试步骤**:
  1. 发送 GET /api/ai/governance/score
- **预期结果**:
  - 状态码: 200
  - overall_score 在 0-100 之间
  - breakdown 包含 security, compliance, cost, performance, reliability

#### TC-GOV-003: 获取风险评估

- **优先级**: P0
- **测试步骤**:
  1. 发送 GET /api/ai/governance/risk
- **预期结果**:
  - 状态码: 200
  - overall_risk_level 为 low/medium/high/critical
  - risk_score 在 0-100 之间
  - 包含 security_risk, compliance_risk, cost_risk 等

#### TC-GOV-004: 获取合规状态

- **优先级**: P1
- **测试步骤**:
  1. 发送 GET /api/ai/governance/compliance
- **预期结果**:
  - 状态码: 200
  - overall_compliance_rate 在 0-100 之间
  - total_checks > 0
  - passed_checks + failed_checks + pending_checks = total_checks

#### TC-GOV-005: 获取成本分析

- **优先级**: P1
- **测试步骤**:
  1. 发送 GET /api/ai/governance/cost
- **预期结果**:
  - 状态码: 200
  - total_cost >= 0
  - llm_cost + tool_cost + storage_cost + network_cost + other_cost ≈ total_cost
  - budget_usage.usage_percent 在 0-100 之间

#### TC-GOV-006: 获取性能指标

- **优先级**: P1
- **测试步骤**:
  1. 发送 GET /api/ai/governance/performance
- **预期结果**:
  - 状态码: 200
  - average_response_ms > 0
  - p50 <= p90 <= p95 <= p99
  - throughput > 0
  - error_rate 在 0-100 之间

#### TC-GOV-007: 刷新缓存

- **优先级**: P2
- **测试步骤**:
  1. 发送 POST /api/ai/governance/refresh
- **预期结果**:
  - 状态码: 200
  - 缓存已刷新

## 4. 端到端测试场景

### 4.1 场景 1: 业务 Copilot 完整对话流程

1. 用户打开业务 Copilot 页面
2. 选择 ERP 业务模块
3. 系统自动创建会话
4. 用户输入"查询本月采购订单"
5. 系统调用 Copilot API
6. Copilot 调用 ERP 查询工具
7. 系统返回查询结果
8. 用户点击"查看详情"
9. 系统跳转到采购订单页面

**验收标准**:
- 对话流程完整
- 工具调用正确
- 结果展示准确
- 页面跳转正确

### 4.2 场景 2: 智能表单自动填充流程

1. 用户打开采购申请页面
2. 系统加载采购申请表单定义
3. 用户点击"AI 填充"
4. 系统调用自动填充 API
5. 表单自动填充申请人、部门、日期等字段
6. 用户输入"采购10台电脑"
7. 系统调用从文本生成 API
8. 表单自动填充物品名称、数量、金额
9. 用户点击提交
10. 系统验证表单数据
11. 表单提交成功

**验收标准**:
- 自动填充正确
- 文本提取准确
- 表单验证通过
- 提交成功

### 4.3 场景 3: 文档智能处理流程

1. 用户上传 PDF 文档
2. 系统调用上传 API
3. 系统自动解析文档
4. 用户查看文档原文
5. 用户点击"生成摘要"
6. 系统调用摘要生成 API
7. 系统展示文档摘要
8. 用户搜索文档关键词
9. 系统调用搜索 API
10. 系统高亮显示匹配内容

**验收标准**:
- 文档上传成功
- 解析结果准确
- 摘要质量良好
- 搜索结果正确

### 4.4 场景 4: 治理仪表盘监控流程

1. 管理员打开治理仪表盘
2. 系统调用仪表盘 API
3. 系统展示总体治理评分
4. 管理员查看风险评估
5. 系统展示高风险项
6. 管理员查看成本分析
7. 系统展示成本趋势
8. 管理员设置自动刷新
9. 系统每 5 分钟自动刷新数据

**验收标准**:
- 数据加载正确
- 图表展示准确
- 风险识别正确
- 自动刷新正常

## 5. 性能测试

### 5.1 性能指标

| 指标 | 目标值 | 测试方法 |
|------|--------|---------|
| API 响应时间 (P95) | < 2s | 负载测试 |
| API 响应时间 (P99) | < 5s | 负载测试 |
| 并发用户数 | >= 100 | 压力测试 |
| 吞吐量 | >= 50 req/s | 压力测试 |
| 错误率 | < 1% | 稳定性测试 |

### 5.2 性能测试场景

1. **单用户性能测试**: 测量单个用户的响应时间
2. **并发性能测试**: 测量 10/50/100 并发用户的性能
3. **压力测试**: 逐步增加负载直到系统崩溃
4. **稳定性测试**: 持续运行 24 小时，监控系统稳定性
5. **大数据量测试**: 测试大量数据下的性能表现

## 6. 测试工具

### 6.1 自动化测试工具

- **单元测试**: Vitest (前端), cargo test (后端)
- **集成测试**: Vitest + Testing Library
- **API 测试**: Postman / Newman / curl
- **端到端测试**: Playwright / Cypress
- **性能测试**: k6 / JMeter / Artillery

### 6.2 测试数据管理

- **Mock 数据**: 使用 MSW (Mock Service Worker)
- **测试数据库**: 使用独立的测试数据库
- **数据清理**: 测试后自动清理测试数据
- **数据隔离**: 每个测试用例使用独立的数据

## 7. 缺陷管理

### 7.1 缺陷等级

| 等级 | 定义 | 修复时限 |
|------|------|---------|
| P0 - 致命 | 系统崩溃、数据丢失、核心功能不可用 | 24 小时内 |
| P1 - 严重 | 主要功能异常、性能严重不达标 | 3 天内 |
| P2 - 一般 | 次要功能异常、用户体验问题 | 1 周内 |
| P3 - 轻微 | 界面问题、文案错误、建议优化 | 下个版本 |

### 7.2 缺陷流程

1. 测试人员发现缺陷
2. 在缺陷管理系统创建缺陷
3. 开发人员确认并修复
4. 测试人员验证修复
5. 关闭缺陷

## 8. 测试报告

### 8.1 测试报告内容

- 测试概述
- 测试环境
- 测试执行情况
- 测试用例通过率
- 缺陷统计
- 性能测试结果
- 风险评估
- 测试结论和建议

### 8.2 测试通过标准

- 测试用例通过率 >= 95%
- P0/P1 缺陷全部修复
- P2 缺陷修复率 >= 80%
- 性能指标全部达标
- 无未解决的安全漏洞

## 9. 测试执行计划

### 9.1 测试阶段

| 阶段 | 时间 | 内容 | 负责人 |
|------|------|------|--------|
| 测试准备 | Day 1-2 | 测试环境搭建、测试数据准备、测试用例编写 | 测试团队 |
| 单元测试 | Day 3-4 | 前端和后端单元测试 | 开发团队 |
| 集成测试 | Day 5-6 | API 集成测试、Hooks 集成测试 | 测试团队 |
| 端到端测试 | Day 7-8 | 完整业务流程测试 | 测试团队 |
| 性能测试 | Day 9-10 | 性能和压力测试 | 性能团队 |
| 回归测试 | Day 11 | 缺陷修复后的回归测试 | 测试团队 |
| 测试报告 | Day 12 | 测试总结和报告 | 测试团队 |

### 9.2 测试入口标准

- 开发完成并通过自测
- 测试环境就绪
- 测试数据准备完成
- 测试用例评审通过

### 9.3 测试出口标准

- 所有测试用例执行完成
- 测试通过率达标
- 缺陷修复率达标
- 性能指标达标
- 测试报告完成

## 10. 风险和应对

| 风险 | 影响 | 概率 | 应对措施 |
|------|------|------|---------|
| AI 服务不稳定 | 高 | 中 | 使用 Mock 数据、增加重试机制 |
| 测试数据不足 | 中 | 高 | 提前准备测试数据、使用数据生成工具 |
| 性能不达标 | 高 | 中 | 提前进行性能优化、设置性能基线 |
| 需求变更 | 中 | 高 | 敏捷测试、及时调整测试用例 |
| 环境不稳定 | 中 | 中 | 环境监控、快速恢复机制 |

## 附录

### A. 相关文档

- [API 规范](../api/ai-business-intelligence-openapi.yaml)
- [API 文档](../DSH_BUSINESS_INTELLIGENCE_API.md)
- [工程化指南](../engineering/AI_ENGINEERING_GUIDE.md)

### B. 测试工具链接

- Vitest: https://vitest.dev/
- Playwright: https://playwright.dev/
- k6: https://k6.io/
- Postman: https://www.postman.com/

### C. 联系方式

- 测试负责人: test-lead@topems.com
- 开发负责人: dev-lead@topems.com
- 产品负责人: product-lead@topems.com
