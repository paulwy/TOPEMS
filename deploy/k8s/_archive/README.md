# _archive（k8s 清单归档，2026-10-15）

以下 manifest 未被 kustomization.yaml 收录、与主模型（每服务一个 Deployment，见 kustomization resources）重复或不匹配，归档于此备查：

- analytics.yaml：与 services/bi.yaml 重复（analytics = bi 别名，二进制 topems-analytics 由 build-service.sh bi/analytics 构建）。
- gis-deployment.yaml：与 services/gis.yaml 冲突的双轨 Deployment（镜像无 org 前缀、无 configMapRef）。
- monolith.yaml：模块化单体（topems/monolith:8099）路线采用 docker/systemd 模型，k8s 未收养。

如需重新启用，先与 kustomization.yaml 的 21 服务清单合并去重，并核对镜像 tag。

> **监听地址**：服务进程默认只监听回环 `127.0.0.1`（`BIND_ADDR` 默认值，见 `deploy/README.md`）。
> `_archive/` 下 manifest 未纳入 kustomization，**当前不部署**；若重新启用，必须在容器 env 显式加
> `BIND_ADDR: "0.0.0.0"`（或复用 `topems-config` ConfigMap，其已设该值），否则 Pod 探针与 Service 都会连不上。
> 主清单 `deploy/k8s/services/*.yaml` 统一 `envFrom` 该 ConfigMap，已覆盖。
