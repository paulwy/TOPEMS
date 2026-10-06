#!/usr/bin/env python3
"""B12 (U9.5): services.yaml ↔ ports.env ↔ nginx map 三方一致性校验。

校验规则（单一信源原则，V66.2 / config/services.yaml 头注释）：
  1. services.yaml 中每个服务（含 service_dir 等字段）应有对应端口配置：
     - 通过服务声明的 env_var（如 CORE_PORT）在 ports.env 中存在；
     - 无 env_var 时按服务名大写 + _PORT 推断并检查。
  2. nginx map 路由表（apps/web/nginx.conf 的 `~^/api/(svc)/` 条目）：
     - 每个 svc 前缀必须能在 services.yaml 中找到同名服务；
     - 已知合并别名例外：aps→mes、feedback→ticket（services.yaml 中允许缺失）。
  3. ports.env 中每个 *_PORT 键应能对应 services.yaml 中某个服务（或注释声明的虚拟服务/基础设施）。
  4. 输出差异清单并以非零退出码结束（供 CI/lefthook 门禁使用）。

用法：python3 scripts/dev/check-config-consistency.py
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SERVICES = ROOT / "config" / "services.yaml"
PORTS = ROOT / "config" / "ports.env"
NGINX = ROOT / "apps" / "web" / "nginx.conf"

# 已知合并别名：nginx 保留兼容路由，服务本身已合并到目标服务
MERGE_ALIASES = {
    "aps": "mes",        # [V2026.08] aps 已合并至 mes（兼容层）
    "feedback": "ticket",  # [V2026.08] feedback→ticket 兼容路由
}
# 已知命名别名：nginx 路由前缀与 services.yaml 服务名不同（前端既定路径）
NAME_ALIASES = {
    "plugin": "plugin-registry",  # upstream plugin_registry_service
}
# ports.env 中允许的基础设施/虚拟端口键（不要求有对应 services.yaml 服务）
KNOWN_INFRA = {
    "CORE_PORT", "FLOW_PORT", "FILE_PORT", "DOC_PORT", "AUTOMATION_PORT",
    "POSTGRES_PORT", "REDIS_PORT", "OLLAMA_PORT", "WEB_PORT", "GATEWAY_PORT",
}

def load_services():
    import yaml
    data = yaml.safe_load(SERVICES.read_text())
    services = {}  # name -> {env_var, group}
    for group, items in (data.get("service_groups") or {}).items():
        if not isinstance(items, list):
            continue
        for item in items:
            if not isinstance(item, dict) or "name" not in item:
                continue
            name = item["name"]
            services[name] = {
                "group": group,
                "env_var": item.get("env_var"),
            }
    return services

def load_ports():
    ports = {}
    for line in PORTS.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" in line:
            k, v = line.split("=", 1)
            ports[k.strip()] = v.strip()
    return ports

def load_nginx_routes():
    text = NGINX.read_text()
    routes = []  # [(svc, upstream)]
    for m in re.finditer(r"~\^/api/([A-Za-z0-9_-]+)/\s+(?:unified_core_service|bi_service|[a-z_]+_service|[\w]+);", text):
        routes.append((m.group(1), m.group(0).split()[1].rstrip(";")))
    return routes

def main():
    errors = []
    services = load_services()
    ports = load_ports()
    routes = load_nginx_routes()

    # 1. services.yaml → ports.env
    for name, meta in sorted(services.items()):
        env = meta["env_var"] or f"{name.replace('-', '_').upper()}_PORT"
        if env not in ports:
            errors.append(f"[services→ports] 服务 {name} 缺少端口 env {env}")

    # 2. nginx map → services.yaml
    for svc, upstream in routes:
        if svc in services or svc in MERGE_ALIASES or svc in NAME_ALIASES:
            continue
        errors.append(f"[nginx→services] 路由 /api/{svc}/ 无对应服务（services.yaml 缺失，且非已知合并/命名别名）")

    # 3. ports.env → services.yaml（非基础设施键应能对应服务 env_var）
    for key in sorted(ports):
        if key in KNOWN_INFRA:
            continue
        found = any(meta["env_var"] == key or (meta["env_var"] is None and f"{meta['name'].replace('-', '_').upper()}_PORT" == key)
                    for meta in services.values())
        if not found:
            errors.append(f"[ports→services] 端口 env {key} 无对应服务声明")

    if errors:
        print(f"❌ 配置一致性校验失败：{len(errors)} 项差异")
        for e in errors:
            print("   -", e)
        sys.exit(1)
    print(f"✅ 配置一致性校验通过：services.yaml {len(services)} 服务 ↔ ports.env {len(ports)} 项 ↔ nginx map {len(routes)} 路由")

if __name__ == "__main__":
    main()
