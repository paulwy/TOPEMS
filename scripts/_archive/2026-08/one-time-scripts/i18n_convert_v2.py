#!/usr/bin/env python3
"""
Enhanced i18n Conversion Script for BFF, Designer, GIS components.
Handles:
- JSDoc multi-line comments translation to English
- Single-line // comments
- String literal replacement with t() / i18n.t()
- JSX text content replacement
- types.ts: preserve values, translate comments only
- useDesigner.ts: preserve values, translate comments only
- Translation keys generation
"""

import re
import json
import os
import hashlib
from collections import defaultdict

BASE_DIR = "/Users/air/TOPEMS/apps/web/src"
ZH_PATH = f"{BASE_DIR}/i18n/locales/zh.json"
EN_PATH = f"{BASE_DIR}/i18n/locales/en.json"

TARGET_FILES = [
    # BFF components
    "components/bff/ProgressiveHydration.tsx",
    "components/bff/BffErrorBoundary.tsx",
    "components/bff/BffFallback.tsx",
    "components/bff/StreamingBoundary.tsx",
    "components/bff/PerformancePanel.tsx",
    "components/bff/ABTestPanel.tsx",
    "components/bff/BffDetailPage.tsx",
    "components/bff/BffDataProvider.tsx",
    "components/bff/RealtimeIndicator.tsx",
    "components/bff/BffDataTable.tsx",
    "components/bff/index.ts",
    # Designer components
    "components/designer/types.ts",
    "components/designer/useDesigner.ts",
    "components/designer/DesignerPage.tsx",
    "components/designer/ComponentPalette.tsx",
    "components/designer/PropertyPanel.tsx",
    "components/designer/DesignCanvas.tsx",
    "components/designer/ComponentTree.tsx",
    # GIS components
    "components/gis/modules/MapModule/MapView.tsx",
    "components/gis/modules/MapModule/OfflineManager.tsx",
    "components/gis/modules/MapModule/useOfflineTiles.ts",
    "components/gis/modules/MapModule/tileImporter.ts",
    "components/gis/modules/MapModule/ToolPanel.tsx",
    "components/gis/modules/Map3DModule/Map3DView.tsx",
    "components/gis/MapView/components/Toolbar.tsx",
    "components/gis/MapView/components/DetailsPanel.tsx",
    "components/gis/MapView/components/MapLayers.tsx",
    "components/gis/MapView/components/MapEventHandler.tsx",
    "components/gis/modules/EvidenceModule/EvidencePanel.tsx",
    "components/gis/modules/EvidenceModule/VideoCapture.tsx",
    "components/gis/modules/EvidenceModule/AudioCapture.tsx",
    "components/gis/modules/EvidenceModule/PhotoCapture.tsx",
    "components/gis/AmapLayer.tsx",
    "components/gis/HeatmapLayer.tsx",
    "components/gis/Map3DView.tsx",
    "components/gis/utils/performance.ts",
    "components/gis/modules/TrackModule/TrackPlayer.tsx",
    "components/gis/modules/TrackModule/TrackPanel.tsx",
    "components/gis/DeviceTrackPanel.tsx",
    "components/gis/modules/Map3DModule/index.ts",
    "components/gis/modules/HeatmapModule/HeatmapLayer.tsx",
    "components/gis/modules/shared/GisContext.tsx",
]

CHINESE_COMMENT_MAP = {
    "渐进式水合组件": "Progressive Hydration Component",
    "实现 React 渐进式水合": "Implements React Progressive Hydration",
    "延迟水合": "Deferred Hydration",
    "分块水合": "Chunked Hydration",
    "水合状态追踪": "Hydration Status Tracking",
    "交互优先": "Interaction First",
    "原理": "Principle",
    "服务端渲染的 HTML 在客户端水合时": "Server-rendered HTML during client hydration",
    "导致首屏交互延迟": "Causes initial interaction delay",
    "将低优先级组件的水合推迟到浏览器空闲时": "Defers low-priority component hydration to browser idle time",
    "并在用户交互时立即触发水合": "Triggers hydration immediately on user interaction",
    "保证交互响应性": "Ensures interaction responsiveness",
    "立即水合": "Immediate Hydration",
    "空闲时水合": "Hydrate When Idle",
    "可见时水合": "Hydrate When Visible",
    "类型定义": "Type Definitions",
    "水合优先级": "Hydration Priority",
    "水合触发时机": "Hydration Trigger",
    "水合状态": "Hydration Status",
    "优先级": "Priority",
    "触发时机": "Trigger Timing",
    "组件标识": "Component Identifier",
    "用于追踪": "Used for tracking",
    "空闲等待超时": "Idle Timeout",
    "超时后强制水合": "Force hydration after timeout",
    "占位元素": "Placeholder Element",
    "水合前展示": "Display before hydration",
    "水合完成回调": "Hydration Complete Callback",
    "水合状态追踪": "Hydration Status Tracking",
    "水合记录": "Hydration Record",
    "记录水合状态": "Record Hydration Status",
    "供 PerformancePanel 统计": "For PerformancePanel statistics",
    "获取水合统计": "Get Hydration Statistics",
    "订阅水合统计变化": "Subscribe to Hydration Statistics Changes",
    "取消订阅函数": "Unsubscribe Function",
    "降级": "Fallback",
    "使用 setTimeout 模拟": "Simulate using setTimeout",
    "渐进式水合组件": "Progressive Hydration Component",
    "根据优先级与触发时机决定何时水合子组件": "Determines when to hydrate child components based on priority and trigger",
    "立即水合（同步）": "Immediate Hydration (Synchronous)",
    "浏览器空闲时水合": "Hydrate when browser is idle",
    "视口可见时水合": "Hydrate when visible in viewport",
    "用户交互时水合": "Hydrate on user interaction",
    "水合前展示 SSR HTML": "Display SSR HTML before hydration",
    "避免重复渲染": "Avoid duplicate rendering",
    "水合后挂载真实组件": "Mount real component after hydration",
    "任何交互事件都会立即触发水合": "Any interaction event triggers immediate hydration",
    "保证用户体验": "Ensures user experience",
    "开始时间": "Start Time",
    "使用 microtask 触发实际水合": "Use microtask to trigger actual hydration",
    "确保状态更新顺序": "Ensure state update order",
    "水合完成": "Hydration Complete",
    "根据触发时机注册水合逻辑": "Register hydration logic by trigger",
    "交互优先": "Interaction First",
    "任何用户交互立即触发水合": "Any user interaction triggers immediate hydration",
    "由交互触发水合": "Hydration triggered by interaction",
    "空闲超时": "Idle Timeout",
    "强制水合": "Force Hydration",
    "同时注册交互优先": "Also register interaction-first",
    "低优先级组件交互时也要立即响应": "Respond immediately when low-priority components interact",
    "可见时水合": "Hydrate When Visible",
    "水合前": "Before Hydration",
    "展示占位": "Show Placeholder",
    "通过 dangerouslySetInnerHTML 保留": "Preserve via dangerouslySetInnerHTML",
    "在 Vite SPA 场景下": "In Vite SPA scenario",
    "SSR HTML 由服务端注入": "SSR HTML injected by server",
    "水合中": "Hydrating",
    "已水合": "Hydrated",
    "渲染真实子组件": "Render real child components",
    "批量水合管理器": "Batch Hydration Manager",
    "水合任务": "Hydration Task",
    "优先级权重": "Priority Weight",
    "数字越大越优先": "Higher number = higher priority",
    "批量水合调度器": "Batch Hydration Scheduler",
    "按优先级分批调度水合任务": "Schedule hydration tasks in batches by priority",
    "避免一次性水合导致主线程阻塞": "Avoid main thread blocking from one-time hydration",
    "优先级立即执行": "Immediate execution for high priority",
    "在空闲时间分批执行": "Batch execution during idle time",
    "加入水合任务队列": "Add to hydration task queue",
    "启动调度": "Start Scheduler",
    "优先级同步执行": "Synchronous execution for high priority",
    "其余在空闲时执行": "Others execute during idle time",
    "清空队列": "Clear Queue",
    "全局水合调度器单例": "Global Hydration Scheduler Singleton",
    "获取全局水合调度器": "Get Global Hydration Scheduler",
    "BFF 错误边界": "BFF Error Boundary",
    "基于 React Error Boundary 的 BFF 错误处理组件": "BFF error handling component based on React Error Boundary",
    "必须是类组件": "Must be a class component",
    "功能": "Features",
    "错误分类": "Error Classification",
    "恢复策略": "Recovery Strategy",
    "错误上报": "Error Reporting",
    "错误 UI": "Error UI",
    "友好的错误页面": "User-friendly error page",
    "重试按钮": "Retry Button",
    "降级提示": "Fallback Hint",
    "自动重试": "Auto Retry",
    "降级到备选方案": "Fallback to alternative",
    "重定向到其他页面": "Redirect to other page",
    "仅展示错误": "Show error only",
    "分类后的错误信息": "Classified Error Information",
    "错误类型": "Error Type",
    "原始错误": "Original Error",
    "错误消息": "Error Message",
    "推荐的恢复策略": "Recommended Recovery Strategy",
    "是否可重试": "Is Retryable",
    "错误发生时间": "Error Occurrence Time",
    "组件栈": "Component Stack",
    "降级级别": "Fallback Level",
    "错误上报记录": "Error Report Record",
    "错误分类器": "Error Classifier",
    "根据错误特征分类 BFF 错误": "Classify BFF errors by error characteristics",
    "写入 localStorage": "Write to localStorage",
    "通知监听器": "Notify Listeners",
    "监控系统可订阅": "Monitoring system can subscribe",
    "上报到日志系统": "Report to Logging System",
    "获取错误上报记录": "Get Error Report Records",
    "清空错误上报记录": "Clear Error Report Records",
    "订阅错误上报事件": "Subscribe to Error Report Events",
    "错误图标映射": "Error Icon Mapping",
    "网络错误": "Network Error",
    "GraphQL 错误": "GraphQL Error",
    "请求超时": "Request Timeout",
    "认证失败": "Authentication Failed",
    "服务器错误": "Server Error",
    "数据校验错误": "Validation Error",
    "未知错误": "Unknown Error",
    "默认错误回退 UI 的 Props": "Props for Default Error Fallback UI",
    "当前重试次数": "Current Retry Count",
    "最大重试次数": "Max Retry Count",
    "重试回调": "Retry Callback",
    "重置回调": "Reset Callback",
    "清除错误状态": "Clear Error State",
    "默认错误回退 UI": "Default Error Fallback UI",
    "展示错误类型、错误消息、重试按钮与降级提示": "Display error type, message, retry button and fallback hint",
    "已重试": "Retried",
    "次": "times",
    "降级提示": "Fallback Hint",
    "系统正在尝试降级方案": "System is attempting fallback solution",
    "可能展示缓存数据或精简功能": "May display cached data or simplified features",
    "重试": "Retry",
    "重置": "Reset",
    "错误边界的 Props": "Error Boundary Props",
    "自定义错误回退渲染": "Custom error fallback rendering",
    "错误回调（上报用）": "Error callback (for reporting)",
    "默认使用错误分类推荐策略": "Default uses error classification recommended strategy",
    "重定向目标": "Redirect Target",
    "时使用": "used when",
    "重试前的延迟": "Delay before retry",
    "边界名称（用于调试）": "Boundary name (for debugging)",
    "BFF 错误边界（类组件）": "BFF Error Boundary (Class Component)",
    "捕获子树抛出的错误": "Catch errors thrown from subtree",
    "按 BFF 错误类型分类": "Classify by BFF error type",
    "根据恢复策略自动重试或展示降级 UI": "Auto retry or display fallback UI based on recovery strategy",
    "捕获错误": "Caught Error",
    "上报错误": "Report Error",
    "通知外部": "Notify External",
    "确保 componentStack 存在": "Ensure componentStack exists",
    "确定最终使用的恢复策略": "Determine final recovery strategy to use",
    "渲染重定向提示并触发跳转": "Render redirect hint and trigger navigation",
    "异步触发跳转": "Trigger redirect asynchronously",
    "避免渲染期间副作用": "Avoid side effects during rendering",
    "认证失败": "Authentication Failed",
    "正在跳转登录页": "Redirecting to login page",
    "自动触发重试（仅一次，避免循环）": "Auto trigger retry (only once, avoid loop)",
    "页面设计器类型系统": "Page Designer Type System",
    "可视化 Schema 构建": "Visual Schema Builder",
    "定义页面设计器的组件库、画布、属性面板等核心类型": "Define core types for page designer: component library, canvas, property panel, etc.",
    "支持拖拽式页面构建": "Support drag-and-drop page building",
    "输出 EntitySchema 配置": "Output EntitySchema configuration",
    "设计器组件分类": "Designer Component Category",
    "布局容器": "Layout Container",
    "表单控件": "Form Control",
    "展示组件": "Display Component",
    "操作按钮": "Action Button",
    "自定义": "Custom",
    "设计器组件元数据": "Designer Component Metadata",
    "组件类型唯一标识": "Unique Component Type Identifier",
    "显示名称": "Display Name",
    "分类": "Category",
    "图标": "Icon",
    "lucide 图标名": "Lucide Icon Name",
    "组件描述": "Component Description",
    "是否可作为容器": "Can be Container",
    "可拖入子组件": "Can drag in child components",
    "默认属性": "Default Props",
    "属性面板配置": "Property Panel Config",
    "渲染预览（设计器中显示）": "Render Preview (shown in designer)",
    "渲染实际组件": "Render Actual Component",
    "属性面板": "Property Panel",
    "属性面板配置类型": "Property Panel Config Type",
    "属性键名": "Property Key",
    "显示标签": "Display Label",
    "属性类型": "Property Type",
    "默认值": "Default Value",
    "下拉选项": "Dropdown Options",
    "时使用": "used when",
    "描述/提示": "Description / Hint",
    "是否必填": "Is Required",
    "是否高级属性": "Is Advanced Property",
    "折叠显示": "Collapsed Display",
    "校验规则": "Validation Rules",
    "画布与节点": "Canvas and Nodes",
    "画布节点": "Canvas Node",
    "设计器中的组件实例": "Component Instance in Designer",
    "节点唯一 ID": "Unique Node ID",
    "组件类型": "Component Type",
    "节点标签（显示在组件树）": "Node Label (displayed in component tree)",
    "组件属性": "Component Props",
    "子节点（容器组件）": "Child Nodes (Container Component)",
    "父节点 ID": "Parent Node ID",
    "是否选中": "Is Selected",
    "是否折叠（组件树中）": "Is Collapsed (in component tree)",
    "画布状态": "Canvas State",
    "根节点列表": "Root Node List",
    "当前选中节点 ID": "Currently Selected Node ID",
    "当前拖拽的组件类型": "Currently Dragging Component Type",
    "历史记录（撤销/重做）": "History (Undo/Redo)",
    "当前历史索引": "Current History Index",
    "Schema 转换": "Schema Conversion",
    "页面设计器输出配置": "Page Designer Output Configuration",
    "生成的 EntitySchema": "Generated EntitySchema",
    "画布节点（用于二次编辑）": "Canvas Nodes (for re-editing)",
    "版本": "Version",
    "从 SchemaField 列表生成画布节点": "Generate Canvas Nodes from SchemaField List",
    "从画布节点提取 SchemaField 列表": "Extract SchemaField List from Canvas Nodes",
    "设计器组件库": "Designer Component Library",
    "内置表单组件类型": "Built-in Form Component Types",
    "文本输入": "Text Input",
    "用于输入文本": "For entering text",
    "字段名称": "Field Name",
    "字段的唯一标识": "Unique identifier for the field",
    "字段标签": "Field Label",
    "显示给用户的名称": "Name shown to user",
    "占位提示": "Placeholder Hint",
    "是否必填": "Is Required",
    "跨列数": "Column Span",
    "高级属性": "Advanced Property",
    "数字输入": "Number Input",
    "用于输入数字": "For entering numbers",
    "最小值": "Minimum Value",
    "最大值": "Maximum Value",
    "下拉选择": "Dropdown Select",
    "用于从选项中选择": "For selecting from options",
    "选项来源": "Option Source",
    "静态选项": "Static Options",
    "API 数据": "API Data",
    "日期选择": "Date Select",
    "用于选择日期": "For selecting dates",
    "多行文本": "Multi-line Text",
    "用于输入长文本": "For entering long text",
    "行数": "Row Count",
    "开关": "Switch",
    "用于布尔值切换": "For boolean switching",
    "内置布局组件": "Built-in Layout Components",
    "分节容器": "Section Container",
    "带标题的表单分节": "Form section with title",
    "节标题": "Section Title",
    "节描述": "Section Description",
    "所有内置组件": "All Built-in Components",
    "根据类型获取组件定义": "Get Component Definition by Type",
    "按分类获取组件列表": "Get Component List by Category",
}

TRANSLATION_MAP = {
    **CHINESE_COMMENT_MAP,
    "名称": "Name",
    "设备类型": "Device Type",
    "位置类型": "Location Type",
    "状态": "Status",
    "容量": "Capacity",
    "当前用量": "Current Usage",
    "描述": "Description",
    "坐标": "Coordinates",
    "米": "m",
    "公里": "km",
    "平方米": "sqm",
    "公顷": "ha",
    "启用": "Active",
    "待处理": "Pending",
    "禁用": "Inactive",
    "北京": "Beijing",
    "在离线瓦片范围内": "Within offline tile range",
    "默认使用离线瓦片": "Default to offline tiles",
    "详情": "Details",
    "类型": "Type",
    "查看详情": "View Details",
    "按 ESC 退出工具模式 | 按 Enter 完成绘制": "Press ESC to exit tool mode | Press Enter to finish drawing",
    "已重试": "Retried",
    "系统正在尝试降级方案，可能展示缓存数据或精简功能。": "System is attempting fallback. Cached data or simplified features may be displayed.",
    "重试": "Retry",
    "重置": "Reset",
    "认证失败，正在跳转登录页...": "Authentication failed, redirecting to login page...",
    "详情": "Details",
    "组件栈": "Component Stack",
    "写入错误记录失败": "Failed to write error record",
    "错误监听器执行失败": "Error listener execution failed",
    "水合统计监听器执行失败": "Hydration statistics listener failed",
    "组件": "Component",
    "空闲超时，强制水合": "Idle timeout, forcing hydration",
    "由交互触发水合": "Hydration triggered by interaction",
    "捕获错误": "Caught error",
}

def translate_comment(text):
    """Translate Chinese comment text to English."""
    result = text
    # Apply comment map first (longest keys first to avoid partial replacement)
    for zh, en in sorted(CHINESE_COMMENT_MAP.items(), key=lambda x: -len(x[0])):
        if zh in result:
            result = result.replace(zh, en)
    
    # Apply general translation map for remaining terms
    for zh, en in sorted(TRANSLATION_MAP.items(), key=lambda x: -len(x[0])):
        if zh in result:
            result = result.replace(zh, en)
    
    return result

def translate_string(text):
    """Translate Chinese display string to English."""
    for zh, en in sorted(TRANSLATION_MAP.items(), key=lambda x: -len(x[0])):
        if text == zh:
            return en
    return text

def component_name_from_path(filepath):
    """Extract component namespace from file path."""
    rel = filepath.replace(BASE_DIR + "/", "")
    parts = rel.split("/")
    # Remove components/ prefix if exists
    if parts and parts[0] == "components":
        parts = parts[1:]
    # Build namespace
    ns_parts = []
    for p in parts:
        if p.endswith(".tsx") or p.endswith(".ts"):
            p = p[:-4] if p.endswith(".tsx") else p[:-3]
        if p == "index":
            continue
        ns_parts.append(p)
    return ".".join(ns_parts) if ns_parts else "unknown"

def generate_key(zh_text, comp_ns, existing_keys):
    """Generate a unique translation key."""
    key_base = f"components.{comp_ns}"
    hash_part = hashlib.md5(zh_text.encode()).hexdigest()[:8]
    key = f"{key_base}.text_{hash_part}"
    
    base_key = key
    counter = 1
    while key in existing_keys:
        key = f"{base_key}_{counter}"
        counter += 1
    
    existing_keys.add(key)
    return key

def has_chinese(text):
    """Check if text contains Chinese characters."""
    return bool(re.search(r'[\u4e00-\u9fff]', text))

def is_tsx(filepath):
    return filepath.endswith('.tsx')

def is_ts(filepath):
    return filepath.endswith('.ts') and not filepath.endswith('.tsx')

def is_types_or_hook(filepath):
    """Check if file is types.ts or useDesigner.ts (special handling)."""
    basename = os.path.basename(filepath)
    return basename in ('types.ts', 'useDesigner.ts')

def process_multiline_comments(content):
    """Translate Chinese in /* */ multi-line comments."""
    pattern = re.compile(r'/\*(.*?)\*/', re.DOTALL)
    
    def replacer(match):
        inner = match.group(1)
        if not has_chinese(inner):
            return match.group(0)
        translated = translate_comment(inner)
        return f"/*{translated}*/"
    
    return pattern.sub(replacer, content)

def process_singleline_comments(content):
    """Translate Chinese in // single-line comments."""
    lines = content.split('\n')
    new_lines = []
    for line in lines:
        # Find // comment position (not inside strings)
        in_string = False
        string_char = None
        comment_pos = -1
        in_template = False
        for i, ch in enumerate(line):
            if not in_string and not in_template:
                if ch in ('"', "'"):
                    in_string = True
                    string_char = ch
                elif ch == '`':
                    in_template = True
                elif ch == '/' and i + 1 < len(line) and line[i+1] == '/':
                    comment_pos = i
                    break
            elif in_string:
                if ch == '\\' and i + 1 < len(line):
                    continue
                if ch == string_char:
                    in_string = False
                    string_char = None
            elif in_template:
                if ch == '\\' and i + 1 < len(line):
                    continue
                if ch == '`':
                    in_template = False
        
        if comment_pos >= 0:
            prefix = line[:comment_pos]
            comment = line[comment_pos:]
            if has_chinese(comment):
                translated = translate_comment(comment)
                new_lines.append(prefix + translated)
            else:
                new_lines.append(line)
        else:
            new_lines.append(line)
    return '\n'.join(new_lines)

def process_strings(content, filepath, zh_trans, en_trans, existing_keys, comp_ns, special_mode):
    """
    Replace Chinese string literals with t() / i18n.t() calls.
    special_mode=True for types.ts/useDesigner.ts: only do comments, skip values.
    """
    if special_mode:
        return content, 0
    
    changes = 0
    
    # Pattern 1: String literals '中文' or "中文"
    # Match quoted strings with Chinese, not already in t()/i18n.t() calls
    lines = content.split('\n')
    new_lines = []
    
    for line in lines:
        # Skip lines that are just imports or comments
        stripped = line.strip()
        if stripped.startswith('import ') or stripped.startswith('//') or stripped.startswith('/*'):
            new_lines.append(line)
            continue
        
        # Skip if line looks like it's already inside t()
        # We'll do per-string replacement below instead
        if not has_chinese(line):
            new_lines.append(line)
            continue
        
        # Find string literals with Chinese
        # Pattern: ['"](text with Chinese)['"] not preceded by t( or i18n.t(
        def string_replacer(match):
            nonlocal changes
            full = match.group(0)
            quote = match.group(1)
            text = match.group(2)
            
            if not has_chinese(text):
                return full
            
            # Check context: are we inside t() or i18n.t()?
            start = match.start()
            before = line[max(0, start-20):start]
            if 't(' in before or 'i18n.t(' in before:
                return full
            
            # Skip empty / JS-only strings
            if re.match(r'^[\x00-\x7F]+$', text):
                return full
            
            # Skip pure variable-like strings
            if text.startswith('${') or ('${' in text and '}' in text):
                return full
            
            key = generate_key(text, comp_ns, existing_keys)
            zh_trans[key] = text
            en_trans[key] = translate_string(text)
            
            changes += 1
            if is_tsx(filepath):
                return f"t('{key}')"
            else:
                return f"i18n.t('{key}')"
        
        # Apply to double-quoted strings
        line_replaced = re.sub(
            r'''(")((?:[^"\\]|\\.)*[\u4e00-\u9fff]+(?:[^"\\]|\\.)*)(")''',
            string_replacer,
            line
        )
        # Apply to single-quoted strings
        line_replaced = re.sub(
            r"""(')((?:[^'\\]|\\.)*[\u4e00-\u9fff]+(?:[^'\\]|\\.)*)(')""",
            string_replacer,
            line_replaced
        )
        new_lines.append(line_replaced)
    
    content = '\n'.join(new_lines)
    
    # Pattern 2: JSX text content >中文<
    if is_tsx(filepath):
        def jsx_replacer(match):
            nonlocal changes
            prefix = match.group(1)
            text = match.group(2)
            suffix = match.group(3)
            
            stripped = text.strip()
            if not stripped or not has_chinese(stripped):
                return match.group(0)
            
            # Check if already wrapped in {}
            if stripped.startswith('{') and stripped.endswith('}'):
                return match.group(0)
            
            key = generate_key(stripped, comp_ns, existing_keys)
            zh_trans[key] = stripped
            en_trans[key] = translate_string(stripped)
            changes += 1
            
            return f"{prefix}{{t('{key}')}}{suffix}"
        
        content = re.sub(
            r'(>)(\s*[^<>\n]*[\u4e00-\u9fff]+[^<>\n]*\s*)(<)',
            jsx_replacer,
            content
        )
    
    return content, changes

def ensure_imports(content, filepath):
    """Ensure required imports are present."""
    changes = False
    
    if is_tsx(filepath):
        if 'useTranslation' not in content:
            # Insert after last import statement
            import_line = "import { useTranslation } from 'react-i18next';"
            lines = content.split('\n')
            last_import_idx = 0
            for i, line in enumerate(lines):
                stripped = line.strip()
                if stripped.startswith('import ') and ('from' in stripped or stripped.endswith(';')):
                    last_import_idx = i
            lines.insert(last_import_idx + 1, import_line)
            content = '\n'.join(lines)
            changes = True
    else:
        basename = os.path.basename(filepath)
        if basename not in ('types.ts',):
            if "import i18n from" not in content and "import i18n from '@/i18n'" not in content:
                import_line = "import i18n from '@/i18n';"
                lines = content.split('\n')
                last_import_idx = 0
                for i, line in enumerate(lines):
                    stripped = line.strip()
                    if stripped.startswith('import ') and ('from' in stripped or stripped.endswith(';')):
                        last_import_idx = i
                lines.insert(last_import_idx + 1, import_line)
                content = '\n'.join(lines)
                changes = True
    
    return content, changes

def ensure_use_translation_hook(content):
    """For .tsx files: ensure const { t } = useTranslation() is in components."""
    if 'const { t } = useTranslation()' in content:
        return content, False
    
    # Find function components and add the hook
    lines = content.split('\n')
    new_lines = []
    changes = False
    
    component_patterns = [
        re.compile(r'^(export\s+)?(const\s+\w[\w\d]*.*=\s*\([^)]*\)\s*=>)\s*\{'),
        re.compile(r'^(export\s+)?(function\s+\w[\w\d]*\s*\([^)]*\))\s*\{'),
    ]
    
    i = 0
    while i < len(lines):
        line = lines[i]
        new_lines.append(line)
        
        is_comp_start = False
        for pat in component_patterns:
            if pat.match(line.strip()):
                is_comp_start = True
                break
        
        if is_comp_start:
            # Find opening brace on this line or next lines
            brace_found_on_this = '{' in line
            brace_line_idx = i if brace_found_on_this else None
            if not brace_found_on_this:
                for j in range(i+1, min(i+5, len(lines))):
                    if '{' in lines[j]:
                        brace_line_idx = j
                        break
            
            if brace_line_idx is not None:
                # Insert hook after the line with brace
                # Determine indentation from next line
                next_line_idx = brace_line_idx + 1
                if next_line_idx < len(lines):
                    indent_match = re.match(r'^(\s*)', lines[next_line_idx])
                    indent = indent_match.group(1) if indent_match else '  '
                else:
                    indent = '  '
                
                hook_line = f"{indent}const {{ t }} = useTranslation();"
                
                # If brace is on the same line (i), insert after
                if brace_line_idx == i:
                    new_lines.append(hook_line)
                else:
                    # Need to insert between lines after processing brace line
                    pass
                
                changes = True
        i += 1
    
    # Simpler approach: if not a class component, add hook at the start of each arrow function component
    # that doesn't have it
    if 'class ' not in content:
        # Find patterns like "=> {" or ") => {"
        result_lines = []
        for line in lines:
            result_lines.append(line)
            stripped = line.rstrip()
            if stripped.endswith('=> {') and 'const ' in line:
                # Check that next lines don't already have useTranslation within a small window
                look_ahead = ''.join(lines[i+1:i+10] for i, _ in enumerate(lines) if False)  # placeholder
                # Get indent
                indent_match = re.match(r'^(\s*)', line)
                indent = (indent_match.group(1) if indent_match else '') + '  '
                hook_line = f"{indent}const {{ t }} = useTranslation();"
                # Avoid duplicate: check if this exact line would be followed by same
                if len(result_lines) < 2 or 'useTranslation()' not in result_lines[-2]:
                    result_lines.append(hook_line)
                    changes = True
        
        if changes:
            new_lines = result_lines
    
    return '\n'.join(new_lines), changes

def process_file(filepath, zh_trans, en_trans, existing_keys):
    """Process a single file."""
    full_path = filepath if filepath.startswith('/') else f"{BASE_DIR}/{filepath}"
    if not os.path.exists(full_path):
        print(f"  SKIP: file not found - {full_path}")
        return None, 0
    
    with open(full_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    total_changes = 0
    comp_ns = component_name_from_path(full_path)
    special = is_types_or_hook(full_path)
    
    # Step 1: Translate comments (ALWAYS do this)
    content = process_multiline_comments(content)
    content = process_singleline_comments(content)
    
    # Step 2: Ensure imports
    content, c = ensure_imports(content, full_path)
    total_changes += int(c)
    
    # Step 3: Replace strings with t() calls
    content, c = process_strings(content, full_path, zh_trans, en_trans, existing_keys, comp_ns, special)
    total_changes += c
    
    # Step 4: For tsx, ensure useTranslation hook in components
    if is_tsx(full_path) and not special:
        content, c = ensure_use_translation_hook(content)
        total_changes += int(c)
    
    # Only write if something changed
    if content != original:
        with open(full_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return full_path, total_changes
    return full_path, 0


def load_json(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_json(path, data):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def collect_existing_keys(zh_data):
    keys = set()
    comps = zh_data.get('components', {})
    def walk(d, prefix=''):
        for k, v in d.items():
            full = f"{prefix}.{k}" if prefix else k
            if isinstance(v, dict):
                walk(v, full)
            else:
                keys.add(full)
    walk(comps, 'components')
    return keys

def merge_new_keys(data, new_trans):
    """Merge new keys into data['components'] namespace."""
    if 'components' not in data:
        data['components'] = {}
    
    for full_key, value in new_trans.items():
        # full_key format: components.ns.ns2.text_xxx
        parts = full_key.split('.')
        if parts[0] != 'components':
            continue
        cursor = data['components']
        for p in parts[1:-1]:
            if p not in cursor:
                cursor[p] = {}
            if not isinstance(cursor[p], dict):
                cursor[p] = {}
            cursor = cursor[p]
        cursor[parts[-1]] = value
    
    return data

def main():
    print("=" * 70)
    print("Enhanced i18n Conversion Script - BFF / Designer / GIS Components")
    print("=" * 70)
    
    zh_data = load_json(ZH_PATH)
    en_data = load_json(EN_PATH)
    
    existing_keys = collect_existing_keys(zh_data)
    print(f"\nLoaded {len(existing_keys)} existing translation keys")
    
    new_zh = {}
    new_en = {}
    
    total_files = len(TARGET_FILES)
    processed = 0
    changed = 0
    total_changes_made = 0
    
    for idx, target in enumerate(TARGET_FILES, 1):
        rel = target
        print(f"\n[{idx}/{total_files}] Processing: {rel}")
        path, changes = process_file(target, new_zh, new_en, existing_keys)
        if path is None:
            print(f"  ✗ Skipped")
            continue
        processed += 1
        if changes > 0:
            changed += 1
            total_changes_made += changes
            print(f"  ✓ {changes} changes")
        else:
            print(f"  - No changes needed")
    
    # Update translation files
    if new_zh:
        print(f"\nMerging {len(new_zh)} new translation keys into zh.json / en.json...")
        zh_data = merge_new_keys(zh_data, new_zh)
        en_data = merge_new_keys(en_data, new_en)
        save_json(ZH_PATH, zh_data)
        save_json(EN_PATH, en_data)
        print(f"  ✓ Translation files updated")
    
    print("\n" + "=" * 70)
    print(f"SUMMARY:")
    print(f"  Total target files: {total_files}")
    print(f"  Files processed:   {processed}")
    print(f"  Files changed:     {changed}")
    print(f"  Total changes:     {total_changes_made}")
    print(f"  New i18n keys:     {len(new_zh)}")
    print("=" * 70)
    print("Done!")


if __name__ == '__main__':
    main()
