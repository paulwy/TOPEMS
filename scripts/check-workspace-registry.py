#!/usr/bin/env python3
"""
Workspace Registry Validator (P0-3 配置单一真相源 CI 校验)
==========================================================
核对三处"服务/端口"权威源的一致性：
  1. Cargo.toml [workspace].members   —— 哪些服务参与构建
  2. config/services.yaml             —— 服务清单与端口（官方单一信源）
  3. config/ports.env                 —— 端口环境变量

检查项：
  A. Cargo members 中 svc/* 与 services.yaml 服务条目双向核对
     - 在构建但不在 services.yaml（缺条目）
     - 在 services.yaml 但不在构建（应为已归档，需注释说明）
  B. services.yaml 端口 vs ports.env 端口一致性
  C. 端口冲突（同一端口被多个服务占用）

用法:
  python3 scripts/check-workspace-registry.py            # 校验并报告
  python3 scripts/check-workspace-registry.py --check    # CI 门禁模式，不一致则 exit 1
  python3 scripts/check-workspace-registry.py --quiet    # 仅输出问题行

退出码:
  0 = 全部一致
  1 = 存在不一致（--check 下 CI 拦截）
"""
import os
import re
import sys

try:
    import yaml
except ImportError:
    print("ERROR: PyYAML not installed (pip install pyyaml)", file=sys.stderr)
    sys.exit(2)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CARGO_TOML = os.path.join(ROOT, "Cargo.toml")
SERVICES_YAML = os.path.join(ROOT, "config", "services.yaml")
PORTS_ENV = os.path.join(ROOT, "config", "ports.env")

CHECK_ONLY = "--check" in sys.argv
QUIET = "--quiet" in sys.argv


def load_cargo_members():
    """从 Cargo.toml 提取 workspace members 中的 svc/* 目录名。

    注意：members 数组内含 `# [模块组: core]` 之类注释，不能依赖正则匹配
    第一个 `]`，需逐行解析直到数组结束行（以 `]` 结尾且非注释）。
    """
    with open(CARGO_TOML, encoding="utf-8") as f:
        text = f.read()
    # 定位 [workspace] 段中的 members = [ 起始行
    ws_idx = text.find("[workspace]")
    if ws_idx == -1:
        print("ERROR: 找不到 [workspace] 段", file=sys.stderr)
        sys.exit(2)
    members_start = text.find("members", ws_idx)
    if members_start == -1:
        print("ERROR: 找不到 members 键", file=sys.stderr)
        sys.exit(2)
    bracket = text.find("[", members_start)
    if bracket == -1:
        print("ERROR: 找不到 members 数组起始 [", file=sys.stderr)
        sys.exit(2)

    svc_members = set()
    lib_members = set()
    rest = text[bracket + 1 :]
    for line in rest.splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        # 数组结束：非注释且以 ] 结尾
        if not stripped.startswith("#") and stripped.endswith("]"):
            break
        clean = stripped.split("#", 1)[0].strip().strip('",')
        if not clean:
            continue
        if clean.startswith("svc/"):
            name = clean.split("/", 1)[1]
            if name != "_archive":
                svc_members.add(name)
        elif clean.startswith("lib/"):
            lib_members.add(clean.split("/", 1)[1])
    return svc_members, lib_members


def load_services_yaml():
    """解析 services.yaml，返回 {name: {port, env_var, service_dir, status, bootstrap_mode}}。"""
    with open(SERVICES_YAML, encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}
    services = {}
    for group in (data.get("service_groups") or {}).values():
        for svc in group:
            name = svc.get("name")
            if not name:
                continue
            services[name] = {
                "port": svc.get("port"),
                "env_var": svc.get("env_var"),
                "service_dir": svc.get("service_dir", name),
                "status": svc.get("status", "implemented"),
                "bootstrap_mode": svc.get("bootstrap_mode"),
            }
    for svc in data.get("virtual_services") or []:
        name = svc.get("name")
        if not name:
            continue
        services[name] = {
            "port": svc.get("port"),
            "env_var": svc.get("env_var"),
            "service_dir": svc.get("provider", name),
            "status": "virtual",
            "bootstrap_mode": None,
        }
    return services


def load_ports_env():
    """解析 config/ports.env，返回 {ENV_VAR: port}。"""
    ports = {}
    with open(PORTS_ENV, encoding="utf-8") as f:
        for line in f:
            line = line.split("#", 1)[0].strip()
            if not line or "=" not in line:
                continue
            key, _, val = line.partition("=")
            key = key.strip()
            val = val.strip()
            if key.endswith("_PORT") and val.isdigit():
                ports[key] = val
    return ports


def main():
    problems = []

    cargo_svc, cargo_lib = load_cargo_members()
    services = load_services_yaml()
    ports = load_ports_env()

    svc_names = set(services.keys())

    # service_dir 集合（默认等于 name；iam→unified-core、bi→analytics 等由 service_dir 关联）
    service_dirs = {
        info["service_dir"]
        for info in services.values()
        if info["status"] not in ("virtual", "reserved")
    }
    # svc/server 是模块化单体统一入口（topems-server），无独立端口，不参与服务清单匹配
    EXCLUDED_BUILD_DIRS = {"server"}

    # ---- A1: 在构建但不在 services.yaml ----
    for name in sorted(cargo_svc):
        if name in EXCLUDED_BUILD_DIRS:
            continue
        if name not in service_dirs:
            problems.append(
                f"A1 在构建但不在 services.yaml: svc/{name}（Cargo.toml members 含，services.yaml 缺条目）"
            )

    # ---- A2: 在 services.yaml 但不在构建（应为归档/虚拟）----
    for name in sorted(svc_names):
        info = services[name]
        if info["status"] in ("virtual", "reserved"):
            continue  # 虚拟服务与保留端口不算归档
        if info["service_dir"] not in cargo_svc:
            problems.append(
                f"A2 services.yaml 有但不在构建: {name}（services.yaml 状态={info['status']}，"
                f"Cargo.toml members 无 svc/{info['service_dir']}，应为已归档或删除条目）"
            )

    # ---- B: services.yaml 端口 vs ports.env 端口 ----
    for name, info in services.items():
        env_var = info.get("env_var")
        yaml_port = info.get("port")
        if not env_var or yaml_port is None:
            continue
        env_port = ports.get(env_var)
        if env_port is not None and str(env_port) != str(yaml_port):
            problems.append(
                f"B 端口不一致: {name} {env_var} ports.env={env_port} services.yaml={yaml_port}"
            )
        elif env_port is None:
            problems.append(f"B ports.env 缺变量: {name} {env_var}（services.yaml={yaml_port}）")

    # ---- C: 端口冲突（仅 service_groups 独立进程；虚拟服务共享 provider 端口为设计）----
    process_services = {}
    for name, info in services.items():
        if info["status"] in ("virtual", "reserved"):
            continue
        port = info.get("port")
        if port is None:
            continue
        process_services.setdefault(str(port), []).append(name)
    for port, names in sorted(process_services.items()):
        if len(names) > 1:
            problems.append(f"C 端口冲突 {port}: {', '.join(sorted(names))}")

    if problems:
        if not QUIET:
            print("配置单一真相源校验发现不一致:")
            for p in problems:
                print(f"  ✗ {p}")
        if CHECK_ONLY:
            print("\n请修正后重试（参考 config/services.yaml 为单一信源）")
            sys.exit(1)
        print(f"\n共 {len(problems)} 处不一致")
        sys.exit(1)

    print("✓ Cargo.toml members / config/services.yaml / config/ports.env 三向一致")
    print(f"  构建中 svc 服务: {len(cargo_svc)} · services.yaml 条目: {len(svc_names)} · ports.env 变量: {len(ports)}")
    sys.exit(0)


if __name__ == "__main__":
    main()
