# TOPEMS 端口分配规则 (Port Allocation Rules)

> 版本: v1.1  
> 最后更新: 2026-06-23  
> 权威源: `config/services.yaml` + 各服务 `main.rs`

## 1. 总体策略

| 维度 | 规则 |
|------|------|
| **业务服务范围** | 8000-8079（共 80 个端口） |
| **基础设施端口** | 3000（Web）、5432（PG）、6379（Redis）、8080（网关）、11434（Ollama） |
| **分配原则** | 按业务域分组 + 段内顺序递增 |
| **核心服务** | unified-core 占 8000，承载 8 个内部模块 |
| **冲突规避** | 不允许两个独立服务占用同一端口 |

## 2. 业务域段位（8 段 × 10 端口 = 80 端口）

| 段位 | 业务域 | 简称 | 当前占用 | 可扩展数 |
|------|--------|------|----------|----------|
| 8000-8009 | 核心服务 | Core | 1 (8000) | 9 |
| 8010-8019 | 经营管理 | ERP | 1 (8010) | 9 |
| 8020-8029 | 协同办公 | Collab | 3 (8020, **8023**, 8029) | 7 |
| 8030-8039 | 生产制造 | Mfg | 2 (8030, 8031) | 8 |
| 8040-8049 | 供应链 | SCM | 3 (8040, 8041, 8042) | 7 |
| 8050-8059 | 质量/研发 | Q/RD | 4 (8050-8053) | 6 |
| 8060-8069 | 数据分析/门户 | Analytics | 3 (8060, 8061, 8063) | 7 |
| 8070-8079 | 基础设施 | Infra | 3 (8070-8072) | 7 |
| **小计** | - | - | **20 个服务** | **60 个空位** |

> **注意**: 协同办公域中 **8021 端口被占用**（系统保留），pm 服务跳至 **8023**。

## 3. 当前完整端口映射

| 端口 | 服务 | 业务域 | 环境变量 | 备注 |
|------|------|--------|----------|------|
| 3000 | Web Frontend | Frontend | WEB_PORT | Vite dev server |
| 5432 | PostgreSQL | Database | POSTGRES_PORT | 标准 PG 端口 |
| 6379 | Redis | Cache | REDIS_PORT | 标准 Redis 端口 |
| 8000 | unified-core | Core | CORE_PORT | 含 8 个内部模块 |
| 8010 | erp | ERP | SERVER_PORT | 企业资源计划 |
| 8020 | hrm | Collab | HRM_PORT | 人力资源 |
| 8023 | pm | Collab | PM_PORT | 项目管理（**跳过 8021**） |
| 8029 | crm | Collab | SERVER_PORT | 客户关系 |
| 8030 | mes | Mfg | MES_PORT | 生产执行 |
| 8031 | pdm | Mfg | PDM_PORT | 产品数据 |
| 8040 | scm | SCM | PORT | 供应链 |
| 8041 | wms | SCM | SERVER_PORT | 仓储管理 |
| 8042 | srm | SCM | SERVER_PORT | 供应商管理 |
| 8050 | qms | Q/RD | QMS_PORT | 质量管理 |
| 8051 | lims | Q/RD | LIMS_PORT | 实验室信息 |
| 8052 | ehs | Q/RD | EHS_PORT | 环境健康安全 |
| 8053 | rd | Q/RD | SERVER_PORT | 研发管理 |
| 8060 | bi | Analytics | BI_PORT | 商业智能（含报表服务） |
| 8063 | portal | Analytics | SERVER_PORT | 企业门户 |
| 8070 | mobile | Infra | SERVER_PORT | 移动端 |
| 8071 | gis | Infra | SERVER_PORT | 地理信息 |
| 8072 | integration | Infra | SERVER_PORT | 系统集成 |
| 8080 | API Gateway | Gateway | GATEWAY_PORT | 预留 |
| 11434 | Ollama | AI Runtime | OLLAMA_PORT | AI 模型服务 |

## 4. 核心分配原则

### 4.1 段位规则

```
8000-8009  ─┬─ 8000  unified-core          (核心)
            └─ 8001-8009  预留扩展
8010-8019  ─┬─ 8010  erp                   (经营管理)
            └─ 8011-8019  预留扩展
8020-8029  ─┬─ 8020  hrm
            ├─ 8021  (预留)
            ├─ 8022  pm
            ├─ 8023-8028  (预留)
            └─ 8029  crm
...
```

**规则要点**：
- 每个 10 端口段预留给一个业务域
- 段首（X0）分配给该域的核心服务
- 段内按业务逻辑顺序递增编号
- 同段内允许留空位用于未来扩展
- **跳过冲突端口**：若段内某端口被系统或其他软件占用，下一个服务跳过该端口（保留空位以示记录）

### 4.2 虚拟服务规则

`unified-core` 在 **8000** 端口统一承载以下内部模块（不独立占用端口）：

| 模块 | URL 前缀 | 业务含义 |
|------|----------|----------|
| iam | `/api/core/iam/*` | 身份认证 |
| doc | `/api/core/doc/*` | 文档管理 |
| flow | `/api/core/flow/*` | 工作流引擎 |
| file | `/api/core/file/*` | 文件存储 |
| mail | `/api/core/comm/mail/*` | 邮件 |
| im | `/api/core/comm/im/*` | 即时通讯 |
| notification | `/api/core/comm/notify/*` | 通知服务 |
| monitor | `/api/core/monitor/*` | 系统监控 |

**设计原因**：减少服务进程数、降低资源占用、统一鉴权、统一审计。

### 4.3 AI 服务的特殊处理

AI 智能服务（Q&A、文档分析、向量库）由 **`unified-core`** 内部提供：
- URL 路径: `/api/core/ai/*`
- 端口: 8000（不独立占用 8050）
- 推理后端: Ollama（端口 11434）

这样设计避免了与 qms（8050）的端口冲突。

## 5. 环境变量命名约定

| 模式 | 适用服务 | 示例 |
|------|----------|------|
| `XXX_PORT`（专属） | 配置了专属变量名 | `CORE_PORT`, `MES_PORT`, `WMS_PORT` |
| `SERVER_PORT`（通用） | 未配置专属变量 | `ERP`, `CRM`, `RD` |
| `PORT`（兜底） | 简单服务 | `SCM` |

**优先级**: `XXX_PORT` > `SERVER_PORT` > `PORT` > 硬编码默认值

## 6. 新增服务端口分配流程

新增服务时按以下步骤：

1. **确定业务域** — 根据服务功能选择对应段位（如新增资产管理服务属于 ERP 段 → 段位 8010-8019）
2. **分配端口** — 在该段内选择下一个可用端口（按顺序递增，跳过已占用位）
3. **更新配置文件**（共 6 处必须同步）：
   - [ ] `config/services.yaml`（**权威源**）
   - [ ] `config/ports.env`
   - [ ] `scripts/services.conf`
   - [ ] `scripts/topems.sh`（默认 fallback）
   - [ ] `docker-compose.services.yml`
   - [ ] `apps/web/vite.config.ts`（proxy 规则）
4. **更新后端代码** — 在 `main.rs` 中更新默认端口
5. **更新文档** — 同步本文件与 README

## 7. 一致性校验命令

```bash
# 校验脚本语法
bash -n scripts/topems.sh

# 校验 docker compose 配置
docker compose -f docker-compose.services.yml config

# 校验服务状态（实际运行端口）
./scripts/topems.sh status

# TypeScript 编译检查
cd apps/web && npx tsc --noEmit
```

## 8. 端口冲突历史记录

| 日期 | 问题 | 修复 |
|------|------|------|
| 2026-06-23 | `ai` 服务（main.rs）与 `qms` 都使用 8050 | AI 改为由 unified-core 8000 承载 |
| 2026-06-23 | `topems.sh` 中 wms/srm 端口反了 | 修正为 8041/8042 |
| 2026-06-23 | `topems.sh` 中 hrm/pm/crm/rs 端口与 main.rs 不一致 | 全部统一为 services.yaml 权威值 |
| 2026-06-23 | `docker-compose.services.yml` 缺少 13 个服务 | 补全配置 |
| 2026-06-23 | **8021 端口被系统占用** | `pm` 服务从 8022 跳至 **8023**（保留 8021 空位） |
| 2026-06-23 | `useServiceStatus.ts` 多个端口硬编码错误 | 同步为权威端口 |
| 2026-06-23 | `ServiceStatusMonitor.tsx` 端口配置与权威源不一致 | 重写为权威端口 |
