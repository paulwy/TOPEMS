# 容器策略（2026-10-08 定案）

> 本文档定义 TOPEMS 在 Docker Desktop 长期僵死背景下的容器处置原则、现状清单与未来使用规范。

## 1. 背景与结论

- **Docker daemon 长期僵死**：API 无响应（磁盘 100% 卡死历史 → 恢复 58% 后仍无响应），CLI 无法操作容器
- **生产数据已脱离容器**（2026-10-08）：数据迁移至 Homebrew PostgreSQL 5432，**生产不再依赖任何容器**
- **容器替代品评估**：Colima 不可行（VZ entitlement 缺失 + qemu HVF `HV_NO_DEVICE` 双失败）
- **结论**：**容器在本机生产链路中已无必要**——仅保留临时验证用途（若 Docker 恢复）

## 2. 容器现状清单

| 对象 | 状态 | 处置 |
|---|---|---|
| `topems-postgres`（pgvector/pgvector:pg18） | **已弃**（数据已迁移；5433 由 Homebrew 实例承载，无容器进程） | 数据已备份 → 可删除 |
| `topems-prod-sim` + `topems-sim:systemd` | 模拟验证容器（install.sh 实跑产物） | daemon 恢复后 `docker rm -f` + `docker rmi` 清理 |
| `ubuntu:22.04` 镜像 | 模拟基镜像 | 清理模拟容器后一并删除 |
| Docker Desktop | daemon 僵死 | 若不再需要容器 → 停止/卸载；保留则需修复 daemon |

## 3. 处置命令（Docker daemon 恢复后执行）

```bash
docker rm -f topems-postgres topems-prod-sim 2>/dev/null
docker rmi topems-sim:systemd ubuntu:22.04 2>/dev/null
# 若彻底弃用 Docker
brew services stop docker  # 或 Docker Desktop 设置中关闭开机自启
```

> 当前 daemon 僵死无法执行；数据已双备份（见数据库迁移记录 §备份资产），删除无数据风险。

## 4. 未来容器使用规范（硬约束）

1. **生产数据禁入容器**：任何环境（含 CI/预发布）不得以容器作为生产数据权威存储；容器仅用于：
   - 部署脚本模拟验证（install/update/rollback 的 systemd 模拟容器）
   - 一次性环境（测试/演示），用完即删
2. **容器内不得运行迁移**：迁移一律直连 PostgreSQL 执行（psql/sqlx），避免容器生命周期影响账本
3. **端口映射统一 5432**：若确需容器 PG，宿主映射一律 `5432`（与生产端口一致，避免 5433 历史歧义）
4. **容器状态可审计**：每个容器必须有明确生命周期（创建目的/清理时机），禁止常驻无主容器
5. **Docker daemon 异常处理**：daemon 僵死/磁盘满时，优先用原生工具（psql/pg_dump 直连）完成数据操作，不依赖 Docker CLI

## 5. 相关文档

- `docs/database/database-primary-instance.md` §7（生产库独立化定案）
- `docs/database/postgres-native-migration-20261008.md`（迁移与纯净分离记录）
- `scripts/deploy/docker/topems-docker.sh`（历史 docker 部署脚本，仅参考）
