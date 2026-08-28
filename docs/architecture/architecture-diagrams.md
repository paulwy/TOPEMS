# TOPEMS 架构图

## 概述

本文档使用 Mermaid 图表展示 TOPEMS 项目的整体架构、服务关系、数据流、部署架构等，帮助开发者和用户快速理解系统结构。

## 目录

- [整体架构](#整体架构)
- [分层架构](#分层架构)
- [微服务架构](#微服务架构)
- [服务关系图](#服务关系图)
- [数据流图](#数据流图)
- [认证授权流程](#认证授权流程)
- [AI 服务架构](#ai-服务架构)
- [部署架构](#部署架构)
- [高可用架构](#高可用架构)
- [监控架构](#监控架构)

---

## 整体架构

### 系统总览

```mermaid
graph TB
    subgraph 客户端["客户端层"]
        Web[Web 应用<br/>React + TypeScript]
        Desktop[桌面应用<br/>Tauri]
        Mobile[移动应用<br/>React Native]
        API_Client[第三方 API 客户端]
    end

    subgraph 网关["网关层"]
        Nginx[Nginx 反向代理<br/>负载均衡 / SSL / 缓存]
        BFF[BFF 服务<br/>GraphQL / REST 聚合]
    end

    subgraph 核心服务["核心服务层"]
        IAM[IAM 身份认证<br/>统一认证 / 权限管理]
        Doc[文档管理<br/>文档存储 / 版本控制]
        File[文件服务<br/>统一文件存储]
        Flow[流程自动化<br/>工作流 / 审批]
        Notify[通知服务<br/>消息推送 / 邮件]
        Monitor[监控服务<br/>健康检查 / 指标]
    end

    subgraph 业务服务["业务服务层"]
        ERP[ERP 企业资源计划]
        Finance[财务 Finance]
        HRM[人力资源 HRM]
        CRM[客户关系 CRM]
        PM[项目管理 PM]
        MES[制造执行 MES]
        PDM[产品数据 PDM]
        QMS[质量管理 QMS]
        LIMS[实验室管理 LIMS]
        EHS[环境健康 EHS]
        SCM[供应链 SCM]
        WMS[仓储管理 WMS]
        SRM[供应商 SRM]
        BI[商业智能 BI]
        AI[AI 智能服务]
    end

    subgraph 数据层["数据层"]
        PostgreSQL[(PostgreSQL<br/>主数据库)]
        Redis[(Redis<br/>缓存 / 消息队列)]
        MinIO[(MinIO / S3<br/>对象存储)]
        Vector[(向量数据库<br/>pgvector)]
    end

    subgraph 基础设施["基础设施层"]
        Docker[Docker / K8s<br/>容器编排]
        Prometheus[Prometheus<br/>指标采集]
        Grafana[Grafana<br/>可视化]
        ELK[ELK Stack<br/>日志管理]
    end

    客户端 --> 网关
    网关 --> 核心服务
    网关 --> 业务服务
    核心服务 --> 数据层
    业务服务 --> 数据层
    核心服务 --> 基础设施
    业务服务 --> 基础设施
```

---

## 分层架构

### 五层架构模型

```mermaid
graph TB
    subgraph L5["L5 - 表示层 (Presentation)"]
        direction LR
        WebApp[Web 应用]
        DesktopApp[桌面应用]
        MobileApp[移动应用]
        API[API 接口]
    end

    subgraph L4["L4 - 网关层 (Gateway)"]
        direction LR
        ReverseProxy[反向代理<br/>Nginx]
        LoadBalancer[负载均衡]
        APIGateway[API 网关<br/>认证 / 限流 / 路由]
        BFF[BFF 层<br/>GraphQL / 聚合]
    end

    subgraph L3["L3 - 业务服务层 (Business Services)"]
        direction LR
        CoreServices[核心服务<br/>IAM / Doc / File / Flow]
        BusinessServices[业务服务<br/>ERP / CRM / HRM / MES]
        AIServices[AI 服务<br/>智能问答 / RAG / 向量搜索]
    end

    subgraph L2["L2 - 服务支撑层 (Service Support)"]
        direction LR
        ServiceRegistry[服务注册<br/>发现 / 健康检查]
        ConfigCenter[配置中心<br/>统一配置管理]
        MessageQueue[消息队列<br/>异步通信 / 事件]
        Cache[缓存服务<br/>Redis / 多级缓存]
    end

    subgraph L1["L1 - 数据存储层 (Data Storage)"]
        direction LR
        RDBMS[关系数据库<br/>PostgreSQL]
        NoSQL[NoSQL 数据库<br/>Redis / MongoDB]
        ObjectStorage[对象存储<br/>MinIO / S3]
        VectorDB[向量数据库<br/>pgvector]
        SearchEngine[搜索引擎<br/>Elasticsearch]
    end

    L5 --> L4
    L4 --> L3
    L3 --> L2
    L2 --> L1
```

---

## 微服务架构

### 服务分类与端口

```mermaid
graph LR
    subgraph 核心服务["核心服务 (8000-8009)"]
        UnifiedCore[unified-core:8000<br/>IAM / Doc / Flow / File / Monitor]
    end

    subgraph 业务服务["业务服务 (8010-8029)"]
        ERP[erp:8010]
        Finance[finance:8011]
        AI[ai:8013]
        HRM[hrm:8020]
        PM[pm:8023]
        CRM[crm:8029]
    end

    subgraph 制造服务["制造服务 (8030-8039)"]
        MES[mes:8030]
        PDM[pdm:8031]
    end

    subgraph 供应链服务["供应链服务 (8040-8049)"]
        SCM[scm:8040]
        WMS[wms:8041]
        SRM[srm:8042]
    end

    subgraph 质量服务["质量与实验室 (8050-8059)"]
        QMS[qms:8050]
        LIMS[lims:8051]
        EHS[ehs:8052]
        RD[rd:8053]
    end

    subgraph 分析服务["分析与扩展 (8060-8099)"]
        BI[analytics:8060]
        Portal[portal:8063]
        Mobile[mobile:8070]
        GIS[gis:8071]
        Integration[integration:8072]
        Search[search:8082]
        Comm[communication:8084]
        MasterData[master-data:8090]
    end
```

---

## 服务关系图

### 服务依赖关系

```mermaid
graph TB
    subgraph 入口["入口"]
        Client[客户端]
        Nginx[Nginx]
    end

    subgraph 核心["核心服务"]
        IAM[IAM 认证服务]
        Doc[文档服务]
        File[文件服务]
        Flow[流程服务]
        Notify[通知服务]
    end

    subgraph 业务["业务服务"]
        ERP[ERP]
        CRM[CRM]
        HRM[HRM]
        Finance[Finance]
        MES[MES]
        BI[BI]
        AI[AI 服务]
    end

    subgraph 共享["共享服务"]
        DB[(数据库)]
        Redis[(Redis)]
        Storage[(对象存储)]
    end

    Client --> Nginx
    Nginx --> IAM
    Nginx --> Doc
    Nginx --> File
    Nginx --> Flow
    Nginx --> Notify
    Nginx --> ERP
    Nginx --> CRM
    Nginx --> HRM
    Nginx --> Finance
    Nginx --> MES
    Nginx --> BI
    Nginx --> AI

    ERP --> IAM
    CRM --> IAM
    HRM --> IAM
    Finance --> IAM
    MES --> IAM
    BI --> IAM
    AI --> IAM

    ERP --> DB
    CRM --> DB
    HRM --> DB
    Finance --> DB
    MES --> DB
    BI --> DB
    AI --> DB

    ERP --> Redis
    CRM --> Redis
    HRM --> Redis
    AI --> Redis

    Doc --> Storage
    File --> Storage
    AI --> Storage

    Flow --> Notify
    ERP --> Flow
    HRM --> Flow
```

---

## 数据流图

### 用户请求数据流

```mermaid
sequenceDiagram
    participant User as 用户
    participant Browser as 浏览器
    participant Nginx as Nginx
    participant API as API 服务
    participant Auth as 认证服务
    participant Cache as Redis 缓存
    participant DB as 数据库
    participant Storage as 对象存储

    User->>Browser: 输入 URL
    Browser->>Nginx: HTTP 请求
    Nginx->>Nginx: SSL 终止 / 静态资源
    Nginx->>API: 转发请求

    API->>Auth: 验证 JWT Token
    Auth->>Cache: 检查 Token 缓存
    Cache-->>Auth: 返回缓存结果
    Auth-->>API: 认证通过

    API->>Cache: 检查数据缓存
    alt 缓存命中
        Cache-->>API: 返回缓存数据
    else 缓存未命中
        API->>DB: 查询数据库
        DB-->>API: 返回数据
        API->>Cache: 写入缓存
    end

    API->>Storage: 获取文件（如需要）
    Storage-->>API: 返回文件

    API-->>Nginx: 返回响应
    Nginx-->>Browser: HTTP 响应
    Browser-->>User: 渲染页面
```

---

## 认证授权流程

### JWT 认证流程

```mermaid
sequenceDiagram
    participant User as 用户
    participant Client as 客户端
    participant Gateway as 网关
    participant Auth as IAM 服务
    participant DB as 用户数据库
    participant Redis as Redis

    User->>Client: 输入用户名密码
    Client->>Gateway: POST /api/core/auth/v1/login
    Gateway->>Auth: 转发登录请求

    Auth->>DB: 查询用户信息
    DB-->>Auth: 返回用户数据（含密码哈希）

    Auth->>Auth: 验证密码（bcrypt 比对）
    alt 密码正确
        Auth->>Auth: 生成 Access Token (15分钟)
        Auth->>Auth: 生成 Refresh Token (7天)
        Auth->>Redis: 存储 Refresh Token
        Auth-->>Gateway: 返回 Token 对
        Gateway-->>Client: 返回登录成功
        Client->>Client: 存储 Token (HttpOnly Cookie)
    else 密码错误
        Auth-->>Gateway: 返回 401 错误
        Gateway-->>Client: 返回登录失败
        Client-->>User: 显示错误信息
    end

    Note over Client,Redis: 后续请求

    Client->>Gateway: API 请求 (携带 Access Token)
    Gateway->>Auth: 验证 Token
    Auth->>Redis: 检查 Token 黑名单
    Redis-->>Auth: 返回结果
    Auth-->>Gateway: 认证通过 + 用户信息
    Gateway->>Gateway: 注入用户上下文
    Gateway->>业务服务: 转发请求
```

### Token 刷新流程

```mermaid
sequenceDiagram
    participant Client as 客户端
    participant Gateway as 网关
    participant Auth as IAM 服务
    participant Redis as Redis

    Client->>Gateway: API 请求 (Access Token 过期)
    Gateway->>Auth: 验证 Token
    Auth-->>Gateway: 返回 401 Token 过期

    Client->>Gateway: POST /api/core/auth/v1/refresh (携带 Refresh Token)
    Gateway->>Auth: 转发刷新请求
    Auth->>Redis: 验证 Refresh Token
    Redis-->>Auth: Token 有效

    Auth->>Auth: 生成新的 Access Token
    Auth->>Redis: 更新 Refresh Token (轮换)
    Auth-->>Gateway: 返回新的 Token 对
    Gateway-->>Client: 返回刷新成功

    Client->>Gateway: 重新发起 API 请求 (新 Token)
    Gateway->>业务服务: 转发请求
```

---

## AI 服务架构

### RAG 检索增强生成

```mermaid
graph TB
    subgraph 输入["用户输入"]
        Question[用户问题]
    end

    subgraph 处理["处理流程"]
        Embedding1[文本向量化<br/>Ollama Embedding]
        VectorSearch[向量搜索<br/>Redis HNSW / pgvector]
        ContextBuilder[上下文构建<br/>检索结果 + 问题]
        Prompt[Prompt 构建<br/>系统提示 + 上下文 + 问题]
        LLM[LLM 推理<br/>Ollama Qwen2.5]
    end

    subgraph 知识库["知识库"]
        Documents[文档库<br/>企业文档 / 手册]
        Chunking[文档分块<br/>按语义分块]
        Embedding2[批量向量化<br/>建立索引]
        VectorDB[(向量数据库<br/>存储向量 + 元数据)]
    end

    subgraph 输出["输出"]
        Answer[AI 回答]
        Citation[引用来源]
    end

    Question --> Embedding1
    Embedding1 --> VectorSearch
    VectorSearch --> ContextBuilder
    ContextBuilder --> Prompt
    Prompt --> LLM
    LLM --> Answer
    LLM --> Citation

    Documents --> Chunking
    Chunking --> Embedding2
    Embedding2 --> VectorDB
    VectorDB --> VectorSearch
```

### AI 对话流程

```mermaid
sequenceDiagram
    participant User as 用户
    participant UI as 前端 UI
    participant API as AI API 服务
    participant Intent as 意图识别
    participant RAG as RAG 检索
    participant LLM as LLM 服务
    participant Tool as 工具调用
    participant DB as 数据库

    User->>UI: 输入问题
    UI->>API: WebSocket / SSE 发送消息

    API->>Intent: 识别用户意图
    Intent-->>API: 返回意图 + 实体

    alt 需要知识库
        API->>RAG: 检索相关文档
        RAG-->>API: 返回相关上下文
    end

    alt 需要调用工具
        API->>Tool: 调用业务工具 (ERP/CRM/...)
        Tool->>DB: 查询/操作数据
        DB-->>Tool: 返回结果
        Tool-->>API: 返回工具结果
    end

    API->>LLM: 发送 Prompt (含上下文 + 工具结果)
    LLM-->>API: 流式返回响应

    API-->>UI: 流式推送响应
    UI-->>User: 实时显示回答

    API->>DB: 保存对话记录
    API->>DB: 记录调用日志 (Token / 耗时 / 成本)
```

---

## 部署架构

### 单机部署（开发/测试）

```mermaid
graph TB
    subgraph 服务器["单台服务器"]
        subgraph 容器["Docker 容器"]
            Postgres[(PostgreSQL)]
            Redis[(Redis)]
            MinIO[(MinIO)]
        end

        subgraph 进程["本地进程"]
            Nginx[Nginx]
            Core[核心服务]
            Business[业务服务]
            Frontend[前端静态文件]
        end
    end

    User[用户] -->|HTTP/HTTPS| Nginx
    Nginx --> Frontend
    Nginx --> Core
    Nginx --> Business
    Core --> Postgres
    Business --> Postgres
    Core --> Redis
    Business --> Redis
    Core --> MinIO
    Business --> MinIO
```

### 生产环境部署（高可用）

```mermaid
graph TB
    subgraph LB["负载均衡层"]
        LB1[Nginx LB 1]
        LB2[Nginx LB 2]
    end

    subgraph Web["Web 层 (3 实例)"]
        Web1[Web 节点 1]
        Web2[Web 节点 2]
        Web3[Web 节点 3]
    end

    subgraph App["应用层 (多实例)"]
        Core1[核心服务 1]
        Core2[核心服务 2]
        Biz1[业务服务 1]
        Biz2[业务服务 2]
        AI1[AI 服务 1]
    end

    subgraph Cache["缓存层"]
        RedisMaster[(Redis Master)]
        RedisSlave1[(Redis Slave 1)]
        RedisSlave2[(Redis Slave 2)]
    end

    subgraph DB["数据库层"]
        PGPrimary[(PostgreSQL 主库)]
        PGStandby1[(PostgreSQL 从库 1)]
        PGStandby2[(PostgreSQL 从库 2)]
    end

    subgraph Storage["存储层"]
        MinIO1[(MinIO 节点 1)]
        MinIO2[(MinIO 节点 2)]
        MinIO3[(MinIO 节点 3)]
    end

    subgraph Monitor["监控层"]
        Prometheus[Prometheus]
        Grafana[Grafana]
        ELK[ELK Stack]
    end

    User[用户] --> LB1
    User --> LB2
    LB1 --> Web
    LB2 --> Web
    Web --> App
    App --> Cache
    App --> DB
    App --> Storage
    App --> Monitor
    Cache --> Monitor
    DB --> Monitor
```

---

## 高可用架构

### 高可用设计

```mermaid
graph TB
    subgraph 可用区1["可用区 A"]
        direction TB
        subgraph 节点1["节点组 1"]
            App1[应用实例 1]
            App2[应用实例 2]
        end
        DB1[(数据库主库)]
        Cache1[(Redis 主)]
    end

    subgraph 可用区2["可用区 B"]
        direction TB
        subgraph 节点2["节点组 2"]
            App3[应用实例 3]
            App4[应用实例 4]
        end
        DB2[(数据库从库)]
        Cache2[(Redis 从)]
    end

    subgraph 可用区3["可用区 C"]
        direction TB
        subgraph 节点3["节点组 3"]
            App5[应用实例 5]
            App6[应用实例 6]
        end
        DB3[(数据库仲裁节点)]
        Cache3[(Redis 仲裁)]
    end

    LB[负载均衡] --> 节点1
    LB --> 节点2
    LB --> 节点3

    DB1 <-->|主从复制| DB2
    DB1 <-->|仲裁| DB3
    Cache1 <-->|主从复制| Cache2
    Cache1 <-->|仲裁| Cache3

    User[用户] --> LB
```

### 故障转移流程

```mermaid
stateDiagram-v2
    [*] --> 正常运行

    正常运行 --> 节点故障: 健康检查失败
    节点故障 --> 流量切换: 负载均衡摘除故障节点
    流量切换 --> 服务降级: 触发降级策略
    服务降级 --> 告警通知: 发送告警通知
    告警通知 --> 自动恢复: 尝试自动恢复
    自动恢复 --> 正常运行: 恢复成功
    自动恢复 --> 人工介入: 恢复失败
    人工介入 --> 正常运行: 人工修复
```

---

## 监控架构

### 可观测性架构

```mermaid
graph TB
    subgraph 采集["数据采集层"]
        direction LR
        Metrics[指标采集<br/>Prometheus Exporter]
        Logs[日志采集<br/>Filebeat / Fluentd]
        Traces[链路追踪<br/>OpenTelemetry]
    end

    subgraph 存储["数据存储层"]
        direction LR
        Prometheus[(Prometheus<br/>时序数据库)]
        Elasticsearch[(Elasticsearch<br/>全文检索)]
        Jaeger[(Jaeger<br/>链路存储)]
    end

    subgraph 可视化["可视化层"]
        direction LR
        Grafana[Grafana<br/>仪表盘]
        Kibana[Kibana<br/>日志分析]
        JaegerUI[Jaeger UI<br/>链路追踪]
    end

    subgraph 告警["告警层"]
        direction LR
        AlertManager[AlertManager<br/>告警管理]
        Notify[通知渠道<br/>邮件 / 飞书 / 短信]
    end

    subgraph 服务["被监控服务"]
        App[应用服务]
        DB[数据库]
        Cache[缓存]
        Infra[基础设施]
    end

    服务 --> Metrics
    服务 --> Logs
    服务 --> Traces

    Metrics --> Prometheus
    Logs --> Elasticsearch
    Traces --> Jaeger

    Prometheus --> Grafana
    Elasticsearch --> Kibana
    Jaeger --> JaegerUI

    Prometheus --> AlertManager
    AlertManager --> Notify
```

### 监控指标体系

```mermaid
graph LR
    subgraph 基础设施["基础设施指标"]
        CPU[CPU 使用率]
        Memory[内存使用率]
        Disk[磁盘使用率 / IO]
        Network[网络流量 / 延迟]
    end

    subgraph 应用["应用指标"]
        QPS[请求量 QPS]
        Latency[响应延迟 P50/P95/P99]
        ErrorRate[错误率]
        Concurrent[并发连接数]
    end

    subgraph 业务["业务指标"]
        UserActive[活跃用户数]
        Conversion[转化率]
        Revenue[收入]
        AIUsage[AI 调用量 / 成本]
    end

    subgraph 数据库["数据库指标"]
        Connections[连接数]
        SlowQuery[慢查询数]
        CacheHit[缓存命中率]
        Replication[主从延迟]
    end
```

---

## 总结

本文档展示了 TOPEMS 项目的完整架构，包括：

1. **整体架构** - 客户端、网关、核心服务、业务服务、数据层、基础设施
2. **分层架构** - 五层架构模型（表示层、网关层、业务服务层、服务支撑层、数据存储层）
3. **微服务架构** - 28+ 个服务的分类和端口分配
4. **服务关系图** - 服务间的依赖和调用关系
5. **数据流图** - 用户请求的完整数据流
6. **认证授权流程** - JWT 认证和 Token 刷新流程
7. **AI 服务架构** - RAG 检索增强生成和 AI 对话流程
8. **部署架构** - 单机部署和生产环境高可用部署
9. **高可用架构** - 多可用区部署和故障转移流程
10. **监控架构** - 可观测性架构和监控指标体系

这些图表帮助开发者和用户快速理解 TOPEMS 的系统结构和工作原理。

---

*本文档最后更新：2026-08-28*
*架构图使用 Mermaid 语法，可在支持 Mermaid 的 Markdown 渲染器中查看。*
