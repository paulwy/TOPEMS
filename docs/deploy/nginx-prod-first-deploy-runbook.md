# TopEMS nginx 生产首部署复核 Runbook（A1）

> 状态：**流程固化 ✅（2026-10-07）｜生产加载验证 ⏳ 待生产/容器 Linux 环境**
> 依据：TODO A1（P0）；F-34/R-7 发现项（nginx map 路由表为生产流量入口事实源）；
> R4 演练（`/tmp/topems-nginx-drill.conf` 逐字复制生产 map 路由表）已完成，本 Runbook 为演练成果固化。

## 1. 背景与目标

- 生产流量入口 = `deploy/nginx/topems.conf`（map `$request_uri $api_upstream` 驱动统一反代，
  消除 30+ 重复 location 块）。macOS 本机无法加载 `use epoll` 配置，**语法/加载验证只能在
  生产/容器 Linux 环境执行**——本 Runbook 把所有可提前固化的复核动作与回滚预案沉淀下来，
  到环境后按步骤执行即可完成 A1 验收。
- 首部署失败典型形态：map 路由表与上游 upstream 名错位（如服务改名未同步）→ 404/502 黑洞；
  证书路径错误 → 443 起不来；`try_files` 与 `location /` 顺序错误 → SPA 刷新 404。

## 2. 前置检查（部署前）

| 检查项 | 命令/标准 |
|---|---|
| nginx 版本 | `nginx -v` ≥ 1.20（支持 map + http2） |
| conf 完整性 | `ls /etc/nginx/conf.d/topems.conf /etc/nginx/certs/{fullchain,privkey,chain}.pem` 全存在 |
| 上游可达 | `curl -sf http://topems-unified-core:8000/health && echo OK`（各 upstream 主机名可解析） |
| 备份现状 | `cp topems.conf topems.conf.bak-$(date +%F)` + `sha256sum topems.conf > conf.sha256` |
| 端口占用 | `ss -ltn | grep -E ':(80|443)'` 无异常占用 |

## 3. 复核步骤

### 3.1 conf 语法校验

```bash
nginx -t -c /etc/nginx/nginx.conf
# 期望：syntax is ok / test is successful（0 退出码）
```

### 3.2 map 路由表逐字比对

生产 map 表必须与 `deploy/nginx/topems.conf`（仓库事实源）逐字一致。比对方式：

```bash
# 提取生产 conf 的 map 段（从 'map $request_uri' 到匹配的 '}'）
awk '/^[[:space:]]*map \$request_uri \$api_upstream/,/^[[:space:]]*\}[[:space:]]*$/' \
  /etc/nginx/conf.d/topems.conf > /tmp/map.prod
# 与仓库基准比对（基准见下方附录，或直接从仓库 copy）：
diff /tmp/map.prod <(sed -n '/map \$request_uri \$api_upstream/,/^[[:space:]]*}$/p' \
  /Users/xingzhai/TOPEMS/deploy/nginx/topems.conf) && echo MAP_OK
# 期望：无差异输出（MAP_OK）
```

> 注意：仓库路径按部署机实际检出路径替换；**map 表变更必须先进仓库再进生产**（防漂移）。

### 3.3 加载与重载

```bash
nginx -s reload            # 或 systemctl reload nginx
sleep 2
nginx -s reload && echo RELOAD_OK
```

### 3.4 6 冒烟端点（map 命中 + 反代链路）

`scripts/verify-nginx-prod.sh`（本仓库已固化）执行：

```bash
bash scripts/verify-nginx-prod.sh \
  --base http://<nginx-host> \
  --services erp bi hrm portal core wms
# 期望：6 域全部 HTTP 200（每域以该服务真实可达端点为准，见脚本 --probe 参数）
```

> 冒烟目的：每个 map 代表域确实命中正确 upstream 且后端可服务；
> 404 且后端直连 200 → map/upstream 错位；502 → upstream 不可达；504 → 网关超时。

## 4. 回滚预案

| 触发条件 | 动作 |
|---|---|
| `nginx -t` 失败 | 不 reload；修复语法；回退步骤 0 备份 |
| reload 后 6 冒烟 ≤4 个 200 | 立即回滚：`cp topems.conf.bak-<date> topems.conf && nginx -s reload` |
| 443 起不来（证书问题） | 检查 certs 路径/权限；回滚到 certs 修复前状态 |
| map 比对有差异但已部署 | 以仓库事实源为准修正并**重新走 3.1→3.4**，禁止直接上线差异版本 |

回滚后必须复跑 3.4 冒烟确认恢复；全部失败无法恢复时保留 502 页面（比错误路由安全）并升级处理。

## 5. A1 验收清单（到环境后勾选）

- [ ] `nginx -t` 加载 conf 成功（0 退出码）
- [ ] map 路由表逐字比对 MAP_OK（与仓库 `deploy/nginx/topems.conf`）
- [ ] 6 冒烟端点全 200
- [ ] 回滚预案演练（备份恢复 + reload 成功）

## 附录：map 路由表基准快照（2026-10-07 从 deploy/nginx/topems.conf 逐字复制）

```nginx
    map $request_uri $api_upstream {
        default "";
        # unified-core 虚拟服务（含 doc/monitor 已合并模块）
        ~^/api/(core|doc|monitor)/          unified_core_service;
        # bi 服务（含 analytics/report 别名）
        ~^/api/(bi|analytics|report)/       bi_service;
        # 独立业务服务
        ~^/api/erp/                         erp_service;
        ~^/api/finance/                     finance_service;
        ~^/api/ai/                          ai_service;
        ~^/api/hrm/                         hrm_service;
        ~^/api/pm/                          pm_service;
        ~^/api/crm/                         crm_service;
        ~^/api/mes/                         mes_service;
        # [V2026.08 已合并] aps 服务已合并至 mes（/api/aps 兼容层由 mes 提供），代理到 mes_service
        ~^/api/aps/                         mes_service;
        ~^/api/pdm/                         pdm_service;
        ~^/api/scm/                         scm_service;
        ~^/api/wms/                         wms_service;
        ~^/api/srm/                         srm_service;
        ~^/api/qms/                         qms_service;
        ~^/api/lims/                        lims_service;
        ~^/api/ehs/                         ehs_service;
        ~^/api/rd/                          rd_service;
        ~^/api/portal/                      portal_service;
        ~^/api/mobile/                      mobile_service;
        ~^/api/gis/                         gis_service;
        ~^/api/integration/                 integration_service;
        ~^/api/tms/                         tms_service;
        # 外迁独立服务（8082-8090）
        ~^/api/search/                      search_service;
        ~^/api/communication/               communication_service;
        ~^/api/ticket/                      ticket_service;
        ~^/api/feedback/                    ticket_service;  # [V2026.08 已合并] feedback→ticket 兼容路由
        # [V2026.08 已移除] lowcode 空壳占位服务
        ~^/api/master-data/                 master_data_service;
        # [P0-5] 插件注册服务（plugin-registry, 8096）
        ~^/api/plugin/                      plugin_registry_service;
    }
```
