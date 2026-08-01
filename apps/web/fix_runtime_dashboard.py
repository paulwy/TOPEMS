#!/usr/bin/env python3
"""批量修复 RuntimeDashboard.tsx 中所有损坏的 t('microfrontend.runtime.xxx') 模式。
由于文件没有 useTranslation hook，所有 t() 调用均无效，替换为中文默认值。
"""
import re

FILE = 'src/microfrontend/runtime/RuntimeDashboard.tsx'

# i18n key → 中文默认值映射
KEY_MAP = {
    'microfrontend.runtime.title': '微前端运行时',
    'microfrontend.runtime.dynamicLoading': '动态加载',
    'microfrontend.runtime.crossFramework': '跨框架',
    'microfrontend.runtime.designSystem': '设计系统',
    'microfrontend.runtime.lifecycle': '生命周期',
    'microfrontend.runtime.loadAction': '加载',
    'microfrontend.runtime.loaded': '已加载',
    'microfrontend.runtime.loadFailed': '加载失败',
    'microfrontend.runtime.unloadAction': '卸载',
    'microfrontend.runtime.reloadAction': '重新加载',
    'microfrontend.runtime.register': '注册',
    'microfrontend.runtime.registeredModules': '已注册模块',
    'microfrontend.runtime.moduleList': '模块列表',
    'microfrontend.runtime.registerNewModule': '注册新模块',
    'microfrontend.runtime.moduleId': '模块ID',
    'microfrontend.runtime.remoteUrl': '远程URL',
    'microfrontend.runtime.name': '名称',
    'microfrontend.runtime.status': '状态',
    'microfrontend.runtime.duration': '耗时',
    'microfrontend.runtime.retry': '重试',
    'microfrontend.runtime.error': '错误',
    'microfrontend.runtime.mounted': '已挂载',
    'microfrontend.runtime.concurrentPending': '并发等待',
    'microfrontend.runtime.mountComponent': '挂载组件',
    'microfrontend.runtime.frameworkType': '框架类型',
    'microfrontend.runtime.framework': '框架',
    'microfrontend.runtime.mountHint': '挂载提示',
    'microfrontend.runtime.propsCount': '属性数',
    'microfrontend.runtime.mountTime': '挂载时间',
    'microfrontend.runtime.designTokens': '设计令牌',
    'microfrontend.runtime.cssVar': 'CSS变量',
    'microfrontend.runtime.themeControl': '主题控制',
    'microfrontend.runtime.switchLight': '切换浅色',
    'microfrontend.runtime.switchDark': '切换深色',
    'microfrontend.runtime.primaryText': '主要文本',
    'microfrontend.runtime.secondaryText': '次要文本',
    'microfrontend.runtime.disabledText': '禁用文本',
    'microfrontend.runtime.primaryColor': '主色',
    'microfrontend.runtime.secondaryColor': '次色',
    'microfrontend.runtime.category': '分类',
    'microfrontend.runtime.type': '类型',
    'microfrontend.runtime.preview': '预览',
    'microfrontend.runtime.totalModules': '总模块数',
    'microfrontend.runtime.totalEvents': '总事件数',
    'microfrontend.runtime.noModule': '暂无模块',
    'microfrontend.runtime.clearCache': '清除缓存',
}

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

original = content
total_replacements = 0
unmatched_keys = set()

# 按 key 长度降序排列，避免短 key 部分匹配长 key
sorted_keys = sorted(KEY_MAP.keys(), key=len, reverse=True)

for key in sorted_keys:
    pattern = "t('" + key + "')"
    count = content.count(pattern)
    if count > 0:
        content = content.replace(pattern, KEY_MAP[key])
        total_replacements += count
        print(f"  {key} → {KEY_MAP[key]}: {count} 处")

# 检查是否还有残留的 t('microfrontend.runtime.xxx') 模式
remaining = re.findall(r"t\('microfrontend\.runtime\.[^']+'?\)", content)
if remaining:
    print(f"\n⚠️ 残留未匹配的 t() 调用:")
    for r in set(remaining):
        print(f"  {r}")
    unmatched_keys = set(remaining)

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\n✅ 总计替换: {total_replacements} 处")
print(f"✅ 文件已写入: {FILE}")
if unmatched_keys:
    print(f"⚠️ 残留未匹配: {len(unmatched_keys)} 种")
