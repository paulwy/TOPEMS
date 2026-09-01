# API 网关 8080 落地方案（API Gateway Plan）

> **状态**：方案待部署验证 · **归档日期**：2026-08-31 · **关联**：`TODO.md` P2-2 · `config/services.yaml` special_ports.api_gateway
> **现状**：Traefik v3 已承担路由网关（`deploy/docker/traefik/dynamic.yml`，23 服务路由 + 统一中间件链）；8080 端口当前被 **Traefik Dashboard** 占用，与 `services.yaml` 预留的 API 网关 8080 冲突。

## 1. 路由映射表（前端 API 前缀 → 服务 → 目标）

来源：`deploy/docker/traefik/dynamic.yml` services 段 + `apps/web/src/config/runtime.ts` 前端路径。

| 前端路径前缀 | Traefik Router | 目标服务 | 目标端口 |
|---|---|---|---|
| `/api/core` | router-core | unified-core | 8000 |
| `/api/erp` | router-erp | erp | 8010 |
| `/api/finance` | router-finance | finance | 8011 |
| `/api/hrm` | router-hrm | hrm | 8020 |
| `/api/pm` | router-pm | pm | 8023 |
| `/api/crm` | router-crm | crm | 8029 |
| `/api/mes` | router-mes | mes | 8030 |
| `/api/pdm` | router-pdm | pdm | 8031 |
| `/api/scm` | router-scm | scm | 8040 |
| `/api/wms` | router-wms | wms | 8041 |
| `/api/srm` | router-srm | srm | 8042 |
| `/api/qms` | router-qms | qms | 8050 |
| `/api/lims` | router-lims | lims | 8051 |
| `/api/ehs` | router-ehs | ehs | 8052 |
| `/api/rd` | router-rd | rd | 8053 |
| `/api/bi` | router-bi / analytics / report | bi | 8060 |
| `/api/portal` | router-portal | portal | 8063 |
| `/api/ai` | router-ai | ai | 8064 |
| `/api/mobile` | router-mobile | mobile | 8070 |
| `/api/gis` | router-gis | gis | 8071 |
| `/api/integration` | router-integration | integration | 8072 |
| `/api/search` | （extension，动态配置补充） | search | 8082 |
| `/api/communication/*` | （extension） | communication | 8084 |
| `/api/ticket` | （extension） | ticket | 8086 |
| `/api/master-data` | （extension） | master-data | 8090 |
| `/api/monitor` | （extension） | monitor | 8095 |
| `/api/plugin` | （extension） | plugin-registry | 8096 |
| `/api/tms` / `/api/aps` | logistics | tms / mes(aps 兼容) | 8073 / 8030 |

> 注：`/api/tms`、`/api/aps`、extension 组路由在 `dynamic.yml` 中为注释/动态补充（由 `init-gateway.sh` 生成），落地时需与 `config/services.yaml` 逐条核对补齐。

## 2. 目标形态

将 **8080 作为统一 API 网关入口**（对外 API 接入，供移动端 App、第三方系统、BI 直连），与 Web 流量（80/443 经 nginx）分离：

```
外部 API 客户端 ──► :8080 (Traefik api entryPoint)
                      ├─ /api/**  ──► 中间件链 request-id → cors → rate-limit → jwt-auth → retry
                      │              └─► 按 PathPrefix 路由到各业务服务
                      └─ /health  ──► 健康检查（聚合）
Web 浏览器 ────────► :80/:443 (nginx → traefik web entryPoint)  ──► 同路由
```

## 3. 端口冲突处理（必须先行）

当前 `8080:8080` 被 Traefik Dashboard 占用。落地顺序：

1. **释放 8080**：Traefik Dashboard/API 迁移至 `:8089`（仅内网绑定，或 `traefikLogs` 网络），`docker-compose.yml` 端口映射 `8080:8080` → `8089:8080`。
2. **新增 `api` entryPoint**：`traefik.yml` entryPoints 增加 `api: address: ":8080"`。
3. **为 `api` 入口挂同一套路由**：在 `dynamic.yml` 每个 router 的 `entryPoints` 增加 `- api`（或新增一组 `*-api` router），保持同一中间件链。

## 4. 落地配置补丁（开箱即用）

### 4.1 traefik.yml（静态）新增 entryPoint

```yaml
entryPoints:
  web:        { address: ":80" }
  websecure:  { address: ":443" }
  api:        { address: ":8080" }   # API 网关入口（新增）
  traefik:    { address: ":8089" }   # Dashboard 迁移，内网访问
```

### 4.2 dynamic.yml 路由器统一挂 `api` 入口

以 core 为例（其余 router 同理，均增加 `- api`）：

```yaml
router-core:
  rule: "PathPrefix(`/api/core`)"
  entryPoints:
    - web
    - api          # 新增
  service: svc-core
  middlewares:
    - strip-prefix-core
    - default-chain
  priority: 100
```

### 4.3 docker-compose 端口调整

```yaml
traefik:
  ports:
    - "8080:8080"   # 改为 API 网关入口（web 入口已在 80/443）
    - "8089:8080"   # Dashboard（内网）
```

## 5. 灰度切换与验证

1. 先在 staging 部署 `api` entryPoint，用 `curl :8080/api/core/health` 验证路由 + jwt-auth。
2. 移动端/第三方先切到 `:8080`，Web 保持 `:80/:443`，观察 1 个发布周期。
3. 验证项：JWT 鉴权生效（无 token 401）、限流中间件生效（超阈值 429）、request-id 透传。
4. 全部通过后，更新 `config/services.yaml` `api_gateway.status: reserved → implemented`，并补 `/api/search`、extension 组、logistics 路由至 `dynamic.yml`。

## 6. 本次待办完成定义（P2-2）

- [x] 路由映射表（第 1 节，28 条）
- [x] 端口冲突处理方案（第 3 节：Dashboard 8080 → 8089）
- [x] 落地方案与配置补丁（第 4 节）
- [x] 灰度切换与验证步骤（第 5 节）
- [x] 待部署执行：staging 应用补丁并验证；同步补齐 search/extension/logistics 路由（09-01 本地容器验证通过：33 router api 挂载、dashboard 8089 200、jwt-auth forwardAuth 生效；补齐 search/communication/ticket/master-data/monitor/plugin/tms/aps 8 个 extension 路由至 dynamic.yml；traefik v3.0 兼容修复 4 处）
- [x] 待更新：`services.yaml` api_gateway status → implemented（09-01 已更新）
