# TOPEMS Docker 资源与镜像版本运维手册（2026-10-03）

> ⚠️ **[DEPRECATED] 2026-10-08 起 Docker 已彻底卸载**（生产数据迁移 Homebrew PG，容器策略见 docs/deploy/container-strategy.md）。本文档为 docker 时代运维记录，仅供历史参考，不再适用。

>
> `bf52ed493`
>
> （Cargo.lock 锁定 + 镜像 tag 固定 + 资源限制 + networks 残留修复）
> 适用路径：容器化部署（
>
> `deploy/docker/docker-compose.yml`
>
> ）。注意 Docker 非 TOPEMS 默认部署方式（见 
>
> `.env.example`
>
>  注明，默认走本地进程部署 
>
> `scripts/start-local.sh`
>
> ）。
> 本文档回答两项 "后续可执行" 操作：
>
> **① 资源限制如何按压测微调；② 镜像版本如何随升级精确锁定**
>
> 。



***

## 一、资源限制调优

### 1.1 当前限制表（34 个服务，bf52ed493 已插入）



| 类别                                                                                                                                              | 服务                             | mem\_limit | cpus | 备注                                            |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | ---------- | ---- | --------------------------------------------- |
| 基础设施                                                                                                                                            | postgres                       | 1024m      | 1.0  | 数据节点，容量敏感                                     |
| 基础设施                                                                                                                                            | unified-core                   | 1024m      | 1.0  | **多模块（IAM/Flow/File/Doc/AI…），最可能超 1G，压测优先观察** |
| 基础设施                                                                                                                                            | redis / rabbitmq               | 512m       | 0.5  |                                               |
| 基础设施                                                                                                                                            | consul / pgbouncer             | 256m       | 0.5  |                                               |
| 监控网关                                                                                                                                            | jaeger / prometheus / grafana  | 512m       | 0.5  |                                               |
| 监控网关                                                                                                                                            | alertmanager / traefik / nginx | 256m       | 0.5  |                                               |
| 业务服务（25 个：erp/hrm/pm/crm/mes/pdm/scm/wms/srm/qms/lims/ehs/rd/bi/portal/finance/ai/mobile/gis/integration/plugin-registry/topems-web-monolith 等） | 默认                             | 512m       | 0.5  | Rust 服务稳态一般 <256m，512m 为安全上限                  |

**调整位置**：`deploy/docker/docker-compose.yml` 对应服务块顶部的 `mem_limit:` / `cpus:` 行。

### 1.2 压测观察命令



```
# 实时内存/CPU（Ctrl-C 退出）
docker stats

# 单次快照
docker stats --no-stream

# 某容器是否被 OOM kill（关键判据）
docker inspect <container> | grep OOMKilled

# 服务日志中的 OOM / 退出信号
docker compose -f deploy/docker/docker-compose.yml logs <svc> | grep -i "killed\|oom\|signal"
```

### 1.3 调整判据



| 观察结果                       | 动作                           |
| -------------------------- | ---------------------------- |
| 稳态内存 > 上限 **80%**          | 上调（+50% 起步，如 512m → 768m）    |
| `OOMKilled=true` 或日志出现 OOM | **立即**上调（+100%，如 1024m → 2g） |
| 稳态 < **30%** 且无峰值冲击        | 可下调（释放宿主机内存，如 512m → 256m）   |

> unified-core 是重点：模块数最多，压测并发时内存峰值最不可控，先看它。

### 1.4 调整步骤（单服务生效，不重启整栈）



```
# 1. 编辑 compose：改目标服务 mem_limit/cpus
# 2. 结构校验
docker compose -f deploy/docker/docker-compose.yml config --quiet
# 3. 只重建该服务
docker compose -f deploy/docker/docker-compose.yml up -d <svc>
# 4. 复测 docker stats 确认
```



***

## 二、镜像版本精确锁定

### 2.1 当前锁定值（bf52ed493：9 个浮动 tag → 稳定大版本线）



| 镜像                       | 当前 tag          | 说明              |
| ------------------------ | --------------- | --------------- |
| redis                    | 7.4-alpine      | 大版本线内 patch 仍会漂 |
| consul                   | 1.20            |                 |
| edoburu/pgbouncer        | 1.23            |                 |
| rabbitmq                 | 3.13-management |                 |
| nginx（web 运行时）           | 1.27-alpine     |                 |
| jaegertracing/all-in-one | 1.6             |                 |
| prom/prometheus          | v2              |                 |
| grafana/grafana          | 11              |                 |
| prom/alertmanager        | v0.27           |                 |
| traefik                  | v3.0            | 已固定，未动          |

### 2.2 精确锁定方法（升级时执行，需能访问 Docker Hub）



```
# 查精确 digest（拿当前大版本线实际指向的版本）
docker manifest inspect redis:7.4-alpine | grep -A3 '"architecture":"amd64"' | grep digest

# 方式 A：锁 digest（最精确，零漂移）
#   image: redis@sha256:<完整 digest>
# 方式 B：锁精确 patch tag（次精确，版本号可读）
#   image: redis:7.4.2-alpine
```

**本机实测**（2026-10-03）：`docker manifest inspect` 查询超时（Docker Hub 网络可达性受限），精确锁定需在**能正常访问 Docker Hub 的环境**执行。

### 2.3 升级 SOP（任一镜像）



1. `docker manifest inspect <img>:<候选tag>` 确认 tag 存在、digest 稳定

2. 更新 compose 中对应 `image:`（锁 digest 或精确 patch）

3. `docker compose config --quiet` 校验

4. 拉起该服务 smoke test（healthcheck 转绿）

5. 提交（信息标注版本变更 + 锁定方式，如 `chore(docker): redis 锁定 7.4.2-alpine`）



***

## 三、边界说明



* `docker-compose.services.yml` 的 `topems/*:latest` 为**占位镜像**（monolith 模式未构建，monolith.yml 注释明确），无需锁定，勿动。

* 资源限制为**硬编码合理值**；若后续压测发现需频繁调整，可考虑将关键服务（unified-core/postgres/redis/rabbitmq）的 mem\_limit 改为 `.env` 插值（`${UNIFIED_CORE_MEM:-1024m}`），本次未做以保持 compose 简洁。

* 结构修复连带项：networks 段残留已清（dead topems-monolith 删除、web-monolith 移入 services 段），`docker compose config` exit 0 为当前基线。