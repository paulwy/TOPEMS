#!/usr/bin/env python3
"""graphql_schema.rs 拆分重做脚本 v2（确定性，基于标题锚点）：
批次3收尾（删残留区+测试include）+ 批次4（6个新模块）。
v2 修正：runtime header 一次放对 imports（无重复 LruCache）、entities 引用 runtime。
"""
import re

SCHEMA = 'svc/portal/src/modules/graphql_schema.rs'
MODRS = 'svc/portal/src/modules/mod.rs'

def read(p):
    return open(p).read().split('\n')

def write(p, lines):
    open(p, 'w').write('\n'.join(lines) + '\n')

def find(lines, pat, start=0):
    for i in range(start, len(lines)):
        if pat in lines[i]:
            return i
    raise SystemExit(f'ANCHOR NOT FOUND: {pat}')

lines = read(SCHEMA)

def extract_and_del(anchor_start, anchor_end, outfile, header):
    i0 = find(lines, anchor_start)
    i1 = find(lines, anchor_end, i0)
    content = '\n'.join(lines[i0:i1]).strip('\n')
    write(outfile, (header + content + '\n').split('\n'))
    del lines[i0:i1]
    return i0

# 1. entities
extract_and_del('V37.0 Phase 7: Apollo Federation v2 实体类型', 'V40.0 Phase 10',
    'svc/portal/src/modules/graphql_entities.rs',
    '// ==================== V37.0 Phase 7: Apollo Federation v2 实体类型 ====================\n'
    '// 拆分自 graphql_schema.rs：Portal BFF 联邦网关跨服务实体类型 + __resolveReference。\n\n'
    'use async_graphql::{ComplexObject, Context, SimpleObject};\n\n'
    'use crate::modules::graphql_federation_runtime::record_cross_service_join;\n'
    'use crate::modules::graphql_helpers::service_auth_get;\n\n')

# 2. runtime (V40.0)
extract_and_del('V40.0 Phase 10', '多频道事件驱动 Subscription',
    'svc/portal/src/modules/graphql_federation_runtime.rs',
    '// ==================== V40.0 Phase 10: Federation 网关查询优化 ====================\n'
    '// 拆分自 graphql_schema.rs：实体批量缓存 / 查询计划缓存 / 联邦统计 / 批量解析运行时。\n\n'
    'use async_graphql::SimpleObject;\n'
    'use chrono::{DateTime, Utc};\n'
    'use futures_util::future::join_all;\n'
    'use std::collections::HashMap;\n'
    'use std::sync::{Arc, Mutex};\n\n'
    'use crate::modules::graphql_cache::LruCache;\n'
    'use crate::modules::graphql_helpers::{service_auth_get, service_request, service_url, FEDERATION_READ_PERMS};\n\n')

# 3. event_bus
extract_and_del('多频道事件驱动 Subscription', 'Query 根类型',
    'svc/portal/src/modules/graphql_event_bus.rs',
    '// ==================== V39.0 Phase 9: 多频道事件驱动 Subscription ====================\n'
    '// 拆分自 graphql_schema.rs：SubscriptionChannel + 事件 payload + 内存 EventBus + 全局单例。\n\n'
    'use std::collections::HashMap;\n'
    'use std::sync::Arc;\n\n'
    'use async_graphql::SimpleObject;\n'
    'use serde::{Deserialize, Serialize};\n'
    'use tokio::sync::broadcast;\n\n')

# 4. federation_sdl
extract_and_del('Federation v2 辅助函数', 'Persisted Queries 生产化',
    'svc/portal/src/modules/graphql_federation_sdl.rs',
    '// ==================== V37.0 Phase 7: Apollo Federation v2 辅助函数 ====================\n'
    '// 拆分自 graphql_schema.rs：联邦 Schema SDL 组合 + 实体解析辅助。\n\n'
    'use crate::modules::graphql_helpers::{service_auth_get, FEDERATION_READ_PERMS};\n\n')
# pub-ify sdl fns
sdl = read('svc/portal/src/modules/graphql_federation_sdl.rs')
sdl_txt = '\n'.join(sdl)
sdl_txt = re.sub(r'\nfn (compose_federation_sdl|service_sdl_fragment|service_for_typename)',
                 r'\npub fn \1', sdl_txt)
sdl_txt = sdl_txt.replace('\nasync fn resolve_federated_entity', '\npub async fn resolve_federated_entity')
write('svc/portal/src/modules/graphql_federation_sdl.rs', sdl_txt.split('\n'))

# 5. persisted+audit+apq
extract_and_del('Persisted Queries 生产化', 'Redis PubSub 后端',
    'svc/portal/src/modules/graphql_persisted_queries.rs',
    '// ==================== V39.0 Track E: GraphQL Persisted Queries 生产化 ====================\n'
    '// 拆分自 graphql_schema.rs：查询白名单 + 查询审计日志 + APQ 扩展占位。\n\n'
    'use std::collections::HashSet;\n'
    'use std::sync::RwLock;\n\n'
    'use sha2::{Digest, Sha256};\n\n'
    'use crate::modules::graphql_monitoring::{\n'
    '    end_trace, record_query_metric, start_span, start_trace, SpanType,\n'
    '};\n\n')

# 6. redis_pubsub
extract_and_del('Redis PubSub 后端', 'Schema 构建',
    'svc/portal/src/modules/graphql_redis_pubsub.rs',
    '// ==================== V39.0 Phase 9: Redis PubSub 后端 + 降级模式 ====================\n'
    '// 拆分自 graphql_schema.rs：Redis 事件监听 + 演示事件模拟器（降级模式）。\n\n'
    'use std::sync::Arc;\n\n'
    'use crate::modules::graphql_event_bus::{\n'
    '    EventBus, MasterDataEventGql, NotificationEventGql, OrderStatusEventGql,\n'
    '    SubscriptionChannel, WorkflowTaskEventGql,\n'
    '};\n\n')

# 7. residual region: static SECURITY_EVENTS .. pub fn build_schema
i_se = find(lines, 'static SECURITY_EVENTS')
i_bs = find(lines, 'pub fn build_schema')
del lines[i_se:i_bs]

# 8. tests include-ify
i_mt = find(lines, 'mod tests {')
test_end = len(lines) - 1
while test_end > 0 and not lines[test_end].strip():
    test_end -= 1
assert lines[test_end].strip() == '}', f'expected }} got {lines[test_end]!r}'
write('svc/portal/src/modules/graphql_schema_tests.rs', lines[i_mt + 1:test_end])
tail = ['', '#[cfg(test)]', '#[allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]',
        'mod tests {', '    include!("graphql_schema_tests.rs");', '}']
lines = lines[:i_mt - 2] + tail

# 9. pub use inserts
def insert_after(anchor, newline):
    idx = find(lines, anchor)
    lines.insert(idx + 1, newline)

insert_after('pub use crate::modules::graphql_edge_computing::*;', 'pub use crate::modules::graphql_entities::*;')
insert_after('pub use crate::modules::graphql_edge_v2::*;', 'pub use crate::modules::graphql_event_bus::*;')
insert_after('pub use crate::modules::graphql_federation_v4::*;', 'pub use crate::modules::graphql_federation_runtime::*;')
insert_after('pub use crate::modules::graphql_federation_v4::*;', 'pub use crate::modules::graphql_federation_sdl::*;')
insert_after('pub use crate::modules::graphql_monitoring::*;', 'pub use crate::modules::graphql_persisted_queries::*;')
insert_after('pub use crate::modules::graphql_realtime_stream::*;', 'pub use crate::modules::graphql_redis_pubsub::*;')

write(SCHEMA, lines)

# 10. mod.rs
modlines = read(MODRS)
new_mods = ['graphql_entities', 'graphql_event_bus', 'graphql_federation_runtime',
            'graphql_federation_sdl', 'graphql_persisted_queries', 'graphql_redis_pubsub']
for m in new_mods:
    decl = f'pub mod {m};'
    if any(decl in l for l in modlines):
        continue
    anchor = None
    for i, l in enumerate(modlines):
        if l.startswith('pub mod graphql_') and m < l.split(';')[0].split()[-1]:
            anchor = i
            break
    if anchor is None:
        for i, l in enumerate(modlines):
            if l.startswith('pub mod graphql_schema'):
                anchor = i
                break
    modlines.insert(anchor, decl)
write(MODRS, modlines)

print('OK main lines:', len(lines))
for f in ['graphql_entities', 'graphql_federation_runtime', 'graphql_event_bus',
          'graphql_federation_sdl', 'graphql_persisted_queries', 'graphql_redis_pubsub',
          'graphql_schema_tests']:
    print(f'{f}.rs:', len(read(f'svc/portal/src/modules/{f}.rs')))
