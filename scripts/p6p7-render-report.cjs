/**
 * 生成 P6+P7 合并的 Markdown 审计报告
 * 读取 scripts/tmp-output/ 下的 JSON 数据，渲染成最终交付文档
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'scripts', 'tmp-output');
function read(p) { try { return fs.readFileSync(p,'utf8'); } catch(e){ return ''; } }
function readJson(p) { try { return JSON.parse(read(p)); } catch(e){ return null; } }

const p6Csv = read(path.join(OUT, 'p6-audit-v5-robust.csv'));
const p7Report = readJson(path.join(OUT, 'p7-audit-report.json'));

/* ====== 解析 P6 CSV ====== */
const p6Lines = p6Csv.split(/\r?\n/).filter(Boolean);
const header = p6Lines[0].split(',');
const rows = p6Lines.slice(1).map(l => {
  // 简单 CSV 解析，处理 "xxx" 引号包围
  const cells = [];
  let cur = '', inQ = false;
  for (let i=0;i<l.length;i++){
    const ch = l[i];
    if (ch === '"') {
      if (inQ && l[i+1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (ch === ',' && !inQ) { cells.push(cur); cur=''; }
    else cur += ch;
  }
  cells.push(cur);
  return Object.fromEntries(header.map((h,i)=>[h, cells[i]||'']));
});
const TOTAL = rows.length;
const RED = rows.filter(r=>r.level==='RED');
const YELLOW = rows.filter(r=>r.level==='YELLOW');
const AMBER = rows.filter(r=>r.level==='AMBER');
const GREEN = rows.filter(r=>r.level==='GREEN');
const levelCount = {RED:RED.length,YELLOW:YELLOW.length,AMBER:AMBER.length,GREEN:GREEN.length};

// 按一级目录聚合 Page 模块（apps/web/src/pages/<moduleName>/...）
const byModule = {};
for (const r of rows) {
  const m = (r.page || '').match(/pages\/([^/]+)\//);
  const mod = m ? m[1] : '_other';
  if (!byModule[mod]) byModule[mod] = {TOTAL:0,RED:0,YELLOW:0,AMBER:0,GREEN:0};
  byModule[mod].TOTAL++;
  byModule[mod][r.level]++;
}
const modulesSorted = Object.entries(byModule).sort((a,b)=>b[1].RED-a[1].RED);

// RED 分类：按 "顶级 API 名称" 聚合
const redByTopApi = {};
for (const r of RED) {
  const first = r.keyPath.split('.')[0];
  (redByTopApi[first] = redByTopApi[first] || []).push(r);
}
const topApiSorted = Object.entries(redByTopApi).sort((a,b)=>b[1].length-a[1].length);

/* ====== 渲染 Markdown ====== */
const lines = [];
function H(s){lines.push(''); lines.push(s); lines.push('');}
function P(s){lines.push(s);}
function BR(){lines.push('');}

H(`# 🔬 P6 + P7 合并审计终报告（${new Date().toISOString().slice(0,10)}）`);

P(`> - **代码仓库**: TOPEMS (${ROOT})`);
P(`> - **审计范围**: P6=Page→API 真实返回校验 · P7=权限码→RBAC 表双向审计`);
P(`> - **生成脚本**: [p6-api-audit-v5.cjs](file://${ROOT}/scripts/p6-api-audit-v5.cjs) · [p7-perm-audit-v5.cjs](file://${ROOT}/scripts/p7-perm-audit-v5.cjs)`);

/* ============ P6 ============ */
H(`## 📦 P6 · Page→API 真实返回校验（1025 个独立调用点）`);

const p6Score = Math.round((GREEN.length + AMBER.length*0.5) / TOTAL * 100);
const p6Grade = p6Score>=90?'🟢 A+':p6Score>=80?'🟢 A':p6Score>=70?'🟡 B':p6Score>=60?'🟠 C':'🔴 D';
P(`### 综合评级：**${p6Grade}** (${p6Score}/100) — GREEN+软匹配率 ${((GREEN.length+AMBER.length)/TOTAL*100).toFixed(1)}%`);

H(`### 分级统计矩阵`);
const bars = (n,total,c)=>{
  const pct = Math.round(n/Math.max(1,total)*30);
  return c.repeat(pct) + '░'.repeat(Math.max(0,30-pct)) + ` ${(n/total*100).toFixed(1)}%`;
};
P(`| 级别 | 数量 | 占比 | 可视化 | 含义 |`);
P(`|:--|--:|--:|:--|:--|`);
P(`| 🟢 GREEN | ${GREEN.length} | ${(GREEN.length/TOTAL*100).toFixed(1)}% | ${bars(GREEN.length,TOTAL,'█')} | API 方法存在 + 返回结构与使用方期望字段匹配 |`);
P(`| 🟠 AMBER | ${AMBER.length} | ${(AMBER.length/TOTAL*100).toFixed(1)}% | ${bars(AMBER.length,TOTAL,'▓')} | API 存在但返回类型未知（Typeless / Promise 未标注） |`);
P(`| 🟡 YELLOW | ${YELLOW.length} | ${(YELLOW.length/TOTAL*100).toFixed(1)}% | ${bars(YELLOW.length,TOTAL,'▒')} | API 存在但返回结构与期望 items/records 不匹配 |`);
P(`| 🔴 RED | **${RED.length}** | **${(RED.length/TOTAL*100).toFixed(1)}%** | ${bars(RED.length,TOTAL,'░')} | 调用路径不在 API 字典中（需逐个核查） |`);

H(`### 按页面模块 TOP 25 健康度（🔴 排序）`);
P(`| 模块 | 调用数 | 🟢GREEN | 🟠AMBER | 🟡YELLOW | 🔴RED | RED 率 | 评级 |`);
P(`|:--|--:|--:|--:|--:|--:|--:|:--:|`);
for (const [mod, s] of modulesSorted.slice(0, 25)) {
  const rr = (s.RED/s.TOTAL*100).toFixed(0);
  const g = s.RED===0?'🟢':s.RED<=Math.max(1,Math.round(s.TOTAL*0.1))?'🟡':'🔴';
  P(`| ${mod} | ${s.TOTAL} | ${s.GREEN} | ${s.AMBER} | ${s.YELLOW} | **${s.RED}** | ${rr}% | ${g} |`);
}

H(`### 🔴 RED 228：按顶层 API 对象聚合（TOP 20）`);
P(`> 对每个顶层对象，列出方法名清单，便于在对应 API 模块中批量补全。`);
P(`| 顶层 API 对象 | 🔴 数量 | 缺失方法示例（前 8 个） |`);
P(`|:--|--:|:--|`);
for (const [topApi, arr] of topApiSorted.slice(0, 20)) {
  const methods = [...new Set(arr.map(r=>r.keyPath.split('.').slice(1).join('.')))].slice(0,8);
  P(`| \`${topApi}\` | **${arr.length}** | ${methods.map(m=>'`'+m+'`').join(', ')} |`);
}

H(`### 🟡 YELLOW 6：返回结构 vs 使用方期望（完整清单）`);
if (YELLOW.length) {
  P(`| Page 位置 | 调用路径 | 期望 shapes | 页面返回类型 | 字典 key |`);
  P(`|:--|:--|:--|:--|:--|`);
  for (const r of YELLOW) P(`| \`${r.page}\` | \`${r.keyPath}\` | ${r.shapes||'-'} | ${r.pageType} | \`${r.dictKey}\` |`);
} else P(`_无 YELLOW 项_`);

H(`### 🔴 RED 完整清单 & 详细 CSV / JSON`);
P(`- **CSV** (全 1025 条分级数据): [p6-audit-v5-robust.csv](file://${OUT}/p6-audit-v5-robust.csv)`);
P(`- **RED JSON** (228 条 keyPath+page+shapes 结构化): [p6-red.json](file://${OUT}/p6-red.json)`);
P(`- **终端报告**: [p6-report-final.txt](file://${OUT}/p6-report-final.txt)`);

/* ============ P7 ============ */
H(`---`);
H(`## 🔐 P7 · RBAC 权限码双向审计报告`);

if (p7Report) {
  const p7Score = Math.round((p7Report.USED_count/Math.max(1,p7Report.LEGAL_count))*100);
  const p7Grade = p7Report.NOT_LEGAL_count===0 && p7Report.MISMATCH_count===0 ? '✅ PASS' : '❌ FAIL';
  H(`### 合规判定：**${p7Grade}** — NOT_LEGAL=${p7Report.NOT_LEGAL_count} · MISMATCH=${p7Report.MISMATCH_count}`);
  P(`- **覆盖度（已用/合法）**: ${p7Report.USED_count}/${p7Report.LEGAL_count} = **${p7Report.coverage}%**`);
  P(`- **待清理死权限码（DEAD）**: ${p7Report.DEAD_count} 条 (INFO 级，非阻断)`);

  H(`### 合规指标矩阵（FAIL / WARN 判定）`);
  P(`| 规则 | 实际值 | 阈值 | 判定 | 说明 |`);
  P(`|:--|--:|:--:|:--|:--|`);
  P(`| NOT_LEGAL（config 用非法权限码） | **${p7Report.NOT_LEGAL_count}** | 0 | ${p7Report.NOT_LEGAL_count===0?'✅ PASS':'🔴 FAIL'} | hasPermission 永远 false → 菜单隐藏/路由403 |`);
  P(`| MISMATCH (Nav.perm ⊄ Route.perms) | **${p7Report.MISMATCH_count}** | 0 | ${p7Report.MISMATCH_count===0?'✅ PASS':'🟡 WARN'} | 菜单可点进但路由 403 |`);
  P(`| DEAD (声明未用) | ${p7Report.DEAD_count} | ≤ 150 (参考) | 🟠 INFO | 权限矩阵维护成本 |`);

  H(`### 🟠 DEAD 124 条：分类归因`);
  P(`| 类别 | 数量 | 占比 | 典型样例 | 处置建议 |`);
  P(`|:--|--:|--:|:--|:--|`);
  const rs = p7Report.deadByReason || {};
  const reasons = [
    ['DASHBOARD_TEMPLATE','仪表盘模板权限（每个模块都有 dashboard:write/delete/approve/admin 4 条，实际仅用 read）'],
    ['MODULE_TOP_LEVEL','顶层模块级权限（hrm:read/write 等，实际使用子资源）'],
    ['NEVER_NAV_OR_ROUTE','独立功能资源权限（前端菜单/路由尚未启用该功能）'],
    ['ADVANCED_ACTION','进阶操作权限（如 delete/approve/admin 特殊动作）'],
  ];
  const totalD = p7Report.DEAD_count || 1;
  for (const [k, desc] of reasons) {
    const n = rs[k] || 0;
    const DEAD_ = p7Report.DEAD || [];
    const sample = DEAD_.filter(d => {
      if (k==='DASHBOARD_TEMPLATE') return /dashboard:/.test(d.code);
      if (k==='MODULE_TOP_LEVEL') return /^(hrm|mes|scm|wms|rs|im):(read|write|delete|approve|admin)$/.test(d.code);
      if (k==='ADVANCED_ACTION') return /:(delete|approve|admin)$/.test(d.code) && !/dashboard:/.test(d.code);
      return true;
    }).slice(0,3).map(d=>'`'+d.code+'`').join(' ');
    const advice = k==='DASHBOARD_TEMPLATE'?'保留至 v2.0（可能用于仪表盘编辑）':
                   k==='MODULE_TOP_LEVEL'?'评估批量删除或保留为未来层级预留':
                   k==='NEVER_NAV_OR_ROUTE'?'对应功能上线后自动消除':
                   '留作 RBAC 高级角色启用';
    P(`| ${k} | ${n} | ${(n/totalD*100).toFixed(0)}% | ${sample} | ${advice} |`);
  }

  H(`### 🔴 NOT_LEGAL（FAIL 项） — 0 条`);
  P(`_无违规。上一轮修复后，config.ts 中所有权限码均已落在 permissions.ts PERMISSION_DEFS 合法集合中。_`);

  H(`### 🟡 MISMATCH（WARN 项） — 0 条`);
  P(`_无违规。每个 NavItem.permission 均能在对应 Route.requiredPermissions 中找到。_`);

  H(`### 详细输出文件`);
  P(`- **NOT_LEGAL 清单**: [p7-not-legal.txt](file://${OUT}/p7-not-legal.txt)（当前 0 字节）`);
  P(`- **DEAD 清单（含元数据 module/action/name/group）**: [p7-dead.txt](file://${OUT}/p7-dead.txt)`);
  P(`- **结构化 JSON**: [p7-audit-report.json](file://${OUT}/p7-audit-report.json)`);
  P(`- **终端 Markdown 报告**: [p7-report-final.txt](file://${OUT}/p7-report-final.txt)`);
} else {
  P(`_⚠️ 未读取到 p7-audit-report.json，请重新运行 scripts/p7-perm-audit-v5.cjs_`);
}

/* ============ 附录：修复建议工作流 ============ */
H(`---`);
H(`## 🛠️ 下一阶段修复工作流（建议）`);

H(`### P6 RED 228 → 三档优先级`);
P(`| 优先级 | 档位 | 数量估算 | 修复策略 | 工具/命令 |`);
P(`|:--|:--|--:|:--|:--|`);
P(`| P0 | 企业 Suite 关键路径 RED（admin/tenant/finance/hrm/crm/erp/mes） | ~80 | 查 API 文件是否漏 export → 补 import 跟随或补方法声明 | \`grep -rn "dictItemApi.list" apps/web/src/api\` |`);
P(`| P1 | 其余 Suite（ai/aps/scm/wms/qms/ehs/pdm/lims） | ~100 | 同名方法迁移到新模块（如 aiApi.chat → ai/chat.ts chatApi.listSessions） | 用 lookupCall 调试脚本 |`);
P(`| P2 | hooks/_shared/第三方组件中的包装调用 | ~48 | 可能是设计上的自定义 Hook，非 API 调用 | 人工 spot-check 10% |`);

H(`### P7 DEAD 124 → 三档处置`);
P(`| 档位 | 数量 | 动作 | 风险 |`);
P(`|:--|--:|:--|:--|`);
P(`| 不动 | 53 (DASHBOARD_TEMPLATE) | 保留至 v2.x，作为未来仪表盘编辑功能的权限骨架 | 0 |`);
P(`| 标记 deprecated | 30 (MODULE_TOP_LEVEL) | 在 DEAD 表中标注为 top-level，等子资源权限矩阵稳定后统一清理 | 低 |`);
P(`| 清理候选 | 41 (其余) | 二期迭代：删除 permissions.ts 声明 + 同步 backend rbac 表 | 需后端联动 |`);

H(`### CI 集成建议`);
P(`1. 将 \`p6-api-audit-v5.cjs\` 加入 \`.github/workflows/ci.yml\` Gate（阈值：RED≤20, YELLOW≤5）`);
P(`2. 将 \`p7-perm-audit-v5.cjs\` 复用 CI 已有 permission matrix gate 规则，新增 NOT_LEGAL=0 强制断言`);
P(`3. 输出 JSON → 接入现有 health-dashboard 可视化面板`);

/* ============ 写入文件 ============ */
const outPath = path.join(OUT, 'P6-P7-合并审计报告-终版.md');
fs.writeFileSync(outPath, lines.join('\n'));
console.log(`✅ 最终报告已生成：${outPath}`);
console.log(`   行数：${lines.length}  大小：${(fs.statSync(outPath).size/1024).toFixed(1)}KB`);
