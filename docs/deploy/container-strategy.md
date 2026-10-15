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

> **2026-10-08 已执行彻底卸载**（用户定案）：Docker Desktop + 全套 brew 容器工具已清——
> app/Caskroom/colima/lima/qemu/docker CLI/compose 全部移除，用户数据目录（~/.docker、Group Containers）已删。
> 残留（无害）：`~/Library/Containers/com.docker.docker`（4KB macOS 保护元数据）、
> `/Library/PrivilegedHelperTools/com.docker.vmnetd`（root 特权 helper，本机 sudo 不可用未清，空转无影响）。

> 当前 daemon 僵死无法执行；数据已双备份（见数据库迁移记录 §备份资产），删除无数据风险。

## 4. 未来容器使用规范（硬约束）

1. **生产数据禁入容器**：任何环境（含 CI/预发布）不得以容器作为生产数据权威存储；容器仅用于：
   - 部署脚本模拟验证（install/update/rollback 的 systemd 模拟容器）
   - 一次性环境（测试/演示），用完即删
2. **容器内不得运行迁移**：迁移一律直连 PostgreSQL 执行（psql/sqlx），避免容器生命周期影响账本
3. **端口映射统一 5432**：若确需容器 PG，宿主映射一律 `5432`（与生产端口一致，避免 5433 历史歧义）
4. **容器状态可审计**：每个容器必须有明确生命周期（创建目的/清理时机），禁止常驻无主容器
5. **Docker daemon 异常处理**：daemon 僵死/磁盘满时，优先用原生工具（psql/pg_dump 直连）完成数据操作，不依赖 Docker CLI

## 5. Docker 相关代码状态（审核结论）

| 文件/目录 | 状态 | 处置 |
|---|---|---|
| ~~`scripts/deploy/deploy.sh`~~ | **已删除**（2026-10-15，docker run 离线范式弃用后移除） | 生产部署见 `production-deploy.sh` |
| `scripts/deploy/docker/topems-docker.sh` | **现用入口**（docker 部署；2026-10-15 复核已修复复活，与 topems.sh help:3734 口径一致） | docker 部署统一入口 |
| `deploy/docker/`（8 compose + Dockerfile + 构建脚本） | 随 topems-docker.sh 恢复使用 | docker 部署目录资产 |
| `svc/unified-core/Dockerfile` | 应用容器化资产 | 保留（无运行时依赖） |
| 11 个脚本中的 docker 引用 | 检测/分支为主，无生产依赖 | 保留（不影响 systemd 部署路径） |

> 结论：生产默认走 systemd（`topems.sh deploy`）；docker 部署路径以 `scripts/deploy/docker/topems-docker.sh` 为现用入口，`deploy/docker/` 资产随之一并恢复使用。

## 6. 版本一致性（2026-10-08 核对）

| 组件 | 生产（5432） | 验证（5433） | 一致性 |
|---|---|---|---|
| PostgreSQL | 18.4 (Homebrew) | 18.4 (Homebrew) | ✅ 一致 |
| uuid-ossp | 1.1 | 1.1 | ✅ 一致 |
| **pgvector** | **0.8.7** | **0.8.2** | ⚠️ 差异 |
| _sqlx_migrations | 20261008000000 | 20261008000000 | ✅ 一致（topems_dev 同步） |

**pgvector 差异说明**：原生（brew）0.8.7 高于原数据源 0.8.2——0.8.x 数据文件格式向后兼容（存储格式 v1 稳定），且生产 vector 表数据量为 0（`ai.document_chunks` / `ai.vectors` 空）——**无数据风险**。后续若验证库需要对齐，`ALTER EXTENSION vector UPDATE TO '0.8.7'` 即可。

## 7. 相关文档

- `docs/database/database-primary-instance.md` §7（生产库独立化定案）
- `docs/database/postgres-native-migration-20261008.md`（迁移与纯净分离记录）
- `scripts/deploy/docker/topems-docker.sh`（docker 部署现用入口，见 `topems.sh help` deploy 段）
