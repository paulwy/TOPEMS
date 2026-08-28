# AI 业务智能 - 性能测试指南

## 概述

本文档描述了 AI 业务智能模块的性能测试，包括测试环境配置、测试用例说明、运行方法和性能基准。

## 测试文件

| 文件 | 类型 | 大小 | 测试场景 |
|------|------|------|----------|
| `ai-business-copilot.k6.js` | k6脚本 | 8.8KB | 业务 Copilot API 性能测试 |
| `ai-governance-dashboard.k6.js` | k6脚本 | 6.9KB | 治理仪表盘 API 性能测试 |
| `ai-business-intelligence-comprehensive.k6.js` | k6脚本 | 9.7KB | 综合性能测试（所有API） |
| **总计** | | **25.4KB** | **3个测试套件，10个测试场景** |

## 测试环境

### 前置条件

1. **k6** >= 0.45.0（已安装在 `/opt/homebrew/bin/k6`）
2. **后端服务** 运行在 `http://localhost:8080`
3. **数据库** PostgreSQL 已配置并运行
4. **缓存** Redis 已配置并运行（可选）
5. **AI 服务** LLM Provider 已配置（可选，用于真实对话测试）

### 环境变量

```bash
# 后端服务地址
BASE_URL=http://localhost:8080

# 认证 Token
AUTH_TOKEN=your-test-token

# 测试结果输出目录
K6_OUT=./tests/performance/results
```

## 性能指标

### 响应时间指标

| 指标 | 目标值 | 说明 |
|------|--------|------|
| P50 响应时间 | < 500ms | 50% 的请求响应时间 |
| P90 响应时间 | < 1000ms | 90% 的请求响应时间 |
| P95 响应时间 | < 2000ms | 95% 的请求响应时间 |
| P99 响应时间 | < 5000ms | 99% 的请求响应时间 |
| 最大响应时间 | < 10000ms | 所有请求的最大响应时间 |

### 吞吐量指标

| 指标 | 目标值 | 说明 |
|------|--------|------|
| 每秒请求数 (RPS) | > 100 | 系统能处理的最大请求数 |
| 并发用户数 (VUs) | > 100 | 系统能支持的最大并发用户 |
| 成功率 | > 99% | 成功请求占比 |
| 错误率 | < 1% | 失败请求占比 |

### 资源使用指标

| 指标 | 目标值 | 说明 |
|------|--------|------|
| CPU 使用率 | < 80% | 测试期间的平均 CPU 使用率 |
| 内存使用率 | < 80% | 测试期间的平均内存使用率 |
| 数据库连接数 | < 100 | 活跃数据库连接数 |
| 缓存命中率 | > 80% | Redis 缓存命中率（如启用） |

## 测试场景

### 1. 烟雾测试 (Smoke Test)

**目的**：验证基本功能正常，低负载下的性能基线。

**配置**：
- 虚拟用户数：5 VUs
- 持续时间：30 秒
- 请求频率：低

**验证点**：
- 所有 API 端点返回 200 状态码
- 响应时间在可接受范围内
- 无错误或异常

### 2. 平均负载测试 (Average Load Test)

**目的**：模拟正常使用情况下的系统性能。

**配置**：
- 虚拟用户数：0 → 20 → 0（渐变）
- 持续时间：2 分钟
- 阶段：30秒爬升 + 1分钟稳定 + 30秒下降

**验证点**：
- P95 响应时间 < 2 秒
- 成功率 > 99%
- 系统资源使用稳定

### 3. 压力测试 (Stress Test)

**目的**：测试系统在高负载下的性能和极限。

**配置**：
- 虚拟用户数：0 → 50 → 100 → 0（多阶段）
- 持续时间：7 分钟
- 阶段：1分钟到50 + 2分钟稳定 + 1分钟到100 + 2分钟稳定 + 1分钟下降

**验证点**：
- 系统在 100 并发用户下仍能正常响应
- 无服务崩溃或内存泄漏
- 错误率 < 5%（高负载下可接受）

### 4. 峰值测试 (Peak Test)

**目的**：模拟业务高峰期的突发负载。

**配置**：
- 虚拟用户数：0 → 100 → 0（快速爬升）
- 持续时间：5 分钟
- 阶段：1分钟爬升 + 3分钟稳定 + 1分钟下降

**验证点**：
- 系统能快速响应突发负载
- 无请求超时或丢失
- 响应时间在可接受范围内

### 5. 稳定性测试 (Soak Test)

**目的**：长时间运行测试，验证系统稳定性和内存泄漏。

**配置**：
- 虚拟用户数：20 VUs（恒定）
- 持续时间：5 分钟（可延长到 1 小时）
- 请求频率：中等

**验证点**：
- 系统长时间运行无内存泄漏
- 性能无明显下降
- 无异常错误或崩溃

### 6. 混合负载测试 (Mixed Load Test)

**目的**：模拟真实用户行为，按比例调用不同 API。

**配置**：
- 虚拟用户数：0 → 30 → 0
- 持续时间：3 分钟
- API 分布：70% Copilot + 15% 表单 + 10% 文档 + 5% 治理

**验证点**：
- 各 API 性能均衡
- 系统资源分配合理
- 无单点瓶颈

## 运行测试

### 1. 启动后端服务

```bash
cd /Users/xingzhai/TOPEMS
cargo run -p topems-unified-core
```

### 2. 运行单个测试套件

```bash
# 业务 Copilot API 性能测试
k6 run tests/performance/ai-business-copilot.k6.js

# 治理仪表盘 API 性能测试
k6 run tests/performance/ai-governance-dashboard.k6.js

# 综合性能测试
k6 run tests/performance/ai-business-intelligence-comprehensive.k6.js
```

### 3. 运行特定测试场景

```bash
# 只运行烟雾测试场景
k6 run --scenario smoke tests/performance/ai-business-copilot.k6.js

# 只运行压力测试场景
k6 run --scenario stress tests/performance/ai-business-copilot.k6.js
```

### 4. 自定义测试参数

```bash
# 指定虚拟用户数和持续时间
k6 run --vus 50 --duration 2m tests/performance/ai-business-copilot.k6.js

# 指定后端地址
BASE_URL=http://localhost:9090 k6 run tests/performance/ai-business-copilot.k6.js

# 指定认证 Token
AUTH_TOKEN=my-token k6 run tests/performance/ai-business-copilot.k6.js
```

### 5. 导出测试结果

```bash
# 导出为 JSON 格式
k6 run --out json=results.json tests/performance/ai-business-copilot.k6.js

# 导出为 CSV 格式
k6 run --out csv=results.csv tests/performance/ai-business-copilot.k6.js

# 导出为 InfluxDB（需要配置）
k6 run --out influxdb=http://localhost:8086/k6 tests/performance/ai-business-copilot.k6.js
```

### 6. 生成 HTML 报告

```bash
# 使用 k6 报告生成器（需要安装）
k6 run --out json=results.json tests/performance/ai-business-copilot.k6.js
k6-reporter results.json > report.html
```

## 测试结果分析

### 关键指标解读

1. **http_req_duration**：HTTP 请求持续时间
   - `avg`：平均响应时间
   - `min`：最小响应时间
   - `max`：最大响应时间
   - `p(90)`：90% 请求的响应时间
   - `p(95)`：95% 请求的响应时间
   - `p(99)`：99% 请求的响应时间

2. **http_req_failed**：HTTP 请求失败率
   - `rate`：失败请求占比

3. **iterations**：迭代次数
   - `count`：总迭代次数
   - `rate`：每秒迭代次数

4. **vus**：虚拟用户数
   - `max`：最大虚拟用户数

5. **自定义指标**：
   - `copilot_latency_ms`：Copilot API 延迟
   - `governance_latency_ms`：治理 API 延迟
   - `success_rate`：成功率

### 性能瓶颈识别

1. **响应时间过长**：
   - 检查数据库查询性能
   - 检查外部 API 调用延迟
   - 检查缓存命中率
   - 检查代码逻辑效率

2. **吞吐量不足**：
   - 检查 CPU 使用率
   - 检查数据库连接池配置
   - 检查并发处理能力
   - 检查网络带宽

3. **错误率过高**：
   - 检查服务日志
   - 检查数据库连接
   - 检查内存使用
   - 检查超时配置

4. **资源使用过高**：
   - 检查内存泄漏
   - 检查数据库连接泄漏
   - 检查文件句柄泄漏
   - 检查并发控制

## 性能优化建议

### 1. 数据库优化

- 添加适当的索引
- 使用连接池
- 优化查询语句
- 使用读写分离
- 定期清理历史数据

### 2. 缓存优化

- 使用 Redis 缓存热点数据
- 设置合理的缓存过期时间
- 使用缓存预热
- 实现缓存降级策略
- 监控缓存命中率

### 3. 代码优化

- 使用异步处理
- 实现请求合并
- 使用批量操作
- 减少不必要的计算
- 使用连接池和对象池

### 4. 架构优化

- 使用负载均衡
- 实现服务降级
- 使用消息队列
- 实现限流和熔断
- 使用 CDN 加速静态资源

## 常见问题

### Q: k6 测试时报错 "connection refused"

**A:** 确保后端服务已启动并运行在正确的端口。检查 `BASE_URL` 环境变量。

### Q: 测试结果中所有请求都失败

**A:** 检查认证 Token 是否正确。检查 API 路径是否正确。检查后端服务日志。

### Q: 响应时间比预期长很多

**A:** 可能是 LLM API 调用延迟。检查是否使用了 Mock 或真实 LLM。检查网络连接。

### Q: 如何在 CI 中运行性能测试

**A:** 
```yaml
- name: Run Performance Tests
  run: |
    k6 run tests/performance/ai-business-copilot.k6.js
  env:
    BASE_URL: http://localhost:8080
    AUTH_TOKEN: ${{ secrets.TEST_TOKEN }}
```

## 相关文档

- [联调测试计划](../testing/AI_BUSINESS_INTEGRATION_TEST_PLAN.md)
- [端到端测试指南](../testing/AI_BUSINESS_INTELLIGENCE_E2E_GUIDE.md)
- [API 文档](../DSH_BUSINESS_INTELLIGENCE_API.md)
- [k6 官方文档](https://k6.io/docs/)
