#!/usr/bin/env python3
"""
TOPEMS 性能测试与压力测试脚本

用法：
    python3 performance_test.py [options]

功能：
    1. API 端点性能测试
    2. 并发压力测试
    3. 数据库查询性能测试
    4. 缓存性能测试
    5. 生成性能报告
"""

import argparse
import json
import time
import statistics
import concurrent.futures
import urllib.request
import urllib.error
import sys
from datetime import datetime
from typing import List, Dict, Any, Tuple


class PerformanceTester:
    """性能测试器"""

    def __init__(self, base_url: str, timeout: int = 30):
        self.base_url = base_url.rstrip('/')
        self.timeout = timeout
        self.results: Dict[str, Any] = {}

    def test_endpoint(
        self,
        endpoint: str,
        method: str = 'GET',
        data: Dict[str, Any] = None,
        headers: Dict[str, str] = None,
        iterations: int = 10,
    ) -> Dict[str, Any]:
        """测试单个 API 端点性能"""
        url = f"{self.base_url}{endpoint}"
        latencies: List[float] = []
        status_codes: List[int] = []
        errors: List[str] = []

        for i in range(iterations):
            try:
                req = urllib.request.Request(url, method=method)
                if headers:
                    for key, value in headers.items():
                        req.add_header(key, value)
                if data:
                    req.add_header('Content-Type', 'application/json')
                    req.data = json.dumps(data).encode('utf-8')

                start_time = time.time()
                with urllib.request.urlopen(req, timeout=self.timeout) as response:
                    response.read()
                    elapsed = (time.time() - start_time) * 1000
                    latencies.append(elapsed)
                    status_codes.append(response.status)
            except urllib.error.HTTPError as e:
                elapsed = (time.time() - start_time) * 1000
                latencies.append(elapsed)
                status_codes.append(e.code)
                errors.append(f"HTTP {e.code}: {e.reason}")
            except Exception as e:
                errors.append(str(e))

        result = {
            'endpoint': endpoint,
            'method': method,
            'iterations': iterations,
            'success_count': len([s for s in status_codes if 200 <= s < 300]),
            'error_count': len(errors),
            'latency': {
                'min': min(latencies) if latencies else 0,
                'max': max(latencies) if latencies else 0,
                'mean': statistics.mean(latencies) if latencies else 0,
                'median': statistics.median(latencies) if latencies else 0,
                'p95': self.percentile(latencies, 95) if latencies else 0,
                'p99': self.percentile(latencies, 99) if latencies else 0,
                'stdev': statistics.stdev(latencies) if len(latencies) > 1 else 0,
            },
            'throughput': {
                'requests_per_second': len(latencies) / (sum(latencies) / 1000) if sum(latencies) > 0 else 0,
            },
            'errors': errors[:10],  # 只保留前 10 个错误
        }

        self.results[endpoint] = result
        return result

    def stress_test(
        self,
        endpoint: str,
        method: str = 'GET',
        data: Dict[str, Any] = None,
        headers: Dict[str, str] = None,
        concurrent_users: int = 10,
        duration_seconds: int = 30,
    ) -> Dict[str, Any]:
        """并发压力测试"""
        url = f"{self.base_url}{endpoint}"
        start_time = time.time()
        total_requests = 0
        success_requests = 0
        failed_requests = 0
        latencies: List[float] = []

        def make_request():
            nonlocal total_requests, success_requests, failed_requests
            try:
                req = urllib.request.Request(url, method=method)
                if headers:
                    for key, value in headers.items():
                        req.add_header(key, value)
                if data:
                    req.add_header('Content-Type', 'application/json')
                    req.data = json.dumps(data).encode('utf-8')

                req_start = time.time()
                with urllib.request.urlopen(req, timeout=self.timeout) as response:
                    response.read()
                    elapsed = (time.time() - req_start) * 1000
                    latencies.append(elapsed)
                    if 200 <= response.status < 300:
                        success_requests += 1
                    else:
                        failed_requests += 1
            except Exception:
                failed_requests += 1
            total_requests += 1

        with concurrent.futures.ThreadPoolExecutor(max_workers=concurrent_users) as executor:
            end_time = start_time + duration_seconds
            futures = []
            while time.time() < end_time:
                futures.append(executor.submit(make_request))
                if len(futures) > concurrent_users * 10:
                    concurrent.futures.wait(futures, return_when=concurrent.futures.FIRST_COMPLETED)
                    futures = [f for f in futures if not f.done()]

            concurrent.futures.wait(futures)

        actual_duration = time.time() - start_time

        result = {
            'endpoint': endpoint,
            'method': method,
            'concurrent_users': concurrent_users,
            'duration_seconds': actual_duration,
            'total_requests': total_requests,
            'success_requests': success_requests,
            'failed_requests': failed_requests,
            'success_rate': (success_requests / total_requests * 100) if total_requests > 0 else 0,
            'latency': {
                'min': min(latencies) if latencies else 0,
                'max': max(latencies) if latencies else 0,
                'mean': statistics.mean(latencies) if latencies else 0,
                'median': statistics.median(latencies) if latencies else 0,
                'p95': self.percentile(latencies, 95) if latencies else 0,
                'p99': self.percentile(latencies, 99) if latencies else 0,
            },
            'throughput': {
                'requests_per_second': total_requests / actual_duration if actual_duration > 0 else 0,
                'successful_requests_per_second': success_requests / actual_duration if actual_duration > 0 else 0,
            },
        }

        self.results[f"stress_{endpoint}"] = result
        return result

    @staticmethod
    def percentile(data: List[float], percentile: float) -> float:
        """计算百分位数"""
        if not data:
            return 0
        sorted_data = sorted(data)
        index = (percentile / 100) * (len(sorted_data) - 1)
        lower = int(index)
        upper = lower + 1
        if upper >= len(sorted_data):
            return sorted_data[lower]
        weight = index - lower
        return sorted_data[lower] * (1 - weight) + sorted_data[upper] * weight

    def generate_report(self) -> str:
        """生成性能测试报告"""
        report = []
        report.append("=" * 80)
        report.append("  TOPEMS 性能测试报告")
        report.append("=" * 80)
        report.append(f"测试时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        report.append(f"测试目标: {self.base_url}")
        report.append("")

        # 汇总
        report.append("-" * 80)
        report.append("  测试汇总")
        report.append("-" * 80)
        total_tests = len(self.results)
        report.append(f"总测试数: {total_tests}")
        report.append("")

        # 详细结果
        for endpoint, result in self.results.items():
            report.append("-" * 80)
            report.append(f"  端点: {endpoint}")
            report.append("-" * 80)

            if 'iterations' in result:
                report.append(f"方法: {result['method']}")
                report.append(f"迭代次数: {result['iterations']}")
                report.append(f"成功数: {result['success_count']}")
                report.append(f"错误数: {result['error_count']}")
            else:
                report.append(f"方法: {result['method']}")
                report.append(f"并发用户数: {result['concurrent_users']}")
                report.append(f"持续时间: {result['duration_seconds']:.2f} 秒")
                report.append(f"总请求数: {result['total_requests']}")
                report.append(f"成功数: {result['success_requests']}")
                report.append(f"失败数: {result['failed_requests']}")
                report.append(f"成功率: {result['success_rate']:.2f}%")

            report.append("")
            report.append("延迟统计 (毫秒):")
            latency = result['latency']
            report.append(f"  最小: {latency['min']:.2f}")
            report.append(f"  最大: {latency['max']:.2f}")
            report.append(f"  平均: {latency['mean']:.2f}")
            report.append(f"  中位数: {latency['median']:.2f}")
            report.append(f"  P95: {latency['p95']:.2f}")
            report.append(f"  P99: {latency['p99']:.2f}")
            if 'stdev' in latency:
                report.append(f"  标准差: {latency['stdev']:.2f}")

            report.append("")
            report.append("吞吐量:")
            throughput = result['throughput']
            for key, value in throughput.items():
                report.append(f"  {key}: {value:.2f}")

            if result.get('errors'):
                report.append("")
                report.append("错误 (前 10 个):")
                for error in result['errors']:
                    report.append(f"  - {error}")

            report.append("")

        report.append("=" * 80)
        report.append("  报告结束")
        report.append("=" * 80)

        return "\n".join(report)

    def save_report(self, filepath: str):
        """保存报告到文件"""
        report = self.generate_report()
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(report)

        # 同时保存 JSON 格式
        json_filepath = filepath.replace('.txt', '.json')
        with open(json_filepath, 'w', encoding='utf-8') as f:
            json.dump(self.results, f, indent=2, ensure_ascii=False)

        print(f"报告已保存到: {filepath}")
        print(f"JSON 数据已保存到: {json_filepath}")


def main():
    parser = argparse.ArgumentParser(description='TOPEMS 性能测试工具')
    parser.add_argument('--url', default='http://localhost:8013', help='测试目标 URL')
    parser.add_argument('--timeout', type=int, default=30, help='请求超时时间（秒）')
    parser.add_argument('--iterations', type=int, default=10, help='单端点测试迭代次数')
    parser.add_argument('--concurrent', type=int, default=10, help='压力测试并发用户数')
    parser.add_argument('--duration', type=int, default=30, help='压力测试持续时间（秒）')
    parser.add_argument('--output', default='performance_report.txt', help='报告输出文件')
    parser.add_argument('--skip-stress', action='store_true', help='跳过压力测试')

    args = parser.parse_args()

    tester = PerformanceTester(args.url, args.timeout)

    # 默认测试端点
    test_endpoints = [
        ('/health', 'GET', None),
        ('/api', 'GET', None),
        ('/metrics', 'GET', None),
    ]

    print("=" * 80)
    print("  TOPEMS 性能测试开始")
    print("=" * 80)
    print(f"目标 URL: {args.url}")
    print(f"超时时间: {args.timeout} 秒")
    print(f"迭代次数: {args.iterations}")
    print()

    # 单端点性能测试
    print("--- 单端点性能测试 ---")
    for endpoint, method, data in test_endpoints:
        print(f"测试: {method} {endpoint}")
        try:
            result = tester.test_endpoint(endpoint, method, data, iterations=args.iterations)
            print(f"  平均延迟: {result['latency']['mean']:.2f}ms")
            print(f"  P95 延迟: {result['latency']['p95']:.2f}ms")
            print(f"  成功率: {result['success_count']}/{result['iterations']}")
        except Exception as e:
            print(f"  错误: {e}")
        print()

    # 压力测试
    if not args.skip_stress:
        print("--- 压力测试 ---")
        stress_endpoints = [
            ('/health', 'GET', None),
        ]
        for endpoint, method, data in stress_endpoints:
            print(f"压力测试: {method} {endpoint}")
            print(f"  并发用户: {args.concurrent}")
            print(f"  持续时间: {args.duration} 秒")
            try:
                result = tester.stress_test(
                    endpoint, method, data,
                    concurrent_users=args.concurrent,
                    duration_seconds=args.duration,
                )
                print(f"  总请求数: {result['total_requests']}")
                print(f"  成功率: {result['success_rate']:.2f}%")
                print(f"  吞吐量: {result['throughput']['requests_per_second']:.2f} req/s")
                print(f"  P95 延迟: {result['latency']['p95']:.2f}ms")
            except Exception as e:
                print(f"  错误: {e}")
            print()

    # 生成报告
    print("--- 生成报告 ---")
    tester.save_report(args.output)
    print()
    print(tester.generate_report())


if __name__ == '__main__':
    main()
