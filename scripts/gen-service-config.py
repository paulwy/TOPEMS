#!/usr/bin/env python3
"""
Service Config Generator - config/services.yaml single source of truth
Generates: config/ports.env, scripts/services.conf, deploy/docker/.env
Usage: python3 scripts/gen-service-config.py [--check]
"""
import os, re, sys, datetime
try:
    import yaml
except ImportError:
    print("ERROR: PyYAML not installed", file=sys.stderr); sys.exit(1)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SERVICES_YAML = os.path.join(ROOT, "config", "services.yaml")
PORTS_ENV = os.path.join(ROOT, "config", "ports.env")
SERVICES_CONF = os.path.join(ROOT, "scripts", "services.conf")
DOCKER_ENV = os.path.join(ROOT, "deploy", "docker", ".env")
CARGO_TOML = os.path.join(ROOT, "Cargo.toml")
CHECK_ONLY = "--check" in sys.argv

def load_services():
    with open(SERVICES_YAML, encoding="utf-8") as f:
        data = yaml.safe_load(f)
    services = []
    for gname, svc_list in (data.get("service_groups") or {}).items():
        for svc in (svc_list or []):
            svc["group"] = gname
            svc["service_dir"] = svc.get("service_dir") or svc["name"]
            svc["binary_name"] = f"topems-{svc['service_dir']}"
            services.append(svc)
    for vsvc in (data.get("virtual_services") or []):
        vsvc["service_dir"] = vsvc.get("service_dir") or vsvc["name"]
        vsvc["binary_name"] = f"topems-{vsvc['service_dir']}"
        vsvc["virtual"] = True
        services.append(vsvc)
    return services, data.get("special_ports") or {}

def gen_ports(services, sp):
    d = datetime.date.today().isoformat()
    L = [f"# TOPEMS ports (generated from config/services.yaml)", f"# Updated: {d}", ""]
    groups = {}
    for s in services: groups.setdefault(s.get("group","other"),[]).append(s)
    core = [s for s in services if s.get("group")=="core" or s.get("virtual")]
    if core:
        L.append("# Core (8000-8009)")
        for s in core: L.append(f"{s['env_var']}={s['port']}")
        L.append("")
    gl = [("erp","ERP (8010-8019)"),("collaboration","Collab (8020-8029)"),
          ("manufacturing","Mfg (8030-8039)"),("supply-chain","SCM (8040-8049)"),
          ("quality-rd","Q/RD (8050-8059)"),("analytics","Analytics (8060-8069)"),
          ("infrastructure","Infra (8070-8079)"),("master-data","Master (8090)"),
          ("extension","Extension (8082-8096)")]
    for gn,lb in gl:
        sl = groups.get(gn,[])
        if not sl: continue
        L.append(f"# {lb}")
        for s in sl: L.append(f"{s['env_var']}={s['port']}")
        L.append("")
    if sp:
        L.append("# Infrastructure")
        for k,v in sp.items():
            ev = v.get("env_var",""); p = v.get("port","")
            if ev and p: L.append(f"{ev}={p}")
        L.append("")
    return "\n".join(L)

def gen_conf(services):
    d = datetime.date.today().isoformat()
    L = [f"# TOPEMS services.conf (generated from config/services.yaml)", f"# Updated: {d}", ""]
    real = [s for s in services if not s.get("virtual")]
    core = [s for s in real if s.get("group")=="core"]
    others = [s for s in real if s.get("group")!="core"]
    if core:
        L.append("# Core (start first)")
        for s in core: L.append(f"{s['name']:<12} {'svc/'+s['service_dir']:<22} {s['binary_name']:<26} {s['port']}")
        L.append("")
    gl = [("erp","ERP"),("collaboration","Collab"),("manufacturing","Mfg"),
          ("supply-chain","SCM"),("quality-rd","Q/RD"),("analytics","Analytics"),
          ("infrastructure","Infra"),("master-data","Master"),("extension","Extension")]
    for gn,lb in gl:
        sl = [s for s in others if s.get("group")==gn]
        if not sl: continue
        L.append(f"# {lb}")
        for s in sl: L.append(f"{s['name']:<12} {'svc/'+s['service_dir']:<22} {s['binary_name']:<26} {s['port']}")
        L.append("")
    L.append("CORE_SERVICES=iam")
    return "\n".join(L)

def gen_docker_env(services, sp):
    d = datetime.date.today().isoformat()
    L = [f"# TOPEMS Docker Compose 端口变量 (由 scripts/gen-service-config.py 从 config/services.yaml 生成)",
         f"# 此文件已在本目录 .gitignore 中忽略，请勿提交。",
         f"# 单一信源: config/services.yaml",
         f"# 最后更新: {d}", ""]
    L.append("# 业务服务端口")
    real = [s for s in services if not s.get("virtual")]
    for s in real:
        L.append(f"{s['env_var']}={s['port']}")
    L.append("")
    if sp:
        L.append("# 基础设施与前端端口")
        for k,v in sp.items():
            ev = v.get("env_var",""); p = v.get("port","")
            if ev and p: L.append(f"{ev}={p}")
        L.append("")
    return "\n".join(L)

def validate_cargo(services):
    with open(CARGO_TOML, encoding="utf-8") as f: t = f.read()
    dirs = re.findall(r'"svc/([^"]+)"', t)
    yd = {s["service_dir"] for s in services}
    cs = set(dirs)
    mic = [d for d in yd if d not in cs and d!="unified-core"]
    miy = [d for d in cs if d not in yd]
    return mic, miy, len(dirs), len(yd)

def wic(target, content):
    rel = os.path.relpath(target, ROOT)
    if not os.path.exists(target):
        open(target,"w").write(content+"\n"); print(f"  created: {rel}"); return True
    old = open(target, encoding="utf-8").read()
    if old.strip()==content.strip(): print(f"  no change: {rel}"); return False
    open(target,"w",encoding="utf-8").write(content+"\n"); print(f"  updated: {rel}"); return True

def main():
    print("TOPEMS Service Config Generator (source: config/services.yaml)\n")
    services, sp = load_services()
    print(f"  loaded {len(services)} services\n")
    mic, miy, cc, yc = validate_cargo(services)
    print("Cargo.toml validation:")
    print(f"  Cargo.toml svc/*: {cc}, services.yaml: {yc}")
    if mic: print(f"  WARN yaml has but cargo missing: {', '.join(mic)}")
    if miy: print(f"  WARN cargo has but yaml missing: {', '.join(miy)}")
    if not mic and not miy: print("  OK Cargo.toml matches services.yaml")
    print("")
    if CHECK_ONLY:
        hd = False
        np_ = gen_ports(services, sp)
        if not os.path.exists(PORTS_ENV) or open(PORTS_ENV,encoding="utf-8").read().strip()!=np_.strip():
            print(f"DIFF: {os.path.relpath(PORTS_ENV,ROOT)}"); hd=True
        nc = gen_conf(services)
        if not os.path.exists(SERVICES_CONF) or open(SERVICES_CONF,encoding="utf-8").read().strip()!=nc.strip():
            print(f"DIFF: {os.path.relpath(SERVICES_CONF,ROOT)}"); hd=True
        nd = gen_docker_env(services, sp)
        if not os.path.exists(DOCKER_ENV) or open(DOCKER_ENV,encoding="utf-8").read().strip()!=nd.strip():
            print(f"DIFF: {os.path.relpath(DOCKER_ENV,ROOT)}"); hd=True
        if hd: print("\nRun: python3 scripts/gen-service-config.py"); sys.exit(1)
        print("OK all downstream configs match services.yaml"); sys.exit(0)
    print("Generating config/ports.env:")
    wic(PORTS_ENV, gen_ports(services, sp))
    print("\nGenerating scripts/services.conf:")
    wic(SERVICES_CONF, gen_conf(services))
    print("\nGenerating deploy/docker/.env:")
    wic(DOCKER_ENV, gen_docker_env(services, sp))
    print("\nDone")

if __name__=="__main__": main()
