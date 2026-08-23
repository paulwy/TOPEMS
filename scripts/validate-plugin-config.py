#!/usr/bin/env python3
"""
Plugin Config Validator (P0-R4 治理)
====================================
以 svc/*/plugin.yaml 为单一信源，校验下游配置一致性：
  1. config/services.yaml 的 port / dependencies / name
  2. config/ports.env 的端口值
  3. svc/*/src/main.rs 的 ServiceConfig.port

用法:
  python3 scripts/validate-plugin-config.py            # 校验并报告
  python3 scripts/validate-plugin-config.py --check    # CI 门禁模式，不一致则 exit 1
  python3 scripts/validate-plugin-config.py --fix      # 自动修正 services.yaml 端口与 plugin.yaml 对齐

退出码:
  0 = 全部一致（或 --fix 模式下已修正）
  1 = --check 模式下存在不一致
"""
import os
import re
import sys
import glob

try:
    import yaml
except ImportError:
    print("ERROR: PyYAML not installed (pip install pyyaml)", file=sys.stderr)
    sys.exit(2)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SVC_DIR = os.path.join(ROOT, "svc")
SERVICES_YAML = os.path.join(ROOT, "config", "services.yaml")
PORTS_ENV = os.path.join(ROOT, "config", "ports.env")

CHECK_ONLY = "--check" in sys.argv
FIX_MODE = "--fix" in sys.argv

# unified-core 是平台基座，所有服务默认依赖，plugin.yaml 不显式声明
IMPLICIT_DEPS = {"unified-core"}

# 端口分配规则（来自 config/services.yaml 头注释）
PORT_RANGES = {
    "core": (8000, 8009),
    "erp": (8010, 8019),
    "collaboration": (8020, 8029),
    "manufacturing": (8030, 8039),
    "supply-chain": (8040, 8049),
    "quality-rd": (8050, 8059),
    "analytics": (8060, 8069),
    "infrastructure": (8070, 8079),
}


def load_plugin_yamls():
    """扫描所有 svc/*/plugin.yaml，返回 {code: plugin_dict}"""
    plugins = {}
    for path in sorted(glob.glob(os.path.join(SVC_DIR, "*", "plugin.yaml"))):
        with open(path, encoding="utf-8") as f:
            data = yaml.safe_load(f)
        if not data:
            continue
        code = data.get("code")
        if not code:
            print(f"WARN: {path} 缺少 code 字段", file=sys.stderr)
            continue
        data["_plugin_path"] = path
        data["_service_dir"] = os.path.basename(os.path.dirname(path))
        # 端口优先取 runtime.port，其次 deployment.port
        port = None
        if "runtime" in data and isinstance(data["runtime"], dict):
            port = data["runtime"].get("port")
        if port is None and "deployment" in data and isinstance(data["deployment"], dict):
            port = data["deployment"].get("port")
        data["_resolved_port"] = port
        plugins[code] = data
    return plugins


def load_services_yaml():
    """加载 config/services.yaml，返回 (services_list, raw_data)"""
    with open(SERVICES_YAML, encoding="utf-8") as f:
        data = yaml.safe_load(f)
    services = []
    for gname, svc_list in (data.get("service_groups") or {}).items():
        for svc in (svc_list or []):
            svc["_group"] = gname
            services.append(svc)
    return services, data


def load_ports_env():
    """加载 config/ports.env，返回 {ENV_VAR: value}"""
    result = {}
    if not os.path.exists(PORTS_ENV):
        return result
    with open(PORTS_ENV, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                k, v = line.split("=", 1)
                result[k.strip()] = v.strip()
    return result


def extract_main_rs_port(service_dir):
    """从 svc/<service_dir>/src/main.rs 提取 ServiceConfig.port"""
    main_rs = os.path.join(SVC_DIR, service_dir, "src", "main.rs")
    if not os.path.exists(main_rs):
        return None
    with open(main_rs, encoding="utf-8") as f:
        content = f.read()
    # 匹配 port: 8031 或 port: Some(8031)
    m = re.search(r"\bport:\s*(?:Some\()?(\d{4,5})\)?", content)
    if m:
        return int(m.group(1))
    return None


def main():
    print("TOPEMS Plugin Config Validator (source: svc/*/plugin.yaml)\n")

    plugins = load_plugin_yamls()
    print(f"  扫描到 {len(plugins)} 个 plugin.yaml")

    services, raw_data = load_services_yaml()
    print(f"  services.yaml 中 {len(services)} 个服务条目")

    ports_env = load_ports_env()
    print(f"  ports.env 中 {len(ports_env)} 个端口变量\n")

    # ====================================================================
    # 校验 1: plugin.yaml.code ↔ services.yaml.name
    # 校验 2: plugin.yaml.runtime.port ↔ services.yaml.port
    # 校验 3: plugin.yaml.dependencies ↔ services.yaml.dependencies
    # ====================================================================
    yaml_by_name = {s["name"]: s for s in services if "name" in s}
    diffs = []
    fixes_applied = []

    for code, plugin in sorted(plugins.items()):
        plugin_port = plugin.get("_resolved_port")
        plugin_deps = plugin.get("dependencies") or []
        if not isinstance(plugin_deps, list):
            plugin_deps = []
        # 加入隐式依赖，使两边的比较基准一致
        plugin_deps_set = set(plugin_deps) | IMPLICIT_DEPS

        # services.yaml 中是否记录了此服务
        svc = yaml_by_name.get(code)
        if svc is None:
            # 部分服务名映射：unified-core 在 services.yaml 中以 "iam" 名义出现
            if code == "unified-core":
                svc = yaml_by_name.get("iam")
            if svc is None:
                # 不在 services.yaml 中（如 plugin-registry 等可能未记录）
                continue

        # 端口校验
        yaml_port = svc.get("port")
        if plugin_port is not None and yaml_port is not None and plugin_port != yaml_port:
            diffs.append(
                f"  PORT  {code}: plugin.yaml={plugin_port} services.yaml={yaml_port}"
            )
            if FIX_MODE:
                svc["port"] = plugin_port
                fixes_applied.append(f"port {code}: {yaml_port} -> {plugin_port}")

        # 依赖校验（统一加入隐式依赖后比较）
        yaml_deps = svc.get("dependencies") or []
        if not isinstance(yaml_deps, list):
            yaml_deps = []
        yaml_deps_set = set(yaml_deps) | IMPLICIT_DEPS

        if plugin_deps_set != yaml_deps_set:
            only_plugin = plugin_deps_set - yaml_deps_set
            only_yaml = yaml_deps_set - plugin_deps_set
            detail = []
            if only_plugin:
                detail.append(f"only in plugin.yaml: {sorted(only_plugin)}")
            if only_yaml:
                detail.append(f"only in services.yaml: {sorted(only_yaml)}")
            diffs.append(f"  DEPS  {code}: {'; '.join(detail)}")
            if FIX_MODE:
                # 修正时去掉隐式依赖，保持 services.yaml 简洁
                fixed = sorted(plugin_deps_set - IMPLICIT_DEPS)
                svc["dependencies"] = fixed
                fixes_applied.append(
                    f"deps {code}: {sorted(yaml_deps_set - IMPLICIT_DEPS)} -> {fixed}"
                )

    # ====================================================================
    # 校验 4: plugin.yaml.runtime.port ↔ ports.env[ENV_VAR]
    # ====================================================================
    for code, plugin in sorted(plugins.items()):
        plugin_port = plugin.get("_resolved_port")
        if plugin_port is None:
            continue

        # 推导 env_var：通常 CODE_PORT（大写，连字符转下划线）
        env_var = code.upper().replace("-", "_") + "_PORT"
        env_val = ports_env.get(env_var)
        if env_val is None:
            # iam 用 CORE_PORT；其他特殊映射
            special = {
                "unified-core": "CORE_PORT",
                "bi": "BI_PORT",
                "master-data": "MASTER_DATA_PORT",
            }
            env_var = special.get(code, env_var)
            env_val = ports_env.get(env_var)

        if env_val is not None and str(plugin_port) != env_val:
            diffs.append(
                f"  PORT  {code}: plugin.yaml={plugin_port} ports.env[{env_var}]={env_val}"
            )

    # ====================================================================
    # 校验 5: plugin.yaml.runtime.port ↔ svc/<dir>/src/main.rs ServiceConfig.port
    # ====================================================================
    for code, plugin in sorted(plugins.items()):
        plugin_port = plugin.get("_resolved_port")
        if plugin_port is None:
            continue
        service_dir = plugin.get("_service_dir")
        main_port = extract_main_rs_port(service_dir)
        if main_port is not None and main_port != plugin_port:
            diffs.append(
                f"  PORT  {code}: plugin.yaml={plugin_port} main.rs={main_port}"
            )

    # ====================================================================
    # 报告与处理
    # ====================================================================
    if diffs:
        print("发现不一致:")
        for d in diffs:
            print(d)
        print(f"\n总计 {len(diffs)} 处不一致")

        if FIX_MODE and fixes_applied:
            # 写回 services.yaml
            with open(SERVICES_YAML, "w", encoding="utf-8") as f:
                yaml.safe_dump(raw_data, f, allow_unicode=True, sort_keys=False, width=100)
            print(f"\n已应用 {len(fixes_applied)} 处修正到 services.yaml:")
            for fix in fixes_applied:
                print(f"  {fix}")
        elif CHECK_ONLY:
            print("\n请修正上述不一致，或运行: python3 scripts/validate-plugin-config.py --fix")
            sys.exit(1)
    else:
        print("✓ plugin.yaml 与 services.yaml / ports.env / main.rs 全部一致")

    # ====================================================================
    # 端口范围校验（warn 级别，不阻塞）
    # ====================================================================
    range_warnings = []
    for code, plugin in sorted(plugins.items()):
        plugin_port = plugin.get("_resolved_port")
        if plugin_port is None:
            continue
        for domain, (lo, hi) in PORT_RANGES.items():
            if lo <= plugin_port <= hi:
                break
        else:
            # 不在任何已知范围
            if 8080 <= plugin_port <= 8096:
                pass  # 扩展服务范围，允许
            elif plugin_port in (5432, 6379, 11434, 3000):
                pass  # 基础设施端口
            else:
                range_warnings.append(f"  {code}: port={plugin_port} 不在已知业务范围")

    if range_warnings:
        print("\n端口范围警告（仅提示，不阻塞）:")
        for w in range_warnings:
            print(w)


if __name__ == "__main__":
    main()
