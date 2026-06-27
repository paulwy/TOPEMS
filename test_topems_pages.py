#!/usr/bin/env python3
"""
核心平台页面功能测试
验证核心平台和专业应用页面是否正常加载
"""

from playwright.sync_api import sync_playwright
import sys
import os

# 测试页面列表
TEST_PAGES = [
    ('/', '首页'),
    ('/dashboard', '仪表盘'),
    ('/documents', '文档中心'),
    ('/notifications', '通知中心'),
    ('/report/list', '报表中心'),
]

def test_pages():
    """测试核心页面加载"""
    results = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # 捕获控制台错误
        console_errors = []

        def handle_console(msg):
            if msg.type == 'error':
                console_errors.append(msg.text)

        page.on('console', handle_console)

        for path, name in TEST_PAGES:
            print(f"\n测试页面: {name} ({path})")
            try:
                # 导航到页面
                page.goto(f'http://localhost:5174{path}', timeout=30000)
                page.wait_for_load_state('networkidle', timeout=30000)

                # 等待页面稳定
                page.wait_for_timeout(2000)

                # 检查页面标题
                title = page.title()

                # 检查是否有主要元素
                has_content = len(page.content()) > 1000

                print(f"  ✓ 页面加载成功")
                print(f"  - 标题: {title}")
                print(f"  - 内容长度: {len(page.content())} 字符")

                results.append({
                    'path': path,
                    'name': name,
                    'success': True,
                    'title': title,
                    'content_length': len(page.content())
                })

                # 截图保存
                screenshot_dir = '/tmp/topems-screenshots'
                os.makedirs(screenshot_dir, exist_ok=True)
                screenshot_path = f"{screenshot_dir}/{name.replace(' ', '_')}.png"
                page.screenshot(path=screenshot_path, full_page=False)
                print(f"  - 截图: {screenshot_path}")

            except Exception as e:
                print(f"  ✗ 页面加载失败: {str(e)}")
                results.append({
                    'path': path,
                    'name': name,
                    'success': False,
                    'error': str(e)
                })

        # 输出总结
        print("\n" + "="*60)
        print("测试总结")
        print("="*60)

        success_count = sum(1 for r in results if r['success'])
        total_count = len(results)

        print(f"\n成功: {success_count}/{total_count}")

        if console_errors:
            print(f"\n控制台错误 ({len(console_errors)} 个):")
            for i, error in enumerate(console_errors[:5], 1):
                print(f"  {i}. {error[:100]}")
            if len(console_errors) > 5:
                print(f"  ... 还有 {len(console_errors) - 5} 个错误")
        else:
            print("\n✓ 无控制台错误")

        print("\n详细结果:")
        for r in results:
            status = "✓" if r['success'] else "✗"
            if r['success']:
                print(f"  {status} {r['name']} ({r['path']})")
            else:
                print(f"  {status} {r['name']} ({r['path']}) - {r.get('error', 'Unknown error')}")

        browser.close()

        # 返回成功/失败状态
        return success_count == total_count

if __name__ == '__main__':
    success = test_pages()
    sys.exit(0 if success else 1)
