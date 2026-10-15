# canary/（2026-10-15 从 base/ 移出）

canary-deployment.yaml 不是 K8s 资源清单（自定义 `canary:` 配置文档，无 apiVersion/kind），
不能加入 kustomization resources。保留此处作灰度路由参考；kustomize build 不受影响。
