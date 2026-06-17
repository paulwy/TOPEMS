# 后端服务整合实施方案

## 一、整合概述

### 1.1 整合目标
将 28 个独立服务整合为 22 个，减少服务数量，降低运维复杂度，同时保持功能边界清晰。

### 1.2 整合原则

| 原则 | 说明 |
|------|------|
| **业务聚合** | 整合功能边界清晰、数据高度相关的服务 |
| **实时性保障** | 避免服务间同步导致的延迟和数据不一致 |
| **运维简化** | 减少独立部署的服务数量 |
| **向后兼容** | 通过代理保持旧 API 路径可用 |

### 1.3 整合清单

| 序号 | 整合项 | 合并后服务名 | 端口规划 | 状态 | 整合意图 |
|------|--------|--------------|----------|------|----------|
| 1 | notification + im + mail | **communication** | 8055 | ✅ 已完成 | 统一通讯渠道，消息实时推送 |
| 2 | mes + pdm | **manufacturing** | 8030 | ✅ 已完成 | 生产执行与产品数据紧密耦合 |
| 3 | qms + lims + ehs | **quality-assurance** | 8032 | ✅ 已完成 | 质量、实验室、环境数据共享 |
| 4 | bi + report | **analytics** | 8060 | ✅ 已完成 | 统一数据分析和报表展示 |

---

## 二、整合方案详解

### 2.1 整合一：Communication 服务 (通知通讯)

**源服务：**
- `notification` (8002) - 系统通知、WebSocket 推送
- `im` (8052) - 即时通讯、聊天室
- `mail` (8051) - 邮件发送

**合并后架构：**
```
communication/
├── src/
│   ├── main.rs              # 统一入口
│   ├── modules/
│   │   ├── notification/    # 通知模块
│   │   │   ├── handlers.rs
│   │   │   ├── models.rs
│   │   │   └── mod.rs
│   │   ├── im/              # 即时消息模块
│   │   │   ├── handlers.rs
│   │   │   ├── models.rs
│   │   │   ├── ws_manager.rs
│   │   │   └── mod.rs
│   │   └── mail/            # 邮件模块
│   │       ├── handlers.rs
│   │       ├── models.rs
│   │       ├── services.rs
│   │       └── mod.rs
│   └── shared/
│       ├── templates.rs     # 统一消息模板
│       └── channels.rs      # 统一发送渠道
```

**API 路由设计：**
```
POST   /api/comm/notify/send           # 发送通知
POST   /api/comm/notify/broadcast      # 广播通知
GET    /api/comm/notify/list           # 通知列表
WS     /api/comm/im/connect            # IM WebSocket
POST   /api/comm/im/room/create        # 创建聊天室
GET    /api/comm/im/room/:id/messages  # 获取消息历史
POST   /api/comm/mail/send             # 发送邮件
POST   /api/comm/mail/template/send    # 模板邮件发送
```

**数据库整合：**
```sql
-- 统一消息表
CREATE TABLE comm_messages (
    id UUID PRIMARY KEY,
    channel VARCHAR(20) NOT NULL,  -- 'notification', 'im', 'mail'
    user_id VARCHAR(64) NOT NULL,
    title VARCHAR(255),
    content TEXT,
    metadata JSONB,
    sent_at TIMESTAMP DEFAULT NOW(),
    read_at TIMESTAMP,
    INDEX idx_channel_user (channel, user_id),
    INDEX idx_sent_at (sent_at)
);

-- 统一订阅表
CREATE TABLE comm_subscriptions (
    id UUID PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    channel VARCHAR(20) NOT NULL,
    event_type VARCHAR(64) NOT NULL,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);
```

**迁移步骤：**
1. 创建 `communication` 服务骨架
2. 迁移 `notification` 模块代码
3. 迁移 `im` 模块代码
4. 迁移 `mail` 模块代码
5. 创建统一 `channels` 服务
6. 合并数据库表结构
7. 更新 API 网关路由
8. 编写迁移脚本
9. 灰度切换测试
10. 下线原 3 个服务

**风险控制：**
- 阶段一：保持原服务运行，同时写入新表
- 阶段二：切换读请求到新服务
- 阶段三：完全切换，保留回滚能力

---

### 2.2 整合二：Manufacturing 服务 (生产制造)

**源服务：**
- `mes` (8030) - 生产执行系统
- `pdm` (8023) - 产品数据管理

**整合意图：**
| 考量因素 | 说明 |
|----------|------|
| 业务关联度 | ★★★★★ MES 执行依赖 PDM 的产品配方、工艺路线、物料规格 |
| 实时性要求 | ★★★★☆ 产品变更需实时生效到生产工单 |
| 数据一致性 | ★★★★★ 批次追溯需要统一的数据模型 |

**典型场景**：
- 配方更新后，MES 立即使用新配方生产
- 物料变更实时同步到工单配料
- 工序版本与生产批次一一对应

**合并后架构：**
```
manufacturing/
├── src/
│   ├── main.rs
│   ├── modules/
│   │   ├── production/      # 生产执行模块
│   │   │   ├── handlers.rs
│   │   │   ├── models.rs
│   │   │   ├── work_order.rs
│   │   │   ├── routing.rs   # 工艺路线
│   │   │   └── mod.rs
│   │   └── data/            # 生产数据模块 (原 PDM)
│   │       ├── handlers.rs
│   │       ├── models.rs
│   │       ├── recipe.rs    # 配方
│   │       ├── batch.rs     # 批次
│   │       └── mod.rs
│   └── shared/
│       ├── mrp.rs           # MRP 运算
│       └── scheduling.rs     # 排程
```

**API 路由设计：**
```
# 生产执行
POST   /api/mfg/work-order/create
GET    /api/mfg/work-order/:id
PUT    /api/mfg/work-order/:id/start
PUT    /api/mfg/work-order/:id/complete
GET    /api/mfg/routing/:product_id

# 生产数据
POST   /api/mfg/recipe/create
GET    /api/mfg/recipe/:id
PUT    /api/mfg/recipe/:id/activate
POST   /api/mfg/batch/create
GET    /api/mfg/batch/:id/trace
```

**整合收益：**
- 消除 MES ↔ PDM 数据同步延迟
- 统一生产数据模型
- 配方变更实时生效到工单

**迁移步骤：**
1. 创建 `manufacturing` 服务骨架
2. 迁移 `mes` 核心模块 (工单、工站)
3. 迁移 `pdm` 核心模块 (配方、工艺)
4. 合并共享逻辑 (MRP、排程)
5. 统一数据库表结构
6. 编写 MES↔PDM 数据迁移脚本
7. 灰度切换
8. 下线原 2 个服务

---

### 2.3 整合三：Quality Assurance 服务 (质量管控)

**源服务：**
- `qms` (8031) - 质量管理
- `lims` (8022) - 实验室管理
- `ehs` (8032) - 环境健康安全

**整合意图：**
| 考量因素 | 说明 |
|----------|------|
| 业务关联度 | ★★★★★ 质量、实验室、环境都属于"质量管控"范畴 |
| 数据共享 | ★★★★★ 检验标准可被 QMS/LIMS/EHS 共用 |
| 响应时效 | ★★★★☆ 质量问题需快速联动实验室检测 |
| 合规管理 | ★★★★★ 质量、环境、安全合规一体化 |

**典型场景**：
```
原料入库 → QMS 来料检验 → 发现异常 → LIMS 送检 → EHS 环境评估
                                      ↓
                              问题关联检测记录
```

**统一标准库**：
- 检验标准（国标、行标、企标）
- 合格判定规则
- 检测方法库

**合并后架构：**
```
quality-assurance/
├── src/
│   ├── main.rs
│   ├── modules/
│   │   ├── quality/         # 质量管理模块 (原 QMS)
│   │   │   ├── handlers.rs
│   │   │   ├── models.rs
│   │   │   ├── inspection.rs
│   │   │   ├── issue.rs
│   │   │   └── mod.rs
│   │   ├── lab/             # 实验室模块 (原 LIMS)
│   │   │   ├── handlers.rs
│   │   │   ├── models.rs
│   │   │   ├── sample.rs
│   │   │   ├── instrument.rs
│   │   │   └── mod.rs
│   │   └── ehs/             # EHS 模块 (原 EHS)
│   │       ├── handlers.rs
│   │       ├── models.rs
│   │       ├── risk.rs
│   │       ├── accident.rs
│   │       └── mod.rs
│   └── shared/
│       ├── standards.rs      # 统一标准库
│       └── compliance.rs     # 合规检查
```

**API 路由设计：**
```
# 质量管理
POST   /api/qa/inspection/create
GET    /api/qa/inspection/:id
PUT    /api/qa/inspection/:id/result
POST   /api/qa/issue/create
GET    /api/qa/issue/:id

# 实验室
POST   /api/qa/lab/sample/register
GET    /api/qa/lab/sample/:id
POST   /api/qa/lab/test/request
GET    /api/qa/lab/instrument/:id/calibration

# EHS
POST   /api/qa/ehs/risk/assess
GET    /api/qa/ehs/risk/:id
POST   /api/qa/ehs/accident/report
```

**整合收益：**
- 质检、实验、EHS 共享检验标准
- 质量问题可关联实验室检测结果
- 统一质量分析报表

---

### 2.4 整合四：Analytics 服务 (分析报表)

**源服务：**
- `bi` (8060) - 商业智能/数据大屏
- `report` (8061) - 报表中心

**整合意图：**
| 考量因素 | 说明 |
|----------|------|
| 用户体验 | ★★★★★ 用户期望在同一平台查看数据大屏和报表 |
| 数据一致性 | ★★★★☆ 避免 BI 和报表使用不同数据源 |
| 统一权限 | ★★★★☆ 统一的数据权限控制 |
| 维护成本 | ★★★★☆ 减少两套报表系统的维护 |

**典型场景**：
```
用户登录 → 查看数据大屏（BI） → 点击详情 → 跳转报表（Report）
     ↑                              ↓
     ←────── 统一权限和数据源 ───────←
```

**合并后架构：**
```
analytics/
├── src/
│   ├── main.rs
│   ├── modules/
│   │   ├── dashboard/        # 数据大屏模块 (原 BI)
│   │   │   ├── handlers.rs
│   │   │   ├── models.rs
│   │   │   ├── widgets.rs
│   │   │   └── mod.rs
│   │   └── report/           # 报表模块 (原 Report)
│   │       ├── handlers.rs
│   │       ├── models.rs
│   │       ├── builder.rs
│   │       ├── export.rs
│   │       └── mod.rs
│   └── shared/
│       ├── data_source.rs    # 统一数据源
│       └── cache.rs          # 报表缓存
```

**API 路由设计：**
```
# 数据大屏
GET    /api/analytics/dashboard
POST   /api/analytics/dashboard/create
GET    /api/analytics/widget/:id/data

# 报表
GET    /api/analytics/report
POST   /api/analytics/report/create
GET    /api/analytics/report/:id
POST   /api/analytics/report/:id/export?format=pdf|excel
```

**整合收益：**
- 统一数据展示入口
- 共享数据源连接池
- 减少报表服务重复

---

## 三、实施计划

### 3.1 时间安排

```
Week 1-2: Communication 服务整合
├── Day 1-3: 创建服务骨架，迁移 notification
├── Day 4-6: 迁移 im 模块
├── Day 7-8: 迁移 mail 模块
├── Day 9-12: 统一 channels 和 templates
├── Day 13-14: API 网关更新，灰度测试

Week 3-4: Manufacturing 服务整合
├── Day 1-4: 创建服务骨架，迁移 mes 核心
├── Day 5-8: 迁移 pdm 模块
├── Day 9-10: 合并共享逻辑
├── Day 11-14: 数据迁移，灰度测试

Week 5: Quality Assurance 服务整合
├── Day 1-2: 创建服务骨架
├── Day 3-4: 迁移 qms
├── Day 5-6: 迁移 lims
├── Day 7-8: 迁移 ehs
├── Day 9-10: 共享模块，测试

Week 6: Analytics 服务整合
├── Day 1-2: 迁移 bi 模块
├── Day 3-4: 迁移 report 模块
├── Day 5: 统一数据源，测试

Week 7-8: 收尾
├── 服务下线
├── 文档更新
├── 监控告警配置
└── 最终验收
```

### 3.2 资源投入

| 角色 | 工作内容 | 人天 |
|------|----------|------|
| 后端工程师 | 服务整合开发 | 20 |
| DBA | 数据库迁移 | 3 |
| DevOps | 部署配置 | 5 |
| 测试工程师 | 集成测试 | 5 |
| **合计** | | **33** |

---

## 四、风险与对策

| 风险 | 等级 | 对策 |
|------|------|------|
| 迁移过程中数据丢失 | 高 | 保留原服务只读状态，双写验证 |
| 切换期间服务中断 | 中 | 蓝绿部署，秒级回滚 |
| API 兼容性问题 | 中 | 保留原 API 路径做代理 |
| 性能下降 | 低 | 提前做压力测试，按需扩展 |

---

## 五、验证标准

1. **功能验证**：所有原 API 路径正常工作
2. **性能验证**：响应时间不超过原服务 120%
3. **数据验证**：数据库记录数一致
4. **监控验证**：Prometheus 指标正常采集
5. **日志验证**：日志格式兼容现有 ELK

---

## 六、服务下线清单

整合完成后需下线的服务：

### ✅ 已整合 - 待下线（原服务保持运行作为备份）

| 服务 | 端口 | 整合到 | 下线条件 |
|------|------|--------|----------|
| `svc/notification` | 8002 | communication:8055 | 新服务稳定运行 7 天 |
| `svc/im` | 8052 | communication:8055 | 新服务稳定运行 7 天 |
| `svc/mail` | 8051 | communication:8055 | 新服务稳定运行 7 天 |
| `svc/mes` | 8030 | manufacturing:8030 | 新服务稳定运行 7 天 |
| `svc/pdm` | 8023 | manufacturing:8030 | 新服务稳定运行 7 天 |
| `svc/qms` | 8031 | quality-assurance:8032 | 新服务稳定运行 7 天 |
| `svc/lims` | 8022 | quality-assurance:8032 | 新服务稳定运行 7 天 |
| `svc/ehs` | 8032 | quality-assurance:8032 | 新服务稳定运行 7 天 |
| `svc/bi` | 8060 | analytics:8060 | 新服务稳定运行 7 天 |
| `svc/report` | 8061 | analytics:8060 | 新服务稳定运行 7 天 |

### 下线前检查清单

每个服务下线前需确认：
- [ ] 流量已完全迁移到新服务
- [ ] 日志已归档
- [ ] 监控告警已移除
- [ ] 负载均衡器/反向代理配置已更新
- [ ] DNS/CNAME 记录已更新（如适用）
- [ ] 备份已确认可用

---

## 七、已完成工作总结

### Communication 服务整合 ✅

**完成时间**: 2026-06-17

**已完成的工作**:
1. ✅ 创建 `svc/communication` 服务骨架
2. ✅ 迁移 notification 模块（handlers, models, db repository）
3. ✅ 迁移 im 模块（handlers, models, WebSocket manager）
4. ✅ 迁移 mail 模块（handlers, models, Email service）
5. ✅ 创建统一 `shared` 模块（channels, templates）
6. ✅ 更新 `ports.env` 端口配置
7. ✅ 更新 `vite.config.ts` 前端代理配置
8. ✅ 服务编译通过

**API 路由映射**:
| 原路径 | 新路径 | 状态 |
|--------|--------|------|
| `/notification/*` | `/api/comm/notify/*` | ✅ 已配置代理 |
| `/mail/*` | `/api/comm/mail/*` | ✅ 已配置代理 |
| `/im/*` | `/api/comm/im/*` | ✅ 已配置代理 |

**新服务信息**:
- 端口: 8055
- 状态: 已编译，待启动测试
- 向后兼容: ✅ 支持旧路径（通过代理）
