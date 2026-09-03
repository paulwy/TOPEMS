#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
服务调用拓扑生成器
==================

聚合 `topems_service_to_service_calls_total{service=...}`（Prometheus metrics，
记录在 **被调用方** 进程，label service=调用方）→ 生成服务依赖矩阵 / 调用图谱。

两种模式：
  --static   内置静态依赖表（with_service_token 全量接入清单）→ "设计依赖"图谱
  --collect  扫描运行中服务 /metrics → 实际发生的调用边 → "运行时"图谱（优先）

依赖方向：边 = 调用方 → 被调用方（metrics 出现在被调用方进程，label=调用方）。

输出（docs/architecture/service-topology/）：
  service-topology.{mode}.json   ECharts graph 数据（nodes/edges）
  service-dependency-matrix.{mode}.csv  依赖矩阵（调用方 × 被调用方 × 次数）
  service-topology.{mode}.html   自包含 ECharts 有向图（CDN，离线降级提示）

用法：
  python3 scripts/arch/service_topology.py --static
  python3 scripts/arch/service_topology.py --collect "erp:18010,wms:18041,finance:18011"
  python3 scripts/arch/service_topology.py --static --collect "..."（动态优先，缺失回退静态）
"""
import argparse
import json
import os
import re
import sys
import urllib.request

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT_DIR = os.path.join(REPO, "docs", "architecture", "service-topology")

# ---------------------------------------------------------------------------
# 静态设计依赖（with_service_token 全量接入清单，来源：架构治理 KEY_FACTS）
# 调用方 → [被调用方, ...]
# ---------------------------------------------------------------------------
STATIC_DEPS = {
    "erp-service":     ["wms-service", "finance-service", "hrm-service"],
    "crm-service":     ["erp-service", "wms-service", "workflow-service"],
    "mobile-service":  ["wms-service", "mes-service", "qms-service", "hrm-service",
                        "workflow-service", "notification-service"],
    "srm-service":     ["workflow-service"],
    "qms-service":     ["workflow-service"],
    "pm-service":      ["workflow-service"],
    "finance-service": ["workflow-service"],
    "ehs-service":     ["workflow-service"],
    "hrm-service":     ["erp-service"],   # 09-03 跨服务直读走 API：payroll 凭证改走 erp 凭证 API
    "portal-service":  ["notification-service", "workflow-service", "mes-service",
                        "monitor-service", "iam-service", "hrm-service",
                        "erp-service", "crm-service", "finance-service"],
    # 模块化单体 server 内部模块
    "server-erp-module":    ["hrm-service", "finance-service"],
    "server-crm-module":    ["erp-service", "wms-service", "workflow-service"],
    "server-pm-module":     ["workflow-service"],
    "server-qms-module":    ["workflow-service"],
    "server-finance-module":["workflow-service"],
    "server-srm-module":    ["workflow-service"],
    "server-ehs-module":    ["workflow-service"],
    # 平台核心服务：unified-core 调各域服务（拆分前置 #2 起 unified-core → portal 偏好 API）
    "unified-core-service": ["portal-service"],
}

# 被调用方集合（图谱中被调用节点也计入 nodes）
ALL_SERVICES = set(STATIC_DEPS.keys()) | set(
    t for targets in STATIC_DEPS.values() for t in targets
)

# 分组：调用方服务 / 被调用平台服务 / 模块化单体模块
PLATFORM_SERVICES = {
    "wms-service", "finance-service", "hrm-service", "mes-service", "qms-service",
    "workflow-service", "notification-service", "monitor-service", "iam-service",
    "erp-service", "crm-service",
}
MODULE_NODES = {s for s in ALL_SERVICES if "-module" in s}
CALLER_SERVICES = set(STATIC_DEPS.keys()) - MODULE_NODES

# 逻辑服务名清单（设计边节点名去掉 "-service" 后缀）：
# collect 的 spec 名按此归一化，保证 runtime 节点名与设计边一致。
LOGIC_SERVICE_NAMES = {
    "wms", "erp", "finance", "hrm", "portal", "crm", "mobile",
    "iam", "workflow", "notification", "mes", "qms", "monitor",
    "srm", "pm", "ehs", "scm", "ai", "bi", "gis", "integration",
    "tms", "rd", "ticket", "search", "plugin-registry", "master-data",
}

# 进程名 → 逻辑服务名映射：collect 的 spec 通常用进程名（如 unified-core），
# 而设计边用逻辑服务名（如 iam-service）。此处把已知进程名归一化到逻辑名。
PROCESS_TO_LOGIC = {
    "unified-core": "iam",
    "core": "iam",
    "core-service": "iam",
}

# 调用方 token 名 → 设计节点名：被调用方 /metrics 的 label 是调用方 service token 名。
# 多数已带 "-service" 后缀（portal-service 等），unified-core 的 token 名为 "unified-core"
# （无后缀）——归一化到设计节点名以与 STATIC_DEPS 匹配。
CALLER_TOKEN_TO_SERVICE = {
    "unified-core": "unified-core-service",
    "core": "unified-core-service",
}


def normalize_caller(label):
    """metric label（调用方 token 名）→ 设计节点名。"""
    if label.endswith("-service"):
        return label
    return CALLER_TOKEN_TO_SERVICE.get(label, label)


def category_of(node):
    if node in MODULE_NODES:
        return "模块化单体模块"
    if node in CALLER_SERVICES:
        return "调用方服务"
    return "被调用平台服务"


def collect_runtime(specs):
    """扫描运行中服务 /metrics，返回 {被调用方: {调用方: 次数}}。

    spec 形如 `svc:port`——`svc` 用进程名或逻辑服务名均可：
    进程名经 PROCESS_TO_LOGIC 归一化（如 unified-core→iam），
    逻辑服务名直接加 "-service" 后缀，保证节点名与设计边一致。
    """
    metric_re = re.compile(r'topems_service_to_service_calls_total\{service="([^"]+)"\}\s+(\d+)')
    result = {}
    for spec in specs:
        name, port = spec.rsplit(":", 1)
        # 进程名 → 逻辑服务名（如 unified-core → iam）
        logic = PROCESS_TO_LOGIC.get(name, name)
        if logic not in LOGIC_SERVICE_NAMES:
            print(
                f"  [warn] {name}:{port} 不在逻辑服务名清单（{sorted(LOGIC_SERVICE_NAMES)}），"
                f"节点名按 '{logic}-service'"
            )
        url = f"http://localhost:{port}/metrics"
        try:
            with urllib.request.urlopen(url, timeout=3) as resp:
                body = resp.read().decode("utf-8", "replace")
        except Exception as e:
            print(f"  [skip] {name}:{port} 不可达（{e}）")
            continue
        caller = logic + "-service"
        counts = {}
        for m in metric_re.finditer(body):
            caller_name, cnt = m.group(1), int(m.group(2))
            caller_name = normalize_caller(caller_name)
            counts[caller_name] = counts.get(caller_name, 0) + cnt
        if counts:
            result[caller] = counts
            print(f"  [ok] {name}:{port}（→ {caller}）捕获 {len(counts)} 个调用方")
    return result


def build_edges(static=True, runtime=None):
    """返回 (调用方→被调用方, 次数) 边列表与来源标记。"""
    edges = {}
    source = {}
    if static:
        for src, targets in STATIC_DEPS.items():
            for tgt in targets:
                key = (src, tgt)
                edges[key] = 1
                source[key] = "design"
    if runtime:
        # 被调用方 = 该服务 metrics 所在进程；label = 调用方
        for callee, counts in runtime.items():
            for caller, cnt in counts.items():
                key = (caller, callee)
                edges[key] = max(edges.get(key, 0), cnt)
                source[key] = "runtime"
    return edges, source


def to_echarts_data(edges, source):
    nodes = []
    seen = set()
    for (src, tgt), _ in edges.items():
        for n in (src, tgt):
            if n not in seen:
                seen.add(n)
                nodes.append({
                    "id": n,
                    "name": n,
                    "category": category_of(n),
                    "symbolSize": 34 if n not in MODULE_NODES else 26,
                })
    link = []
    for (src, tgt), cnt in edges.items():
        link.append({
            "source": src,
            "target": tgt,
            "value": cnt,
            "lineStyle": {"width": min(1 + cnt, 8)},
            "sourceFlag": source.get((src, tgt), "design"),
        })
    return {"nodes": nodes, "links": link, "categories": [
        {"name": "调用方服务"}, {"name": "被调用平台服务"}, {"name": "模块化单体模块"},
    ]}


def to_matrix_csv(edges):
    callers = sorted({s for (s, _) in edges})
    callees = sorted({t for (_, t) in edges})
    lines = ["调用方\\被调用方," + ",".join(callees)]
    for c in callers:
        row = [c]
        for t in callees:
            row.append(str(edges.get((c, t), 0)))
        lines.append(",".join(row))
    return "\n".join(lines) + "\n"


HTML_TMPL = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>TopEMS 服务调用拓扑（{mode}）</title>
<style>
  html,body {{ margin:0; padding:0; background:#f7f8fa; font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif; }}
  .wrap {{ max-width:1100px; margin:0 auto; padding:16px; }}
  h1 {{ font-size:18px; color:#1a1b1c; margin:8px 0 4px; }}
  .sub {{ font-size:12px; color:#6b7280; margin-bottom:12px; }}
  .chart {{ width:100%; height:680px; background:#fff; border-radius:10px; box-shadow:0 1px 4px rgba(0,0,0,.06); }}
  .legend-note {{ font-size:12px; color:#6b7280; margin:10px 0; }}
  .legend-note b {{ color:#374151; }}
  .no-echarts {{ display:none; padding:40px; text-align:center; color:#6b7280; font-size:14px; }}
  table {{ border-collapse:collapse; width:100%; margin-top:16px; background:#fff; font-size:12px; }}
  th,td {{ border:1px solid #e5e7eb; padding:4px 6px; text-align:center; }}
  th {{ background:#f3f4f6; color:#374151; }}
  td:first-child, th:first-child {{ text-align:left; }}
</style>
</head>
<body>
<div class="wrap">
  <h1>TopEMS 服务调用拓扑（{mode}）</h1>
  <div class="sub">边方向 = 调用方 → 被调用方（被调用方 /metrics 记录调用方 label）；线宽 = 调用次数。来源：{srcnote}</div>
  <div class="legend-note"><b>调用方服务</b>（主动发起 service token 调用）· <b>被调用平台服务</b>（提供 API 被调用）· <b>模块化单体模块</b>（server 内嵌模块，调用独立服务）</div>
  <div class="chart" id="chart"></div>
  <div class="no-echarts" id="fallback">ECharts 未加载——请联网后刷新。以下为静态依赖清单：<pre>{staticlist}</pre></div>
  <div id="matrix"></div>
</div>
<script src="https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js"></script>
<script>
(function(){{
  var el = document.getElementById('chart');
  if (!window.echarts) {{ document.getElementById('fallback').style.display='block'; el.style.display='none'; return; }}
  var option = {option};
  option.backgroundColor = 'transparent';
  option.tooltip = {{ trigger:'item', triggerOn:'click', renderMode:'richText', confine:true,
      formatter: function(p){{
        if (!p || !p.dataType) return '';
        if (p.dataType === 'edge') {{
          return p.data.source + ' → ' + p.data.target + String.fromCharCode(10) + '调用次数: ' + p.data.value;
        }}
        return p.name;
      }}
  }};
  option.legend = {{ top:0, type:'scroll', itemWidth:14, itemHeight:8, textStyle:{{color:'#6b7280',fontSize:11}} }};
  option.title = {{ text:'服务间调用依赖图', left:'center', top:0, textStyle:{{fontSize:15,fontWeight:600,color:'#1a1b1c'}} }};
  option.series[0].layout = 'force';
  option.series[0].roam = true;
  option.series[0].force = {{ repulsion:420, edgeLength:110 }};
  option.series[0].label = {{ show:true, position:'right', color:'#374151', fontSize:11,
      formatter: function(p){{ return p.name.replace('-service','').replace('-module','(m)'); }} }};
  var chart = echarts.init(el);
  chart.setOption(option);
  window.addEventListener('resize', function(){{ chart.resize(); }});
}})();
</script>
<script>
(function(){{
  var data = {matrix};
  var el = document.getElementById('matrix');
  if (!el) return;
  var callers = Object.keys(data);
  if (!callers.length) {{ el.innerHTML='<div class="sub">暂无调用数据</div>'; return; }}
  var callees = [];
  callers.forEach(function(c){{ Object.keys(data[c]||{{}}).forEach(function(t){{ if(callees.indexOf(t)<0) callees.push(t); }}); }});
  callees.sort();
  var h = '<table><tr><th>调用方 \\ 被调用方</th>';
  callees.forEach(function(t){{ h += '<th>'+t.replace('-service','')+'</th>'; }});
  h += '</tr>';
  callers.sort().forEach(function(c){{
    h += '<tr><td>'+c.replace('-service','')+'</td>';
    callees.forEach(function(t){{ var v = (data[c]&&data[c][t])||0; h += '<td>'+(v?v:'·')+'</td>'; }});
    h += '</tr>';
  }});
  h += '</table>';
  el.innerHTML = h;
}})();
</script>
</body>
</html>
"""


def consistency_report(runtime_edges, design_edges):
    """对比 runtime（实际发生）与 design（设计声明）边，输出一致性报告。"""
    rs = set(runtime_edges.keys())
    ds = set(design_edges.keys())
    matched = rs & ds
    only_runtime = rs - ds
    only_design = ds - rs
    lines = []
    lines.append(f"匹配边（design 已声明）       : {len(matched)}")
    lines.append(f"仅 runtime（设计未声明/新增） : {len(only_runtime)}")
    for e in sorted(only_runtime):
        lines.append(f"    {e[0]} → {e[1]}  ({runtime_edges.get(e, '?')} 次)")
    lines.append(f"仅 design（runtime 未捕获）   : {len(only_design)}")
    for e in sorted(only_design):
        lines.append(f"    {e[0]} → {e[1]}")
    return "\n".join(lines)


def main():
    ap = argparse.ArgumentParser(description="服务调用拓扑生成器")
    ap.add_argument("--static", action="store_true", help="使用内置静态设计依赖")
    ap.add_argument("--collect", metavar="svc:port,...", help="扫描运行中服务 /metrics（动态优先）")
    ap.add_argument("--out", default=OUT_DIR, help="输出目录")
    args = ap.parse_args()

    runtime = None
    if args.collect:
        print("== 运行时采集 ==")
        runtime = collect_runtime([s.strip() for s in args.collect.split(",") if s.strip()])
    if not args.collect and not args.static:
        print("未指定模式，默认 --static")
        args.static = True

    edges, source = build_edges(static=args.static or (not runtime), runtime=runtime)
    if not edges:
        print("无任何依赖边，退出")
        sys.exit(1)

    mode = "runtime" if runtime else "design"
    os.makedirs(args.out, exist_ok=True)

    # runtime vs design 一致性对比（仅 --collect 时输出）
    if runtime:
        design_edges, _ = build_edges(static=True, runtime=None)
        print("\n== runtime vs design 一致性 ==")
        print(consistency_report(edges, design_edges))

    graph = to_echarts_data(edges, source)
    option = {
        "series": [{
            "type": "graph", "layout": "force",
            "data": graph["nodes"], "links": graph["links"],
            "categories": graph["categories"],
            "lineStyle": {"color": "source", "curveness": 0.12, "opacity": 0.7},
            "emphasis": {"focus": "adjacency", "lineStyle": {"width": 6}},
            "edgeSymbol": ["none", "arrow"], "edgeSymbolSize": [0, 9],
        }]
    }
    opt_json = json.dumps(option, ensure_ascii=False, indent=2)

    # 矩阵（CSV + HTML 表格数据）
    matrix_csv = to_matrix_csv(edges)
    matrix_dict = {}
    for (s, t), c in edges.items():
        matrix_dict.setdefault(s, {})[t] = c
    matrix_json = json.dumps(matrix_dict, ensure_ascii=False)

    static_list = "\n".join(f"{s} → {', '.join(t)}" for s, t in sorted(edges))
    html = HTML_TMPL.format(
        mode="运行时" if runtime else "设计", srcnote=("运行中 /metrics 采集" if runtime else "with_service_token 全量接入清单"),
        option=opt_json, matrix=matrix_json, staticlist=static_list,
    )

    base = f"service-topology.{mode}"
    with open(os.path.join(args.out, base + ".json"), "w", encoding="utf-8") as f:
        f.write(json.dumps(graph, ensure_ascii=False, indent=2))
    with open(os.path.join(args.out, "service-dependency-matrix." + mode + ".csv"), "w", encoding="utf-8") as f:
        f.write(matrix_csv)
    with open(os.path.join(args.out, base + ".html"), "w", encoding="utf-8") as f:
        f.write(html)

    print(f"\n== 输出（{mode} 模式，{len(edges)} 条边 / {len(graph['nodes'])} 节点）==")
    print(f"  JSON: {os.path.join(args.out, base + '.json')}")
    print(f"  CSV : {os.path.join(args.out, 'service-dependency-matrix.' + mode + '.csv')}")
    print(f"  HTML: {os.path.join(args.out, base + '.html')}")


if __name__ == "__main__":
    main()
