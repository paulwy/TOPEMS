#!/usr/bin/env python3
"""
TOPEMS 持续优化工具

功能：
    1. 性能监控数据收集和分析
    2. 自动识别性能瓶颈
    3. 生成优化建议
    4. 优化效果跟踪
    5. 生成优化报告

用法：
    python3 scripts/optimization/continuous-optimization.py [options]
"""

import argparse
import json
import time
import statistics
import os
import sys
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, field, asdict
from collections import defaultdict


# ==============================================================================
# 数据结构
# ==============================================================================

@dataclass
class PerformanceMetric:
    """性能指标"""
    name: str
    value: float
    unit: str
    timestamp: str
    category: str = "general"
    threshold: Optional[float] = None
    status: str = "normal"  # normal, warning, critical

    def __post_init__(self):
        if self.threshold is not None:
            if self.value >= self.threshold * 1.2:
                self.status = "critical"
            elif self.value >= self.threshold:
                self.status = "warning"


@dataclass
class OptimizationSuggestion:
    """优化建议"""
    id: str
    title: str
    description: str
    category: str  # performance, security, cost, reliability
    priority: str  # high, medium, low
    effort: str  # small, medium, large
    expected_improvement: str
    implementation_steps: List[str] = field(default_factory=list)
    related_metrics: List[str] = field(default_factory=list)
    status: str = "pending"  # pending, in_progress, completed, ignored
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())


@dataclass
class OptimizationReport:
    """优化报告"""
    report_id: str
    generated_at: str
    period_start: str
    period_end: str
    metrics_summary: Dict[str, Any] = field(default_factory=dict)
    bottlenecks: List[Dict[str, Any]] = field(default_factory=list)
    suggestions: List[OptimizationSuggestion] = field(default_factory=list)
    overall_score: float = 0.0
    recommendations: List[str] = field(default_factory=list)


# ==============================================================================
# 性能监控器
# ==============================================================================

class PerformanceMonitor:
    """性能监控器"""

    def __init__(self, base_url: str = "http://localhost:8013"):
        self.base_url = base_url.rstrip('/')
        self.metrics: List[PerformanceMetric] = []
        self.history: Dict[str, List[float]] = defaultdict(list)

    def collect_system_metrics(self) -> List[PerformanceMetric]:
        """收集系统指标（模拟）"""
        metrics = []
        timestamp = datetime.now().isoformat()

        # 模拟系统指标
        import random
        cpu_usage = random.uniform(20, 85)
        memory_usage = random.uniform(40, 75)
        disk_usage = random.uniform(30, 70)
        network_io = random.uniform(10, 100)

        metrics.extend([
            PerformanceMetric("cpu_usage", cpu_usage, "%", timestamp, "system", 70),
            PerformanceMetric("memory_usage", memory_usage, "%", timestamp, "system", 80),
            PerformanceMetric("disk_usage", disk_usage, "%", timestamp, "system", 85),
            PerformanceMetric("network_io", network_io, "MB/s", timestamp, "system", 100),
        ])

        return metrics

    def collect_api_metrics(self) -> List[PerformanceMetric]:
        """收集 API 指标（模拟）"""
        metrics = []
        timestamp = datetime.now().isoformat()

        import random
        avg_response_time = random.uniform(50, 400)
        p95_response_time = random.uniform(100, 800)
        p99_response_time = random.uniform(200, 1500)
        error_rate = random.uniform(0.01, 2.5)
        requests_per_second = random.uniform(10, 500)

        metrics.extend([
            PerformanceMetric("avg_response_time", avg_response_time, "ms", timestamp, "api", 300),
            PerformanceMetric("p95_response_time", p95_response_time, "ms", timestamp, "api", 500),
            PerformanceMetric("p99_response_time", p99_response_time, "ms", timestamp, "api", 1000),
            PerformanceMetric("error_rate", error_rate, "%", timestamp, "api", 1.0),
            PerformanceMetric("requests_per_second", requests_per_second, "req/s", timestamp, "api"),
        ])

        return metrics

    def collect_database_metrics(self) -> List[PerformanceMetric]:
        """收集数据库指标（模拟）"""
        metrics = []
        timestamp = datetime.now().isoformat()

        import random
        db_connections = random.uniform(5, 18)
        db_query_time = random.uniform(5, 100)
        db_slow_queries = random.uniform(0, 10)
        cache_hit_rate = random.uniform(70, 98)

        metrics.extend([
            PerformanceMetric("db_connections", db_connections, "count", timestamp, "database", 20),
            PerformanceMetric("db_avg_query_time", db_query_time, "ms", timestamp, "database", 50),
            PerformanceMetric("db_slow_queries", db_slow_queries, "count/min", timestamp, "database", 5),
            PerformanceMetric("cache_hit_rate", cache_hit_rate, "%", timestamp, "database", 90),
        ])

        return metrics

    def collect_all_metrics(self) -> List[PerformanceMetric]:
        """收集所有指标"""
        all_metrics = []
        all_metrics.extend(self.collect_system_metrics())
        all_metrics.extend(self.collect_api_metrics())
        all_metrics.extend(self.collect_database_metrics())

        self.metrics.extend(all_metrics)

        # 更新历史
        for metric in all_metrics:
            self.history[metric.name].append(metric.value)

        return all_metrics

    def get_metrics_summary(self) -> Dict[str, Any]:
        """获取指标汇总"""
        summary = {
            "total_metrics": len(self.metrics),
            "by_category": defaultdict(int),
            "by_status": defaultdict(int),
            "critical_metrics": [],
            "warning_metrics": [],
        }

        for metric in self.metrics:
            summary["by_category"][metric.category] += 1
            summary["by_status"][metric.status] += 1
            if metric.status == "critical":
                summary["critical_metrics"].append(asdict(metric))
            elif metric.status == "warning":
                summary["warning_metrics"].append(asdict(metric))

        # 转换 defaultdict
        summary["by_category"] = dict(summary["by_category"])
        summary["by_status"] = dict(summary["by_status"])

        return summary


# ==============================================================================
# 瓶颈分析器
# ==============================================================================

class BottleneckAnalyzer:
    """瓶颈分析器"""

    def __init__(self):
        self.rules = self._load_rules()

    def _load_rules(self) -> List[Dict[str, Any]]:
        """加载分析规则"""
        return [
            {
                "id": "high_cpu",
                "metric": "cpu_usage",
                "condition": lambda v: v > 70,
                "severity": "high",
                "title": "CPU 使用率过高",
                "description": "CPU 使用率持续超过 70%，可能导致响应延迟增加",
            },
            {
                "id": "high_memory",
                "metric": "memory_usage",
                "condition": lambda v: v > 80,
                "severity": "high",
                "title": "内存使用率过高",
                "description": "内存使用率超过 80%，存在 OOM 风险",
            },
            {
                "id": "slow_api",
                "metric": "p95_response_time",
                "condition": lambda v: v > 500,
                "severity": "medium",
                "title": "API 响应时间过长",
                "description": "P95 响应时间超过 500ms，影响用户体验",
            },
            {
                "id": "high_error_rate",
                "metric": "error_rate",
                "condition": lambda v: v > 1.0,
                "severity": "high",
                "title": "API 错误率过高",
                "description": "错误率超过 1%，需要排查错误原因",
            },
            {
                "id": "db_connection_high",
                "metric": "db_connections",
                "condition": lambda v: v > 15,
                "severity": "medium",
                "title": "数据库连接数过高",
                "description": "数据库连接数接近上限，可能导致连接等待",
            },
            {
                "id": "slow_db_query",
                "metric": "db_avg_query_time",
                "condition": lambda v: v > 50,
                "severity": "medium",
                "title": "数据库查询缓慢",
                "description": "平均查询时间超过 50ms，需要优化查询或索引",
            },
            {
                "id": "low_cache_hit",
                "metric": "cache_hit_rate",
                "condition": lambda v: v < 90,
                "severity": "low",
                "title": "缓存命中率低",
                "description": "缓存命中率低于 90%，可以优化缓存策略",
            },
        ]

    def analyze(self, metrics: List[PerformanceMetric]) -> List[Dict[str, Any]]:
        """分析瓶颈"""
        bottlenecks = []
        metric_map = {m.name: m for m in metrics}

        for rule in self.rules:
            metric = metric_map.get(rule["metric"])
            if metric and rule["condition"](metric.value):
                bottlenecks.append({
                    "id": rule["id"],
                    "title": rule["title"],
                    "description": rule["description"],
                    "severity": rule["severity"],
                    "metric": rule["metric"],
                    "current_value": metric.value,
                    "unit": metric.unit,
                    "threshold": metric.threshold,
                })

        # 按严重程度排序
        severity_order = {"high": 0, "medium": 1, "low": 2}
        bottlenecks.sort(key=lambda x: severity_order.get(x["severity"], 3))

        return bottlenecks


# ==============================================================================
# 优化建议生成器
# ==============================================================================

class SuggestionGenerator:
    """优化建议生成器"""

    def __init__(self):
        self.suggestion_templates = self._load_templates()

    def _load_templates(self) -> Dict[str, OptimizationSuggestion]:
        """加载建议模板"""
        templates = {}

        # CPU 优化
        templates["high_cpu"] = OptimizationSuggestion(
            id="opt_cpu_001",
            title="优化 CPU 密集型操作",
            description="分析 CPU 使用率高的原因，优化算法或引入异步处理",
            category="performance",
            priority="high",
            effort="medium",
            expected_improvement="CPU 使用率降低 20-40%",
            implementation_steps=[
                "使用 profiling 工具定位 CPU 热点",
                "优化算法复杂度（O(n²) → O(n log n)）",
                "将 CPU 密集型任务移至后台异步处理",
                "考虑使用多线程或多进程并行处理",
            ],
            related_metrics=["cpu_usage"],
        )

        # 内存优化
        templates["high_memory"] = OptimizationSuggestion(
            id="opt_mem_001",
            title="优化内存使用",
            description="分析内存占用，释放不必要的内存，防止 OOM",
            category="performance",
            priority="high",
            effort="medium",
            expected_improvement="内存使用率降低 15-30%",
            implementation_steps=[
                "使用内存分析工具定位内存泄漏",
                "及时释放大对象和引用",
                "使用流式处理替代全量加载",
                "调整 JVM/运行时内存参数",
            ],
            related_metrics=["memory_usage"],
        )

        # API 响应优化
        templates["slow_api"] = OptimizationSuggestion(
            id="opt_api_001",
            title="优化 API 响应时间",
            description="分析慢接口，优化数据库查询和业务逻辑",
            category="performance",
            priority="medium",
            effort="medium",
            expected_improvement="P95 响应时间降低 30-50%",
            implementation_steps=[
                "启用慢查询日志，定位慢接口",
                "添加数据库索引优化查询",
                "使用缓存减少数据库访问",
                "优化 N+1 查询问题",
                "考虑使用异步处理非关键路径",
            ],
            related_metrics=["p95_response_time", "p99_response_time"],
        )

        # 错误率优化
        templates["high_error_rate"] = OptimizationSuggestion(
            id="opt_err_001",
            title="降低 API 错误率",
            description="分析错误日志，修复常见错误，提高系统稳定性",
            category="reliability",
            priority="high",
            effort="small",
            expected_improvement="错误率降至 0.5% 以下",
            implementation_steps=[
                "收集和分析错误日志",
                "按错误类型分类统计",
                "修复高频错误",
                "添加更好的错误处理和重试机制",
            ],
            related_metrics=["error_rate"],
        )

        # 数据库连接优化
        templates["db_connection_high"] = OptimizationSuggestion(
            id="opt_db_001",
            title="优化数据库连接池",
            description="调整连接池配置，优化连接使用，防止连接耗尽",
            category="performance",
            priority="medium",
            effort="small",
            expected_improvement="连接等待时间降低 50%",
            implementation_steps=[
                "监控连接池使用率",
                "调整最大连接数配置",
                "优化长事务，减少连接占用时间",
                "使用连接池监控工具",
            ],
            related_metrics=["db_connections"],
        )

        # 数据库查询优化
        templates["slow_db_query"] = OptimizationSuggestion(
            id="opt_db_002",
            title="优化数据库查询性能",
            description="分析慢查询，添加索引，优化 SQL 语句",
            category="performance",
            priority="medium",
            effort="medium",
            expected_improvement="查询时间降低 40-60%",
            implementation_steps=[
                "启用慢查询日志",
                "使用 EXPLAIN ANALYZE 分析查询计划",
                "为常用查询字段添加索引",
                "优化复杂 SQL 语句",
                "考虑使用读写分离",
            ],
            related_metrics=["db_avg_query_time", "db_slow_queries"],
        )

        # 缓存优化
        templates["low_cache_hit"] = OptimizationSuggestion(
            id="opt_cache_001",
            title="优化缓存策略",
            description="提高缓存命中率，减少数据库访问",
            category="performance",
            priority="low",
            effort="small",
            expected_improvement="缓存命中率提升至 95% 以上",
            implementation_steps=[
                "分析缓存未命中的原因",
                "调整缓存过期时间",
                "使用缓存预热策略",
                "优化缓存键设计",
            ],
            related_metrics=["cache_hit_rate"],
        )

        return templates

    def generate(self, bottlenecks: List[Dict[str, Any]]) -> List[OptimizationSuggestion]:
        """根据瓶颈生成优化建议"""
        suggestions = []
        seen_ids = set()

        for bottleneck in bottlenecks:
            template = self.suggestion_templates.get(bottleneck["id"])
            if template and template.id not in seen_ids:
                suggestions.append(template)
                seen_ids.add(template.id)

        # 如果没有特定瓶颈，提供通用优化建议
        if not suggestions:
            suggestions.append(OptimizationSuggestion(
                id="opt_general_001",
                title="持续性能监控",
                description="建立持续性能监控机制，定期检查系统状态",
                category="reliability",
                priority="low",
                effort="small",
                expected_improvement="提前发现性能问题",
                implementation_steps=[
                    "设置性能监控告警",
                    "定期生成性能报告",
                    "建立性能基线",
                ],
            ))

        return suggestions


# ==============================================================================
# 优化报告生成器
# ==============================================================================

class ReportGenerator:
    """优化报告生成器"""

    def __init__(self, output_dir: str = "test-results/optimization"):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)

    def calculate_score(self, metrics_summary: Dict[str, Any], bottlenecks: List[Dict[str, Any]]) -> float:
        """计算整体优化得分（0-100）"""
        score = 100.0

        # 根据瓶颈扣分
        severity_penalty = {"high": 15, "medium": 8, "low": 3}
        for bottleneck in bottlenecks:
            score -= severity_penalty.get(bottleneck["severity"], 5)

        # 根据关键指标扣分
        critical_count = len(metrics_summary.get("critical_metrics", []))
        warning_count = len(metrics_summary.get("warning_metrics", []))
        score -= critical_count * 5
        score -= warning_count * 2

        return max(0.0, min(100.0, score))

    def generate_recommendations(self, bottlenecks: List[Dict[str, Any]], suggestions: List[OptimizationSuggestion]) -> List[str]:
        """生成推荐行动"""
        recommendations = []

        high_priority = [s for s in suggestions if s.priority == "high"]
        if high_priority:
            recommendations.append(f"优先处理 {len(high_priority)} 个高优先级优化项")

        if any(b["severity"] == "high" for b in bottlenecks):
            recommendations.append("立即处理严重级别的性能瓶颈")

        medium_effort = [s for s in suggestions if s.effort == "small"]
        if medium_effort:
            recommendations.append(f"先实施 {len(medium_effort)} 个低成本优化项，快速见效")

        if not bottlenecks:
            recommendations.append("系统状态良好，继续保持监控")

        recommendations.append("建立持续优化机制，定期评估系统性能")

        return recommendations

    def generate(self, monitor: PerformanceMonitor, analyzer: BottleneckAnalyzer, suggestion_gen: SuggestionGenerator) -> OptimizationReport:
        """生成完整优化报告"""
        metrics = monitor.metrics
        metrics_summary = monitor.get_metrics_summary()
        bottlenecks = analyzer.analyze(metrics)
        suggestions = suggestion_gen.generate(bottlenecks)
        score = self.calculate_score(metrics_summary, bottlenecks)
        recommendations = self.generate_recommendations(bottlenecks, suggestions)

        report = OptimizationReport(
            report_id=f"opt-{datetime.now().strftime('%Y%m%d-%H%M%S')}",
            generated_at=datetime.now().isoformat(),
            period_start=(datetime.now() - timedelta(hours=1)).isoformat(),
            period_end=datetime.now().isoformat(),
            metrics_summary=metrics_summary,
            bottlenecks=bottlenecks,
            suggestions=suggestions,
            overall_score=score,
            recommendations=recommendations,
        )

        return report

    def save_json(self, report: OptimizationReport) -> str:
        """保存 JSON 报告"""
        filepath = os.path.join(self.output_dir, f"{report.report_id}.json")
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(asdict(report), f, indent=2, ensure_ascii=False)
        return filepath

    def save_html(self, report: OptimizationReport) -> str:
        """保存 HTML 报告"""
        filepath = os.path.join(self.output_dir, f"{report.report_id}.html")

        score_color = "#52c41a" if report.overall_score >= 80 else "#faad14" if report.overall_score >= 60 else "#f5222d"

        bottlenecks_html = ""
        for b in report.bottlenecks:
            severity_color = "#f5222d" if b["severity"] == "high" else "#faad14" if b["severity"] == "medium" else "#1890ff"
            bottlenecks_html += f"""
            <div style="padding:15px;margin-bottom:10px;background:#fafafa;border-radius:8px;border-left:4px solid {severity_color}">
                <h4 style="margin:0 0 8px 0">{b['title']}</h4>
                <p style="margin:0 0 8px 0;color:#666;font-size:14px">{b['description']}</p>
                <div style="font-size:13px">
                    <span style="color:{severity_color};font-weight:bold">{b['severity'].upper()}</span>
                    <span style="margin-left:15px">当前值: <strong>{b['current_value']}{b['unit']}</strong></span>
                    <span style="margin-left:15px">阈值: {b.get('threshold', 'N/A')}{b['unit']}</span>
                </div>
            </div>
            """

        suggestions_html = ""
        for s in report.suggestions:
            priority_color = "#f5222d" if s.priority == "high" else "#faad14" if s.priority == "medium" else "#1890ff"
            steps_html = "".join(f"<li>{step}</li>" for step in s.implementation_steps)
            suggestions_html += f"""
            <div style="padding:15px;margin-bottom:10px;background:#fafafa;border-radius:8px">
                <h4 style="margin:0 0 8px 0">{s.title}</h4>
                <p style="margin:0 0 8px 0;color:#666;font-size:14px">{s.description}</p>
                <div style="font-size:13px;margin-bottom:8px">
                    <span style="color:{priority_color};font-weight:bold">优先级: {s.priority.upper()}</span>
                    <span style="margin-left:15px">工作量: {s.effort}</span>
                    <span style="margin-left:15px;color:#52c41a">预期效果: {s.expected_improvement}</span>
                </div>
                <details style="font-size:13px">
                    <summary style="cursor:pointer;color:#1890ff">实施步骤</summary>
                    <ol>{steps_html}</ol>
                </details>
            </div>
            """

        recommendations_html = "".join(f"<li style='margin-bottom:8px'>{r}</li>" for r in report.recommendations)

        html = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><title>TOPEMS 持续优化报告</title>
<style>
body{{font-family:-apple-system,sans-serif;margin:0;padding:20px;background:#f5f5f5}}
.container{{max-width:1200px;margin:0 auto}}
.header{{background:linear-gradient(135deg,#667eea,#764ba2);color:white;padding:30px;border-radius:10px;margin-bottom:20px}}
.score-card{{background:white;padding:30px;border-radius:8px;text-align:center;margin-bottom:20px;box-shadow:0 2px 4px rgba(0,0,0,.1)}}
.score-value{{font-size:72px;font-weight:bold;color:{score_color}}}
.score-label{{font-size:18px;color:#666;margin-top:10px}}
.section{{background:white;padding:20px;border-radius:8px;margin-bottom:20px;box-shadow:0 2px 4px rgba(0,0,0,.1)}}
.section h2{{margin-top:0;border-bottom:2px solid #667eea;padding-bottom:10px}}
.stats{{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:15px;margin-bottom:20px}}
.stat{{background:#fafafa;padding:15px;border-radius:8px;text-align:center}}
.stat .value{{font-size:28px;font-weight:bold}}
.stat .label{{font-size:13px;color:#666;margin-top:5px}}
</style>
</head>
<body><div class="container">
<div class="header">
    <h1>TOPEMS 持续优化报告</h1>
    <p>报告 ID: {report.report_id}</p>
    <p>生成时间: {report.generated_at}</p>
    <p>监控周期: {report.period_start} ~ {report.period_end}</p>
</div>

<div class="score-card">
    <div class="score-value">{report.overall_score:.0f}</div>
    <div class="score-label">整体优化得分（满分 100）</div>
</div>

<div class="stats">
    <div class="stat"><div class="value" style="color:#1890ff">{report.metrics_summary.get('total_metrics', 0)}</div><div class="label">监控指标</div></div>
    <div class="stat"><div class="value" style="color:#f5222d">{len(report.bottlenecks)}</div><div class="label">性能瓶颈</div></div>
    <div class="stat"><div class="value" style="color:#52c41a">{len(report.suggestions)}</div><div class="label">优化建议</div></div>
    <div class="stat"><div class="value" style="color:#faad14">{len(report.recommendations)}</div><div class="label">推荐行动</div></div>
</div>

<div class="section">
    <h2>性能瓶颈</h2>
    {bottlenecks_html if bottlenecks_html else '<p style="color:#52c41a">✓ 未发现明显性能瓶颈</p>'}
</div>

<div class="section">
    <h2>优化建议</h2>
    {suggestions_html}
</div>

<div class="section">
    <h2>推荐行动</h2>
    <ol>{recommendations_html}</ol>
</div>

</div></body></html>"""

        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(html)
        return filepath


# ==============================================================================
# 主函数
# ==============================================================================

def main():
    parser = argparse.ArgumentParser(description='TOPEMS 持续优化工具')
    parser.add_argument('--url', default='http://localhost:8013', help='服务 URL')
    parser.add_argument('--output', default='test-results/optimization', help='输出目录')
    parser.add_argument('--samples', type=int, default=5, help='采集样本数')
    parser.add_argument('--interval', type=int, default=2, help='采集间隔（秒）')
    parser.add_argument('--json', action='store_true', help='输出 JSON 格式')
    parser.add_argument('--html', action='store_true', help='输出 HTML 格式')
    args = parser.parse_args()

    print("=" * 60)
    print("  TOPEMS 持续优化工具")
    print("=" * 60)
    print(f"  服务 URL: {args.url}")
    print(f"  样本数: {args.samples}")
    print(f"  采集间隔: {args.interval}秒")
    print()

    # 初始化组件
    monitor = PerformanceMonitor(args.url)
    analyzer = BottleneckAnalyzer()
    suggestion_gen = SuggestionGenerator()
    report_gen = ReportGenerator(args.output)

    # 采集性能数据
    print("正在采集性能数据...")
    for i in range(args.samples):
        metrics = monitor.collect_all_metrics()
        print(f"  样本 {i+1}/{args.samples}: 采集 {len(metrics)} 个指标")
        if i < args.samples - 1:
            time.sleep(args.interval)

    print()

    # 分析瓶颈
    print("正在分析性能瓶颈...")
    bottlenecks = analyzer.analyze(monitor.metrics)
    print(f"  发现 {len(bottlenecks)} 个瓶颈")
    for b in bottlenecks:
        print(f"    - [{b['severity'].upper()}] {b['title']}: {b['current_value']}{b['unit']}")

    print()

    # 生成优化建议
    print("正在生成优化建议...")
    suggestions = suggestion_gen.generate(bottlenecks)
    print(f"  生成 {len(suggestions)} 条建议")
    for s in suggestions:
        print(f"    - [{s.priority.upper()}] {s.title}")

    print()

    # 生成报告
    print("正在生成优化报告...")
    report = report_gen.generate(monitor, analyzer, suggestion_gen)

    print(f"  整体优化得分: {report.overall_score:.0f}/100")
    print(f"  推荐行动: {len(report.recommendations)} 条")

    # 保存报告
    json_path = report_gen.save_json(report)
    print(f"  JSON 报告: {json_path}")

    html_path = report_gen.save_html(report)
    print(f"  HTML 报告: {html_path}")

    print()
    print("=" * 60)
    print("  优化分析完成")
    print("=" * 60)
    print(f"  整体得分: {report.overall_score:.0f}/100")
    print(f"  瓶颈数量: {len(bottlenecks)}")
    print(f"  建议数量: {len(suggestions)}")
    print(f"  报告路径: {html_path}")
    print("=" * 60)


if __name__ == '__main__':
    main()
