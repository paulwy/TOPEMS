# TOPEMS 灰度发布策略指南

本文档介绍 TOPEMS 系统支持的三种灰度发布模式：金丝雀发布、蓝绿部署和特性开关。

## 目录

1. [金丝雀发布](#金丝雀发布)
2. [蓝绿部署](#蓝绿部署)
3. [特性开关](#特性开关)
4. [发布检查清单](#发布检查清单)
5. [回滚操作手册](#回滚操作手册)

---

## 金丝雀发布

### 概述

金丝雀发布是一种渐进式发布策略，通过逐步放量来降低发布风险。TOPEMS 使用 Traefik 路由层实现流量切分。

### 发布流程

#### 1. 准备阶段

```bash
# 1. 检查当前版本状态
kubectl get pods -l app=topems-api

# 2. 确认金丝雀配置
cat config/canary-deployment.yaml
```

#### 2. 部署金丝雀版本

```bash
# 部署新版本到金丝雀环境
kubectl apply -f k8s/services/canary.yaml

# 确认金丝雀 Pod 就绪
kubectl rollout status deployment/topems-api-canary
```

#### 3. 配置流量切分

编辑 `/Users/xingzhai/TOPEMS/config/canary-deployment.yaml`:

```yaml
canary:
  traffic_split:
    stable_weight: 90
    canary_weight: 10  # 初始放量 10%
```

应用配置：
```bash
# 通过 Traefik API 更新路由权重
curl -X POST http://traefik:8080/api/http/services/topems-api/update \
  -d '{"weighted": {"services": {"topems-api-stable": 90, "topems-api-canary": 10}}}'
```

#### 4. 监控与放量

**监控指标**：
- 错误率（目标：< 5%）
- P99 响应时间（目标：< 2000ms）
- CPU/内存使用率
- 业务指标（订单量、交易成功率）

**放量节奏**：
1. 10% → 观察 10 分钟
2. 30% → 观察 10 分钟
3. 50% → 观察 10 分钟
4. 100% → 完成发布

#### 5. 自动放量配置

```yaml
auto_promotion:
  enabled: true
  check_interval_minutes: 10
  increment_percent: 10
  target_percent: 100
```

### 回滚条件

当出现以下情况时自动回滚：
- 错误率 > 5%
- P99 响应时间 > 2000ms
- 业务指标异常下降 > 20%

---

## 蓝绿部署

### 概述

蓝绿部署适用于重大版本更新，通过维护两套完整环境实现快速切换和回滚。

### 部署流程

#### 1. 环境准备

```bash
# 查看当前活跃环境（蓝）
./scripts/blue-green-deploy.sh topems-api v23.0 --status

# 输出：当前活跃版本: v23.0 (blue)
```

#### 2. 部署绿环境

```bash
# 在绿环境部署新版本 v24.0
kubectl apply -f k8s/services/topems-api-green.yaml

# 等待绿环境就绪
kubectl rollout status deployment/topems-api-green

# 运行健康检查
./scripts/blue-green-deploy.sh topems-api v24.0 --healthcheck
```

#### 3. 切换流量

```bash
# 切换流量到绿环境
./scripts/blue-green-deploy.sh topems-api v24.0 --switch

# 输出：
# 🚀 蓝绿部署: topems-api@v24.0
# 动作: --switch
# 切换流量到新版本（绿）...
# ✅ 流量已切换到 v24.0
```

#### 4. 验证与回滚

**验证**：
```bash
# 监控新版本指标
kubectl logs -f deployment/topems-api-green | grep ERROR

# 检查业务指标
curl http://prometheus:9090/api/v1/query?query=topems_api_success_rate
```

**回滚**（发现问题）：
```bash
# 立即回滚到蓝环境
./scripts/blue-green-deploy.sh topems-api v23.0 --rollback
```

---

## 特性开关

### 概述

特性开关（Feature Flags）允许在不重新部署的情况下控制功能开启，支持用户维度灰度。

### 使用场景

1. **功能灰度**：新功能逐步开放给用户
2. **AB 测试**：对比不同功能方案
3. **紧急关闭**：发现问题时快速禁用功能
4. **环境差异**：不同环境启用不同功能

### 后端使用

#### 1. 注册特性开关

```rust
use topems_shared::{FeatureFlagService, FeatureFlag, FeatureState, FeatureCondition};
use chrono::Utc;
use uuid::Uuid;

let service = FeatureFlagService::new();

// 注册特性开关
let flag = FeatureFlag {
    key: "new_dashboard".to_string(),
    name: "新版本仪表盘".to_string(),
    description: Some("全新的数据可视化界面".to_string()),
    state: FeatureState::Conditional,
    conditions: vec![
        FeatureCondition::TenantWhitelist(vec![
            Uuid::parse_str("tenant-uuid-1").unwrap(),
        ]),
        FeatureCondition::UserPercentage(10),
    ],
    created_at: Utc::now(),
    updated_at: Utc::now(),
    created_by: Some("admin".to_string()),
};

service.register(flag);
```

#### 2. 检查特性状态

```rust
use topems_shared::FeatureContext;

let context = FeatureContext {
    tenant_id: Some(user.tenant_id),
    user_id: Some(user.id),
    environment: "production".to_string(),
    metadata: HashMap::new(),
};

if service.is_enabled("new_dashboard", &context) {
    // 渲染新仪表盘
} else {
    // 渲染旧仪表盘
}
```

### 前端使用

#### 1. 单个特性检查

```typescript
import { useFeatureFlag } from '@/hooks/useFeatureFlag';

function Dashboard() {
  const { enabled, loading } = useFeatureFlag('new_dashboard');

  if (loading) return <Loading />;

  return enabled ? <NewDashboard /> : <OldDashboard />;
}
```

#### 2. 批量特性检查

```typescript
import { useFeatureFlags } from '@/hooks/useFeatureFlag';

function FeaturePanel() {
  const features = useFeatureFlags(['new_dashboard', 'ai_chat', 'export_pdf']);

  return (
    <div>
      {features.new_dashboard && <DashboardSection />}
      {features.ai_chat && <AIChatSection />}
      {features.export_pdf && <ExportSection />}
    </div>
  );
}
```

#### 3. 特性守卫组件

```typescript
import { FeatureGate } from '@/hooks/useFeatureFlag';

function App() {
  return (
    <div>
      <FeatureGate feature="new_dashboard" fallback={<OldDashboard />}>
        <NewDashboard />
      </FeatureGate>

      <FeatureGate feature="ai_chat">
        <AIChatButton />
      </FeatureGate>
    </div>
  );
}
```

### 条件类型

| 条件类型 | 说明 | 示例 |
|---------|------|------|
| TenantWhitelist | 租户白名单 | `TenantWhitelist([uuid1, uuid2])` |
| UserWhitelist | 用户白名单 | `UserWhitelist([uuid1, uuid2])` |
| UserPercentage | 用户百分比 | `UserPercentage(10)` - 10% 用户 |
| Environment | 环境限制 | `Environment("staging")` |
| And | 组合条件（AND） | `And([cond1, cond2])` - 全部满足 |
| Or | 组合条件（OR） | `Or([cond1, cond2])` - 任一满足 |

---

## 发布检查清单

### 发布前检查

#### 代码质量
- [ ] 所有单元测试通过
- [ ] 集成测试通过
- [ ] 代码审查完成
- [ ] 安全漏洞扫描通过

#### 配置检查
- [ ] 数据库迁移脚本准备就绪
- [ ] 环境变量配置正确
- [ ] 特性开关配置已更新
- [ ] 监控告警规则已配置

#### 备份与回滚
- [ ] 数据库已备份
- [ ] 回滚脚本已测试
- [ ] 蓝绿/金丝雀配置已就绪

### 发布中监控

#### 系统指标
- [ ] CPU 使用率 < 80%
- [ ] 内存使用率 < 85%
- [ ] 错误率 < 5%
- [ ] P99 响应时间 < 2000ms

#### 业务指标
- [ ] 订单成功率正常
- [ ] 支付成功率正常
- [ ] 用户活跃度正常

### 发布后验证

#### 功能验证
- [ ] 核心业务流程正常
- [ ] 新功能运行正常
- [ ] 特性开关生效

#### 性能验证
- [ ] 系统响应时间正常
- [ ] 数据库查询性能正常
- [ ] 缓存命中率正常

---

## 回滚操作手册

### 金丝雀发布回滚

#### 自动回滚
系统监控到异常时自动回滚（配置了自动回滚时）。

#### 手动回滚

```bash
# 1. 立即将金丝雀权重降为 0
curl -X POST http://traefik:8080/api/http/services/topems-api/update \
  -d '{"weighted": {"services": {"topems-api-stable": 100, "topems-api-canary": 0}}}'

# 2. 删除金丝雀部署
kubectl delete deployment topems-api-canary

# 3. 验证流量已回退
kubectl logs -f deployment/topems-api-stable | tail -50
```

### 蓝绿部署回滚

```bash
# 一键回滚到上一版本
./scripts/blue-green-deploy.sh topems-api v23.0 --rollback

# 输出：
# 🚀 蓝绿部署: topems-api@v23.0
# 动作: --rollback
# 回滚到旧版本（蓝）...
# ✅ 已回滚
```

### 特性开关回滚

#### 立即关闭功能

```rust
// 后端 API
service.update_state("problematic_feature", FeatureState::Disabled);
```

#### 通过管理界面

1. 访问特性开关管理页面
2. 找到目标特性
3. 将状态改为 `Disabled`
4. 保存更改

### 紧急回滚流程

1. **停止发布**（发现严重问题）
   ```bash
   # 立即停止所有金丝雀流量
   ./scripts/emergency-stop.sh
   ```

2. **通知团队**
   - 通知开发团队
   - 通知运维团队
   - 通知业务团队

3. **数据修复**（如有数据损坏）
   ```bash
   # 执行数据修复脚本
   ./scripts/rollback-data.sh --version v23.0
   ```

4. **事后分析**
   - 收集日志和监控数据
   - 分析问题根因
   - 编写事故报告
   - 改进发布流程

---

## 最佳实践

1. **渐进式发布**：始终从小流量开始，逐步放量
2. **充分监控**：发布前配置好所有监控和告警
3. **快速回滚**：确保回滚脚本随时可用
4. **特性开关**：新功能默认关闭，逐步开启
5. **自动化测试**：发布前运行完整测试套件
6. **备份优先**：任何发布前确保数据已备份

---

## 相关文档

- [Traefik 路由配置](../../deploy/k8s/base/ingress.yaml)
- [监控配置](../../deploy/docker/prometheus/prometheus.yml)
- [数据库开发指南](../development/backend/database-development.md)
- [API 文档](../api/README.md)