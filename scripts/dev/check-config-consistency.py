#!/usr/bin/env python3
"""B12 (U9.5): services.yaml ↔ ports.env ↔ nginx upstream(8099) 一致性校验。

校验规则（单一信源原则，V66.2 / config/services.yaml 头注释）：
  1. services.yaml 中每个服务（含 service_dir 等字段）应有对应端口配置：
     - 通过服务声明的 env_var（如 CORE_PORT）在 ports.env 中存在；
     - 无 env_var 时按服务名大写 + _PORT 推断并检查。
  2. nginx upstream 直代校验（P0-3 双轨合一后唯一入口 = server_service -> :8099，
     原 `$request_uri -> $api_upstream` 前缀 map 已移除）：
     - dev(apps/web/nginx.conf) 与生产(deploy/nginx/topems.conf) 两份 conf 的
       upstream server_service 必须指向 localhost:8099；
     - 不得残留非注释的 `map $request_uri $api_upstream` 前缀分发段。
  3. ports.env 中每个 *_PORT 键应能对应 services.yaml 中某个服务（或注释声明的虚拟服务/基础设施）。
  4. 进程监听地址默认必须回环（`DEFAULT_BIND_ADDR`），且入口不得硬编码 `0.0.0.0`；
     nginx 反代目标主机也必须是回环 —— 保证「进程只听回环，对外统一走 nginx」不退化。
  5. 输出差异清单并以非零退出码结束（供 CI/lefthook 门禁使用）。

用法：python3 scripts/dev/check-config-consistency.py
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SERVICES = ROOT / "config" / "services.yaml"
PORTS = ROOT / "config" / "ports.env"
# P0-3 双轨合一：dev(apps/web/nginx.conf) 与生产(deploy/nginx/topems.conf) 均为
# upstream server_service -> localhost:8099 直代，无前缀 map。
NGINX_FILES = [
    ROOT / "apps" / "web" / "nginx.conf",
    ROOT / "deploy" / "nginx" / "topems.conf",
]
# macOS 生产镜像模板：80/443 直接 proxy_pass 到本机 BFF，不经 upstream 块。
NGINX_DIRECT_FILES = [
    ROOT / "deploy" / "nginx" / "macos" / "servers" / "topems.conf",
    ROOT / "deploy" / "nginx" / "macos" / "servers" / "topems-ssl.conf",
]
SHARED_BOOTSTRAP = ROOT / "lib" / "shared-bootstrap" / "src" / "lib.rs"
SERVER_MAIN = ROOT / "svc" / "server" / "src" / "main.rs"
MONOLITH_PORT = "8099"
LOOPBACK_HOSTS = {"127.0.0.1", "localhost", "::1", "[::1]"}

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

def check_nginx_upstream():
    """校验 dev/生产两份 nginx conf：server_service -> localhost:8099，且无遗留前缀 map。"""
    errs = []
    for conf in NGINX_FILES:
        if not conf.exists():
            errs.append(f"[nginx] 缺失 conf 文件 {conf.relative_to(ROOT)}")
            continue
        text = conf.read_text()
        try:
            label = str(conf.relative_to(ROOT))
        except ValueError:
            label = str(conf)
        upstream = re.search(r"upstream\s+server_service\s*\{([^}]*)\}", text)
        if upstream is None:
            errs.append(f"[nginx→8099] {label} 未找到 upstream server_service")
        elif not re.search(r"server\s+localhost:8099\b", upstream.group(1)):
            errs.append(f"[nginx→8099] {label} server_service 未指向 localhost:8099")
        # 非注释行不得残留 $request_uri -> $api_upstream 前缀 map
        for lineno, line in enumerate(text.splitlines(), 1):
            stripped = line.strip()
            if stripped.startswith("#"):
                continue
            if re.search(r"map\s+\$request_uri\s+\$api_upstream", line):
                errs.append(f"[nginx→8099] {label}:{lineno} 残留 P0-3 前前缀 map（应移除）")
    return errs

def check_bind_addr():
    """校验「进程只听回环，对外统一走 nginx」口径不被回退。

    - shared-bootstrap 的 `DEFAULT_BIND_ADDR` 必须是回环地址（默认值单一信源）；
    - topems-server 入口不得硬编码未指定地址（0.0.0.0 / 0,0,0,0）；
    - nginx 直代 conf 的 proxy_pass 目标主机必须是回环、端口为 :8099。
    """
    errs = []

    if not SHARED_BOOTSTRAP.exists():
        errs.append(f"[bind] 缺失 {SHARED_BOOTSTRAP.relative_to(ROOT)}")
    else:
        m = re.search(
            r'pub const DEFAULT_BIND_ADDR: &str = "([^"]+)"', SHARED_BOOTSTRAP.read_text()
        )
        if m is None:
            errs.append("[bind] shared-bootstrap 未声明 DEFAULT_BIND_ADDR（默认监听地址必须显式可查）")
        elif m.group(1) not in {"127.0.0.1", "::1"}:
            errs.append(
                f"[bind] DEFAULT_BIND_ADDR={m.group(1)!r} 不是回环：默认必须 127.0.0.1，"
                "放开全部网卡需显式设 BIND_ADDR"
            )

    if not SERVER_MAIN.exists():
        errs.append(f"[bind] 缺失 {SERVER_MAIN.relative_to(ROOT)}")
    else:
        for lineno, line in enumerate(SERVER_MAIN.read_text().splitlines(), 1):
            if line.strip().startswith("//"):
                continue
            if re.search(r"0,\s*0,\s*0,\s*0|0\.0\.0\.0", line):
                errs.append(
                    f"[bind] svc/server/src/main.rs:{lineno} 硬编码未指定监听地址"
                    "（应走 BIND_ADDR，默认回环）"
                )

    for conf in NGINX_DIRECT_FILES:
        if not conf.exists():
            errs.append(f"[bind→nginx] 缺失 conf 文件 {conf.relative_to(ROOT)}")
            continue
        label = str(conf.relative_to(ROOT))
        for lineno, line in enumerate(conf.read_text().splitlines(), 1):
            if line.strip().startswith("#"):
                continue
            for target in re.findall(r"proxy_pass\s+http://([^/;\s]+)", line):
                host, _, port = target.rpartition(":")
                if host not in LOOPBACK_HOSTS:
                    errs.append(
                        f"[bind→nginx] {label}:{lineno} proxy_pass 目标 {target} 不是回环"
                        "（进程只监听 127.0.0.1）"
                    )
                elif port != MONOLITH_PORT:
                    errs.append(
                        f"[bind→nginx] {label}:{lineno} proxy_pass 端口 {port} ≠ {MONOLITH_PORT}"
                    )
    return errs


def main():
    errors = []
    services = load_services()
    ports = load_ports()

    # 1. services.yaml → ports.env
    for name, meta in sorted(services.items()):
        env = meta["env_var"] or f"{name.replace('-', '_').upper()}_PORT"
        if env not in ports:
            errors.append(f"[services→ports] 服务 {name} 缺少端口 env {env}")

    # 2. nginx upstream server_service -> 8099 直代校验（dev + 生产两份 conf）
    errors.extend(check_nginx_upstream())

    # 3. 监听地址口径：默认回环 + nginx 目标回环
    errors.extend(check_bind_addr())

    # 4. ports.env → services.yaml（非基础设施键应能对应服务 env_var）
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
    print(f"✅ 配置一致性校验通过：services.yaml {len(services)} 服务 ↔ ports.env {len(ports)} 项 ↔ nginx upstream 8099 {len(NGINX_FILES)} 份 conf ↔ 监听地址默认回环（nginx 直代 {len(NGINX_DIRECT_FILES)} 份 conf）")

if __name__ == "__main__":
    main()
