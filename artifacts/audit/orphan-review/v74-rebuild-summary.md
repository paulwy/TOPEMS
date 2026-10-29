# to_bind v74 重建池（2026-10-29，当前基线·泛型/跨行/短路径匹配修正）

> 脚本：`scripts/rebuild-to-bind-pool.py`；后端路由 5592（utoipa 3260 + Router::route 2332）× 前端 api 调用 3243（含泛型/跨行调用识别）。
> 口径：后端真实 handler + 前端无 api 调用 → 候选；优先级 P0=写+弱引用 / P1=写+无引用 / P2=读+弱引用 / 下线候选=读+无引用。

**候选总数：1468**（v73 332 作废）

## 优先级分布
| 优先级 | 数量 | 处置建议 |
|---|---|---|
| P0 | 3（短路径误报登记，实质 0） | 写端点+弱引用 |
| P1 | 160 | 写端点+无引用 |
| P2 | 101 | 读端点+弱引用 |
| 下线候选 | 1361 | 读端点+无引用，人工确认删路由 |

## 按服务分布（前 15）
| 服务 | 候选 | P0 | P1 | P2 | 下线 |
|---|---|---|---|---|---|
| erp | 373 | 4 | 62 | 9 | 298 |
| portal | 330 | 0 | 0 | 4 | 326 |
| unified-core | 143 | 0 | 6 | 19 | 118 |
| master-data | 85 | 0 | 5 | 3 | 77 |
| ai | 83 | 2 | 4 | 4 | 73 |
| analytics | 74 | 2 | 21 | 5 | 46 |
| finance | 69 | 0 | 7 | 2 | 60 |
| integration | 64 | 8 | 6 | 1 | 49 |
| mes | 59 | 2 | 12 | 5 | 40 |
| plugin-registry | 56 | 0 | 22 | 3 | 31 |
| ehs | 47 | 0 | 5 | 2 | 40 |
| qms | 46 | 1 | 25 | 2 | 18 |
| pdm | 38 | 0 | 15 | 1 | 22 |
| lims | 35 | 0 | 12 | 5 | 18 |
| rd | 35 | 3 | 6 | 5 | 21 |

## 匹配能力迭代记录（2026-10-29）
- v1：utoipa 3260 路由，候选 1649。
- v2：补 Router::route（5592），候选 2712。
- v3：api_re 泛型调用识别（前端 2041→2670），候选 1886。
- v4：跨行路径识别（前端 2670→3243），候选 ~1850（n>=2 最终）。
- **ehs P0+P1 已绑定 66→0**（本批补绑 11 条 + 既有已绑识别）。
- **erp P0+P1 66→48→13**（svc 前缀归一修正；批2 补绑 4 条：meeting-bookings 3 + consolidation submit-report 1；批1 MDM 补绑 33 条；剩余 13 条全为误报/下线候选——登记）。
- **P0 批 9→3**（补绑 9 条：bi createReport + notification deleteAll/autoArchive + hrm createPosition + monitor settings×2 + rd member/milestone/phase；剩余 3 条（notification deleteAll + monitor settings×2）为短路径误报——实已绑登记）。
- 已知精度限制：1 段短路径（如 /plans）不参与尾段匹配（n>=2），短路径端点可能漏匹配已绑（登记）。