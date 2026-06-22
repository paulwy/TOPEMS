import os

services = [
    {
        'name': 'qms',
        'port': 8050,
        'description': 'TOPEMS-QMS 质量管理系统',
        'base_path': '/api/qa',
        'dependencies': ['unified-core', 'erp', 'mes'],
        'permissions': [
            ('qms:quality:inspection:read', '查看质量检验'),
            ('qms:quality:inspection:write', '管理质量检验'),
            ('qms:quality:issue:read', '查看质量问题'),
            ('qms:quality:issue:write', '管理质量问题'),
            ('qms:quality:standard:read', '查看质量标准'),
            ('qms:quality:standard:write', '管理质量标准'),
            ('qms:quality:dashboard:read', '查看质量仪表盘'),
        ]
    },
    {
        'name': 'lims',
        'port': 8051,
        'description': 'TOPEMS-LIMS 实验室信息管理系统',
        'base_path': '/api/qa',
        'dependencies': ['unified-core', 'qms'],
        'permissions': [
            ('lims:sample:read', '查看样品'),
            ('lims:sample:write', '管理样品'),
            ('lims:task:read', '查看检验任务'),
            ('lims:task:write', '管理检验任务'),
            ('lims:record:read', '查看检验记录'),
            ('lims:instrument:read', '查看仪器设备'),
            ('lims:instrument:write', '管理仪器设备'),
            ('lims:reagent:read', '查看试剂'),
            ('lims:reagent:write', '管理试剂'),
        ]
    },
    {
        'name': 'ehs',
        'port': 8052,
        'description': 'TOPEMS-EHS 环境健康安全系统',
        'base_path': '/api/qa',
        'dependencies': ['unified-core', 'mes', 'qms'],
        'permissions': [
            ('ehs:risk:read', '查看风险评估'),
            ('ehs:risk:write', '管理风险评估'),
            ('ehs:safety:read', '查看安全检查'),
            ('ehs:safety:write', '管理安全检查'),
            ('ehs:accident:read', '查看事故记录'),
            ('ehs:accident:write', '管理事故记录'),
            ('ehs:environment:read', '查看环境记录'),
            ('ehs:health:read', '查看健康记录'),
            ('ehs:training:read', '查看培训记录'),
            ('ehs:training:write', '管理培训记录'),
        ]
    },
    {
        'name': 'bi',
        'port': 8060,
        'description': 'TOPEMS-BI 商业智能系统',
        'base_path': '/api/bi',
        'dependencies': ['unified-core'],
        'permissions': [
            ('bi:analysis:read', '查看分析'),
            ('bi:analysis:write', '管理分析'),
            ('bi:dashboard:read', '查看仪表盘'),
            ('bi:dashboard:write', '管理仪表盘'),
            ('bi:datasource:read', '查看数据源'),
            ('bi:datasource:write', '管理数据源'),
            ('bi:visualization:read', '查看可视化'),
            ('bi:visualization:write', '管理可视化'),
            ('bi:widget:read', '查看组件'),
            ('bi:widget:write', '管理组件'),
        ]
    },
    {
        'name': 'report',
        'port': 8061,
        'description': 'TOPEMS-Report 报表服务',
        'base_path': '/api/report',
        'dependencies': ['unified-core'],
        'permissions': [
            ('report:report:read', '查看报表'),
            ('report:report:write', '管理报表'),
            ('report:template:read', '查看模板'),
            ('report:template:write', '管理模板'),
            ('report:schedule:read', '查看调度'),
            ('report:schedule:write', '管理调度'),
        ]
    },
]

for svc in services:
    svc_dir = f'/Users/xingzhai/TOPEMS/svc/{svc["name"]}'
    
    if not os.path.exists(svc_dir):
        os.makedirs(os.path.join(svc_dir, 'src', 'modules', svc['name']))
    
    cargo_content = f'''[package]
name = "topems-{svc["name"]}"
version.workspace = true
edition.workspace = true
authors.workspace = true
description = "{svc["description"]}"

[dependencies]
axum.workspace = true
tokio.workspace = true
serde.workspace = true
serde_json.workspace = true
uuid.workspace = true
chrono.workspace = true
dotenv.workspace = true
tracing.workspace = true
tracing-subscriber.workspace = true
tower-http.workspace = true
thiserror.workspace = true
sqlx.workspace = true
topems-shared = {{ path = "../../lib" }}
axum-prometheus.workspace = true
prometheus.workspace = true
anyhow.workspace = true
reqwest.workspace = true

[[bin]]
name = "topems-{svc["name"]}"
path = "src/main.rs"
'''
    with open(os.path.join(svc_dir, 'Cargo.toml'), 'w') as f:
        f.write(cargo_content)
    print(f'Created {svc["name"]}/Cargo.toml')
    
    permissions_str = '\n'.join([
        f'  - code: {p[0]}\n    name: {p[1]}\n    description: {p[1]}' 
        for p in svc['permissions']
    ])
    dependencies_str = '\n  - '.join(svc['dependencies'])
    
    plugin_content = f'''code: {svc["name"]}
name: {svc["description"].replace("TOPEMS-", "")}
version: 1.0.0
description: {svc["description"]}
author: TOPEMS
category: Business
plugin_type: business

runtime:
  port: {svc["port"]}
  health_endpoint: /health
  base_path: {svc["base_path"]}

permissions:
{permissions_str}

dependencies:
  - {dependencies_str}
'''
    with open(os.path.join(svc_dir, 'plugin.yaml'), 'w') as f:
        f.write(plugin_content)
    print(f'Created {svc["name"]}/plugin.yaml')
    
    docker_content = f'''FROM rust:1.78-alpine AS builder

WORKDIR /app

RUN apk add --no-cache musl-dev openssl-dev

COPY Cargo.toml Cargo.lock ./
COPY src ./src

RUN cargo build --release

FROM alpine:3.19

RUN apk add --no-cache libssl3 ca-certificates

COPY --from=builder /app/target/release/topems-{svc["name"]} /usr/local/bin/topems-{svc["name"]}

EXPOSE {svc["port"]}

CMD ["topems-{svc["name"]}"]
'''
    with open(os.path.join(svc_dir, 'Dockerfile'), 'w') as f:
        f.write(docker_content)
    print(f'Created {svc["name"]}/Dockerfile')

print('\nAll service configurations created successfully!')
