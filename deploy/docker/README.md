# deploy/docker（DEPRECATED）

> **2026-10-08 起弃用**：容器策略定案——生产数据禁入容器，Docker 仅临时验证用途。
> 本目录为历史 docker-compose 部署形态全套资产（compose/Dockerfile/构建脚本），
> **不再用于生产部署**，保留仅供未来目标环境（明确 docker 时）参考。
> 详见 `docs/deploy/container-strategy.md`。

## 内容

- `docker-compose*.yml`：多形态 compose（**参考基准 = docker-compose.yml v5.0**；full/services/domains/observability 为历史套件，头注已标注漂移点）
- `Dockerfile.server` / `Dockerfile.service`：服务镜像构建
- `build-local.sh` / `build-service.sh`：本地/服务镜像构建脚本
- `alertmanager/` `consul/`：附属配置

## 弃用原因

1. Docker Desktop daemon 长期僵死（API 无响应），无法稳定承载部署
2. Colima 双后端（VZ/qemu）本机硬性不可行
3. 生产数据已迁移至 Homebrew PostgreSQL（5432），脱离容器 runtime
4. 本机生产走 macOS launchd（`scripts/deploy-prod.sh` + `com.topems.server`）；`scripts/deploy/install.sh` / `update.sh` / `rollback.sh` 是 Linux/systemd 模板，非本机现用

## 若重新启用容器形态（必读）

服务进程默认只监听回环 `127.0.0.1`（`BIND_ADDR` 默认值，见 `deploy/README.md`「监听地址口径」）。
容器内必须显式设 `BIND_ADDR=0.0.0.0`，否则宿主端口映射、容器间互访、探针都会连不上：

- `docker-compose.yml` 已在 `x-common-env` 与各服务（unified-core / erp…plugin-registry）显式写入 `BIND_ADDR=0.0.0.0`；新增服务照此补齐。
- 自行 `docker run` 本仓库镜像时，加 `-e BIND_ADDR=0.0.0.0`。
- `Dockerfile.server` / `Dockerfile.service` 的 HEALTHCHECK 走容器内 `127.0.0.1`，与上述监听并存不冲突。
