# OpenAPI 聚合产物与 TODO.md 入库口径方案

- 日期：2026-11-19
- 性质：**决策方案（只出方案，未执行）**。本轮不改门禁、不删文件、未提交 `docs/api/openapi-aggregated.json` 与 `TODO.md` 的工作区改动。
- 读者：项目负责人（拍板）、后续执行者。
- 相关文件：[generate.sh](../../scripts/openapi/generate.sh)、[aggregate.py](../../scripts/openapi/aggregate.py)、[check-openapi-aggregated.cjs](../../scripts/ci/check-openapi-aggregated.cjs)、[gen-types.mjs](../../scripts/openapi/gen-types.mjs)、[openapi_gen.rs](../../svc/server/src/bin/openapi_gen.rs)、[lefthook.yml](../../lefthook.yml)

## 0. 结论摘要

| 对象 | 建议 | 一句话理由 |
| --- | --- | --- |
| `docs/api/openapi-aggregated.json` | **方案 B（停止入库，改为可复现的发布产物）**；但先满足两个前置：CI 能真正执行（当前 GitHub Actions 全红，作业根本没启动）、`gen-types` 增加权威 `openapi.json` 回退。若短期不能动 CI，则退回 A 的**受限形态**：只在夜间生成核验，绝不进 PR 门禁 | 3.49 MB / 15.6 万行的 LFS 产物没有任何运行时消费者，每批提交都是不可评审的指针 diff，且生成要 ~2 小时；留在仓库只能制造冲突与漂移 |
| `TODO.md` | **继续入库，保留在仓库根目录**，配三条纪律（当批提交者维护、与代码同批更新、季度归档） | 它已是唯一活跃清单（`docs/project/TODO.md` 是归档副本）；`facts.mjs` 硬编码 `TODO.md` 路径；迁入 `docs/quality/` 只会重演「迁移即失活」的历史 |

拍板点见 §5，建议执行顺序见 §6。

## 1. 事实

### 1.1 两份契约的现状对比

| 项 | 权威契约 `docs/api/openapi.json` | 聚合产物 `docs/api/openapi-aggregated.json` |
| --- | --- | --- |
| 生成器 | `cargo run -p topems-server --bin openapi-gen`（单进程合并 30 个 crate 的 `ApiDoc`） | `./scripts/openapi/generate.sh --extract`（29 个服务逐个 `cargo test` 提取 + `aggregate.py` 聚合） |
| 文件形态 | 单行压缩 JSON，1,553,644 B | `indent=2` JSON（`aggregate.py` 固定），HEAD 版本 3,493,453 B / 155,601 行 |
| 规模（HEAD） | 2,463 paths / 821 schemas | 2,440 paths / 1,018 schemas |
| 入库方式 | 普通文本文件 | **Git LFS**（[.gitattributes](../../.gitattributes) 只有这一条 LFS 规则：`filter=lfs diff=lfs merge=lfs -text`） |
| 是否有运行时依赖 | **有**：`svc/server` 以 `include_str!` 编译进二进制并在运行时提供 `/api/openapi.json` | **无**：`svc/`、`apps/`、`deploy/`、Dockerfile 均无引用 |
| 更新方式 | `openapi-gen` 覆盖写入，通常与 handler 改动同批提交 | 手动/半自动，最近 3 次都与功能修复混在同一提交 |
| 最近一次入库 | `6f747aa16`（本轮补 requestBody） | `a629c42f0`（2026-11-19 04:26，`feat(iam)`，随功能提交一起带上） |
| 历史版本数 | — | 23 次提交；`.git/lfs` 本地占用 25 MB |

补充事实：

- 工作区当前有一份**未提交**的聚合产物：1,605,329 B、单行压缩、2,444 paths / 3,007 operations / 1,018 schemas。它的形态与 `aggregate.py`（`indent=2`）不符，说明不是当前脚本直接产物（来源待查）。本轮按约定不提交、不清理。
- 两份契约已经漂移：聚合 2,440 paths（HEAD）vs 权威 2,463 paths；schema 数量 1,018 vs 821（聚合混入了历史/重复 schema）。同一系统两套「真相」，本身已是维护负担。

### 1.2 生成链与实测耗时

命令（唯一入口）：

```bash
./scripts/openapi/generate.sh --extract --output-dir <dir>
```

内部步骤：

1. `rm -f /tmp/topems-*-openapi.json`（脚本已做残留清理，避免聚合到过期 spec）；
2. 对 [generate.sh:114](../../scripts/openapi/generate.sh#L114) 列出的 **29 个服务**逐个执行 `cargo test -p topems-<svc> extract_openapi_spec`（部分服务会先试 `--bin` 再试 `--test openapi_extract`，同一 crate 可能编译两次）；
3. `python3 scripts/openapi/aggregate.py --input-dir /tmp --output <dir>/openapi-aggregated.json`（纯标准库，秒级）；
4. 可选 `--with-types` 调用 `gen-types.mjs` 生成 `packages/shared-types/src/generated/openapi.d.ts`。

另一模式（无 `--extract`）是从 `localhost` 各端口在线抓取，需要 29 个服务全部运行，不适合作为可复现命令。

**实测（本机，target 已有缓存）**：`14:16:28` 启动，`8m45s` 后完成 2/29（finance 123 paths/111 schemas、hrm 85 paths/45 schemas），第 3 个正在编译：

```
real 524.93  user 1670.30  sys 100.49
```

按 4–5 分钟/服务外推，**全量约 2–2.5 小时**；CI 冷缓存（还要先编译整个 workspace）更久。结论：**这条命令不可能进 PR 必跑门禁**，只能夜间/按需/发版前跑。

确定性说明：`aggregate.py` 对输入按 sorted 遍历并使用 `indent=2`，但单服务内的 spec 顺序、cargo 编译目标选择（bin / test）会带来字节级差异；因此新鲜度校验不能做字节比对，只能做**归一化语义比对**（见 §2.3）。

### 1.3 谁在读它

| 读取方 | 位置 | 用途 | 阻断性 |
| --- | --- | --- | --- |
| 聚合棘轮门禁 | [check-openapi-aggregated.cjs](../../scripts/ci/check-openapi-aggregated.cjs)，由 [lefthook.yml:88](../../lefthook.yml#L88) `openapi-gate` 调用 | 比较「实际挂载路由」与聚合产物的计数（missing/extra 只允许下降） | 阻断（但只在 staged 命中 `svc/**/*.rs`、`lib/**/*.rs`、`docs/api/openapi*`、`scripts/openapi/` 时触发） |
| 前端类型生成 | [gen-types.mjs](../../scripts/openapi/gen-types.mjs#L102-L145) | 无参数时**优先**读聚合 JSON；解析失败/为空才回退到 `docs/api/openapi.yaml`（2026-08 的手写文件，66 KB） | 手动执行（`pnpm gen:types`），不在构建/CI 链路 |
| 已生成的前端类型 | [openapi.d.ts](../../packages/shared-types/src/generated/openapi.d.ts) | 头注释记录：生成于 2026-11-09，输入为聚合 JSON，716 paths / 571 schemas | 静态文件，已明显落后 |
| 文档/说明 | [scripts/openapi/README.md](../../scripts/openapi/README.md) | 使用说明 | 无 |
| 运行时/部署 | — | 无任何引用 | — |

棘轮基线（[scripts/ci/openapi-aggregated-baseline.json](../../scripts/ci/openapi-aggregated-baseline.json)，2026-11-18）：

```json
{ "live_routes_count": 3964, "aggregated_routes_count": 3003,
  "missing_in_openapi": 3088, "extra_in_openapi": 2127 }
```

门禁支持 `--aggregated-path <file>`、`--update-baseline`、`--report-only`，这为方案 B 提供了现成接口。

### 1.4 入库的收益与代价

收益（可兑现的部分）：

- 离线可读、随 commit 版本化；棘轮门禁有稳定的比较对象；
- 无网络环境下可 `git clone` 即得一份全量契约。

代价（已在发生）：

1. **不可评审**：LFS 指针 diff 只显示 oid/size 变化，PR 里看不到任何契约内容，评审价值为零。
2. **冲突必现**：多人并行改 handler 时，产物只能「谁最后提交谁重生成」，不能合并。
3. **体积与拉取成本**：单版本 3.49 MB、23 个版本、LFS 目录 25 MB；每个克隆者都要装 git-lfs。
4. **CI 假绿/假红风险**：所有 workflow 的 `actions/checkout` **都没有 `lfs: true`**。在未拉取 LFS 的环境里，该文件就是 132 B 的指针文本，`JSON.parse` 会直接抛错。也就是说，若 CI 真的跑起来，`openapi-gate` 会因解析失败而红——这个隐患目前在本地（已 smudge）完全看不到。
5. **双源漂移**：聚合 2,440 paths vs 权威 2,463 paths；类型生成又以聚合为准（716 paths 的旧快照），与真实接口继续拉大。
6. **生成成本前置**：为提交一份产物，需要 2 小时编译。

### 1.5 CI 现状（决定方案 B 可行性的关键事实）

- 本地 `main` 仅领先 `origin/main` 3 个提交，最近一次 push 于今天 14:03（说明云端是活的）。
- 但今天 push 触发的全部 workflow（`CI`、`E2E`、`Docker Build`、`Deploy to Kubernetes`、`Secret Scan`、`Web E2E`）**全部 failure，且作业根本没有启动**：

  > The job was not started because recent account payments have failed or your spending limit needs to be increased.

- 结论：**当前 GitHub Actions 不执行任何作业**，本地 lefthook 是唯一有效门禁。任何「由 CI 生成/校验」的方案都必须把「恢复 Actions 计费」或「使用自托管 runner」列为前置条件。

### 1.6 TODO.md 现状

| 项 | 读数 |
| --- | --- |
| 位置 | 仓库根 `TODO.md`（HEAD 364 行，7 个 `## ` 段） |
| 历史副本 | `docs/project/TODO.md`（697 行，文件头自述为归档，不再维护） |
| 工作区未提交改动 | +26 行：新增 §1.F「前端真实性与交互纠错」F1–F11（11 条，只登记未开工）+ 2 行治理记录，引用未跟踪文档 `docs/quality/主模块功能缺陷与前后端补位评估-2026-11-19.md` |
| 机器读取 | [facts.mjs:171](../../scripts/report/facts.mjs#L171) 硬编码 `join(ROOT, 'TODO.md')`，产出 `docs.todo_lines` / `docs.todo_h2_sections` 写入 [facts-latest.json](../../docs/quality/facts-latest.json)；当前快照为 325 行 / 7 段，已落后于 HEAD 364 行 |
| facts 校验接线 | `pnpm facts:check` 存在（`node scripts/report/facts.mjs --check docs/quality/facts-latest.json`），但**未进 lefthook/CI**，仅由治理文档要求在每个批次结束时手动执行 |
| 大文件门禁 | [check-large-files.sh:14](../../scripts/ci/check-large-files.sh#L14) 显式把 `TODO.md` 列入跳过清单 |
| 内容漂移示例 | TODO.md 第 5 行仍写「本地 main 领先 origin/main 187 个提交」，实际已是 3 个 |

## 2. 方案 A：继续入库（可复现 + 固定命令 + CI 校验新鲜度）

### 2.1 目标与不变量

- 仓库内始终有一份与代码一致的聚合契约；
- 生成命令唯一、可脚本化、可在无人值守环境重复执行；
- 新鲜度校验不依赖人工记忆，且**不阻塞日常 PR**。

### 2.2 改动点

| # | 文件 | 动作 | 原因 |
| --- | --- | --- | --- |
| A1 | `.github/workflows/ci.yml` | 给读取该产物的 job 的 `actions/checkout` 加 `lfs: true` | 否则 CI 读到 132 B 指针，`JSON.parse` 必失败 |
| A2 | `scripts/ci/check-openapi-aggregated-freshness.cjs`（新增） | 重新生成到临时目录 → 归一化比对 → 不一致 exit 1 | 把「新鲜度」变成可执行判定 |
| A3 | `.github/workflows/ci.yml`（新增 job `openapi-aggregated-freshness`） | `schedule`（每日一次）+ `workflow_dispatch`；**不挂 PR**；`timeout-minutes: 240`；缓存 `~/.cargo`/`target` | 生成 2 小时，只能夜间跑 |
| A4 | `scripts/openapi/generate.sh` | 增加 `--clean`（或确认现有 `/tmp` 清理足够）与 `--output-dir` 已支持 | 固定命令、避免跨轮次污染 |
| A5 | `scripts/ci/openapi-aggregated-baseline.json` | 每次成功再生后 `--update-baseline` 收紧 | 保持棘轮只降不升 |
| A6 | `scripts/openapi/README.md` | 补「提交产物前必须执行 A2 同款命令」 | 约束文档化 |

### 2.3 固定命令与确定性

```bash
# 唯一合法生成命令（仓库根执行）
./scripts/openapi/generate.sh --extract --output-dir /tmp/openapi-fresh

# 新鲜度判定（归一化：递归排序 key 后比较 paths/methods/schemas 集合 + 规范化 sha256）
node scripts/ci/check-openapi-aggregated-freshness.cjs \
  --expected docs/api/openapi-aggregated.json \
  --actual /tmp/openapi-fresh/openapi-aggregated.json
```

- 不做字节比对：`indent`、key 顺序、bin/test 目标差异都会造成假失败。
- 比对口径建议：`(method, path)` 集合 + `components.schemas` 名称集合 + 规范化 JSON 的 sha256；任一不一致即失败并输出差异清单。
- 失败输出必须给出可直接执行的再生成命令。

### 2.4 CI 配置草案

```yaml
openapi-aggregated-freshness:
  if: github.event_name == 'schedule' || github.event_name == 'workflow_dispatch'
  runs-on: ubuntu-latest
  timeout-minutes: 240
  steps:
    - uses: actions/checkout@v5
      with: { lfs: true }
    - uses: actions/cache@v4
      with:
        path: |
          ~/.cargo/registry
          ~/.cargo/git
          target
        key: openapi-${{ hashFiles('Cargo.lock') }}
    - run: ./scripts/openapi/generate.sh --extract --output-dir /tmp/openapi-fresh
    - run: node scripts/ci/check-openapi-aggregated-freshness.cjs --expected docs/api/openapi-aggregated.json --actual /tmp/openapi-fresh/openapi-aggregated.json
```

### 2.5 迁移步骤

1. 恢复 Actions 计费（或改用自托管 runner）；
2. 按 A1 修 checkout，先用 `workflow_dispatch` 跑一次空转，确认能读到真实 JSON（不是指针）；
3. 落地 A2/A4，本地对「当前 HEAD 产物」跑一次，记录基线差异；
4. 提交一份与代码一致的产物，并 `--update-baseline` 收紧；
5. 打开 A3 的每日 schedule，观察一周失败率（若因编译超时/缓存未命中反复失败，转方案 B）；
6. 更新 README（A6）与 TODO。

### 2.6 对现有棘轮门禁的影响

- `check-openapi-aggregated.cjs` **无需改动**：它继续读仓库文件；新鲜度是另加的一层。
- 风险：若 CI 未拉 LFS，棘轮会以「解析失败」而不是「计数超限」失败，错误信息具有误导性——必须同步修 A1。
- 建议：棘轮基线保留为「趋势闸门」，新鲜度 job 失败不自动改基线，必须人工确认后 `--update-baseline`。

### 2.7 成本与风险

- 每次 2–2.5 小时 CPU（CI 冷缓存更久）；每日跑一次即每日消耗一次全量编译；
- LFS 历史继续增长（每版 3.5 MB）；
- 方案并未消除「不可评审/必冲突」，只是把漂移检测自动化。

## 3. 方案 B：停止入库，由 CI 生成并作为发布产物（推荐）

### 3.1 目标

- 仓库只保留**生成器 + 棘轮基线**，不再保存产物；
- 产物与代码的一致性由「生成自哪个 commit」+ 校验和保证；
- 需要时按需获取，不污染 PR、不产生合并冲突。

### 3.2 改动点

| # | 文件 | 动作 | 原因 |
| --- | --- | --- | --- |
| B1 | `docs/api/openapi-aggregated.json` | `git rm --cached`（本地文件可保留）；提交「删除该产物」 | 停止入库 |
| B2 | `.gitignore` | 增加 `/docs/api/openapi-aggregated.json`、`/docs/api/openapi-aggregated.yaml` | 防止再次误提交 |
| B3 | `.gitattributes` | 删除 `docs/api/openapi-aggregated.json filter=lfs ...` 一行 | 新文件不再走 LFS；历史 blob 保留（不重写历史） |
| B4 | `scripts/openapi/gen-types.mjs` | 自动选择顺序改为：聚合 JSON（若存在）→ **权威 `docs/api/openapi.json`** → 手写 YAML | 否则无聚合时回退到 2026-08 的手写 YAML，类型会继续过期 |
| B5 | `scripts/ci/check-openapi-aggregated.cjs` | 增加 `--allow-missing`：产物不存在时本地跳过并打印获取命令；CI 中必须显式生成后再跑 | 本地开发不被缺失产物阻塞，CI 仍阻断 |
| B6 | `scripts/ci/check-large-files.sh` | 从跳过清单移除 `docs/api/openapi-aggregated.*` | 已不在仓库，无需豁免 |
| B7 | `scripts/openapi/README.md` | 改为「产物不入库，获取方式见下」 | 口径同步 |
| B8 | 新增 `scripts/openapi/fetch-aggregated.sh` | 从 Actions artifact / Release 下载并校验 sha256 | 固定获取路径 |

### 3.3 产物存放与获取

| 渠道 | 位置 | 保留期 | 适用 |
| --- | --- | --- | --- |
| GitHub Actions artifact | 名为 `openapi-aggregated-<sha>` | 90 天（可配置） | 每次 `main` push / nightly |
| GitHub Release asset | tag（如 `v2026.11.x`）附件 | 永久 | 发版、对外交付 |
| 可选：ghcr OCI artifact | `ghcr.io/<org>/topems-openapi:<sha>` | 跟随镜像策略 | 与镜像同源分发（仓库目前无 S3/对象存储配置，不建议新增依赖） |

获取命令：

```bash
gh run download -n openapi-aggregated-<sha> -D /tmp/openapi
gh release download <tag> -p 'openapi-aggregated*.json*'
bash scripts/openapi/fetch-aggregated.sh --commit <sha> --out /tmp/openapi
```

### 3.4 一致性校验

生成 job 同时产出 `openapi-aggregated.manifest.json`：

```json
{
  "commit": "<sha>",
  "generated_at": "<UTC>",
  "generator": "scripts/openapi/generate.sh --extract",
  "services": 29,
  "paths": 2444,
  "operations": 3007,
  "schemas": 1018,
  "sha256": "<产物的 sha256>"
}
```

- 获取方校验：`sha256sum -c`（或脚本内比对），并断言 `manifest.commit == 目标 commit`；
- 生成 job 内紧接着跑 `node scripts/ci/check-openapi-aggregated.cjs --aggregated-path <新产物>`，保证本次生成没有让棘轮指标劣化；
- 发版流程要求 `manifest.commit` 等于 tag 指向的 commit。

### 3.5 对现有棘轮门禁的影响

三种策略，建议选第 2 种：

| 策略 | 本地行为 | CI 行为 | 评价 |
| --- | --- | --- | --- |
| 1. 保持现状 | 文件缺失 → 解析失败 → 红 | 红 | 不可行（本地没有产物就寸步难行） |
| 2. **本地跳过 + CI 必跑**（推荐） | `--allow-missing` 打印获取命令，exit 0 | 生成 job 内对新产物跑棘轮，不达标 exit 1 | 开发不阻塞、云端仍把关 |
| 3. 删除棘轮 | — | — | 丢失唯一覆盖率趋势指标，不建议 |

棘轮基线文件继续入库（很小、可评审）；`live_routes_count` 等指标随每次生成更新。

### 3.6 迁移步骤

1. 先完成 B4/B5（代码层回退与 allow-missing），确保无产物时 `pnpm gen:types` 与本地门禁仍可用；
2. 提交一次「移除产物」的独立变更：B1 + B2 + B3 + B6 + B7 + B8；
3. 新增生成 job（同 A3 的 YAML，但产出上传 artifact，tag 时上传 Release）；
4. 在生成 job 末尾跑棘轮（`--aggregated-path`），确认指标不劣化；
5. 跑一次 `pnpm gen:types` 用权威 JSON 重新生成 `openapi.d.ts`，单独提交（预计 schema 数上升、`SafeSchema` 减少）；
6. 发版清单加入「Release 附件 + manifest 校验」；
7. 更新 TODO 与 README，在下一批任务中观察一段时间的「缺产物」摩擦；
8. 历史 LFS blob **不清理**（重写历史成本高、风险大），仅停止新增。

### 3.7 应急路径（CI 不可用时）

当前 Actions 因计费停摆，方案 B 必须有兜底：

```bash
# 维护者本地生成（约 2 小时）
./scripts/openapi/generate.sh --extract --output-dir /tmp/openapi
# 手工发布到 Release（不经过 Actions）
gh release upload <tag> /tmp/openapi/openapi-aggregated.json /tmp/openapi/openapi-aggregated.manifest.json
```

并在发布记录中注明「本次产物由本地生成，manifest.commit 已核对」。

## 4. TODO.md 口径

### 4.1 判断依据

支持「继续入库、留在根目录」的事实：

1. `docs/project/TODO.md` 已归档且不再维护，根 `TODO.md` 是唯一活跃清单；
2. `facts.mjs` 硬编码根路径，移动文件会让 `facts:check` 直接读不到（当前快照已落后 39 行，移动只会让漂移更隐蔽）；
3. `check-large-files.sh` 已显式豁免 `TODO.md`，说明其体量已被门禁接受；
4. TODO 的价值在「随时能看见」，根目录是唯一高频入口；`docs/quality/` 下已有 10+ 份一次性评估文档，清单混进去会被淹没。

### 4.2 结论

**`TODO.md` 继续入库，保留在仓库根目录，作为唯一活跃待办清单。** 不并入 `docs/quality/`。

### 4.3 配套纪律（建议写入文件头部）

| 纪律 | 具体规则 |
| --- | --- |
| 维护者 | 当批任务的提交者负责更新；跨批只允许「新增条目」或「删除已完成条目」，不做批量重排 |
| 同批更新 | 条目状态与实际代码在同一提交内变更；引用文档必须是已入库路径（当前 §1.F 引用的评估文档仍未跟踪，需在拍板后决定是否入库） |
| 与 facts 同步 | `pnpm facts:check` 是批次结束检查项（当前未接门禁）；修改 TODO 行数后需同批更新 `docs/quality/facts-latest.json` 的 `docs.todo_lines` |
| 归档 | 已完成条目累计超过 50 行时，压缩进 `docs/archive/TODO-archive-<date>.md`，根文件只保留未完成项 |
| 数字 | TODO 内的仓库状态数字（如「领先 origin/main 187 个提交」）必须来自命令输出，禁止手写估计 |

### 4.4 备选（不推荐）

若坚持文档化：新建 `docs/quality/todo-active.md`，根 `TODO.md` 退化为 5 行索引。成本清单：

- 需要同步修改 `facts.mjs` 的硬编码路径与快照键名，并更新治理文档中的所有引用；
- 需要迁移历史归档链接（`docs/archive/*` 有 3 份备份文件指向根 TODO）；
- 收益仅是「归类整齐」，但会重现 `docs/project/TODO.md` 的失活路径。

**结论：理由不充分，不采纳。**

### 4.5 当前未提交改动

按约定**本轮不碰、不提交**。拍板后建议单独一批提交：

1. `TODO.md` §1.F 的 11 条登记；
2. 同批更新 `docs/quality/facts-latest.json` 的 `docs.todo_lines`/`todo_h2_sections`；
3. 明确 `docs/quality/主模块功能缺陷与前后端补位评估-2026-11-19.md` 是否入库（TODO 已链接它，悬空链接不可接受）。

## 5. 需要拍板的决策点

| # | 决策 | 选项 | 建议 |
| --- | --- | --- | --- |
| D1 | 聚合产物口径 | A 继续入库 / **B 停止入库** | B；若 CI 计费短期无法恢复，先执行 B 的代码层（B4/B5/B8），产物停更并由本地生成兜底 |
| D2 | 生成 job 的触发 | 每日 schedule / 仅 tag | 仅 tag + 手动 dispatch（每日 2 小时编译不划算） |
| D3 | TODO.md | 留根 / 迁 docs/quality | 留根，配 §4.3 纪律 |
| D4 | 评估文档是否入库 | 入库 / 保持未跟踪 | 入库（TODO 已引用，且是 F1–F11 的唯一依据） |

## 6. 拍板后的执行顺序（本轮不执行）

1. 修 CI 计费或确认自托管 runner（D1 前置）；
2. 方案 B 的代码层：`gen-types` 回退、`--allow-missing`、`fetch-aggregated.sh`（可独立提交）；
3. 移除产物的独立提交（B1/B2/B3/B6/B7）；
4. 生成 job + Release 附件 + manifest（tag 触发）；
5. 用权威 JSON 重新生成前端类型并单独提交；
6. TODO §1.F 与 facts 快照同批提交；评估文档入库；
7. 观察两批任务后复盘「缺产物」摩擦，必要时再讨论是否恢复入库。

## 7. 复现本方案中的读数

```bash
# 产物规模（HEAD 经 LFS）
git show HEAD:docs/api/openapi-aggregated.json        # 指针
python3 - <<'PY'
import json
d=json.load(open('.git/lfs/objects/06/a3/06a397cb75826221507d24dc88bfbe8f16785977163dc93ebe36ed792b84e55b'))
print(len(d['paths']), len(d['components']['schemas']))
PY

# 生成耗时（本机热缓存，实测 2/29 用 8m45s）
/usr/bin/time -p bash scripts/openapi/generate.sh --extract --output-dir /tmp/openapi-timing

# 聚合棘轮
node scripts/ci/check-openapi-aggregated.cjs --report-only

# 消费者检索
grep -rn "openapi-aggregated" --exclude-dir=node_modules --exclude-dir=.git . | grep -v '^./docs/'

# CI 现状（作业未启动）
gh run list -L 6
gh run view <run-id> | grep -A2 ANNOTATIONS

# TODO 与 facts
wc -l TODO.md; node scripts/report/facts.mjs
```
