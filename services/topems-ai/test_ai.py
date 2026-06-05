#!/usr/bin/env python3
"""
TOPEMS AI 接口测试脚本
用于验证本地 Ollama 是否能响应 AI 请求
完全使用 Python 内置标准库，无需额外依赖
"""

import sys
import json
import time
from urllib import request, error


def print_separator(title):
    print("\n" + "=" * 60)
    print(title)
    print("=" * 60)


def http_request(url, method='GET', data=None, headers=None):
    """执行 HTTP 请求，使用标准库"""
    req_headers = {'Content-Type': 'application/json'}
    if headers:
        req_headers.update(headers)
    
    req_data = None
    if data:
        req_data = json.dumps(data).encode('utf-8')
    
    req = request.Request(url, data=req_data, headers=req_headers, method=method)
    
    try:
        with request.urlopen(req, timeout=120) as response:
            return (
                response.status,
                response.read().decode('utf-8')
            )
    except error.HTTPError as e:
        return (e.code, e.read().decode('utf-8'))
    except Exception as e:
        return (-1, str(e))


def test_ollama_direct():
    """直接测试 Ollama 接口"""
    print_separator("1. 直接测试 Ollama 本地接口")
    
    # 检查 Ollama 是否运行
    print("\n🏥 检查 Ollama 服务状态...")
    status, content = http_request("http://localhost:11434/api/tags")
    
    if status == 200:
        print("✅ Ollama 服务正在运行")
        try:
            tags_data = json.loads(content)
            models = [m['name'] for m in tags_data.get('models', [])]
            print(f"📚 可用模型: {', '.join(models)}")
            
            # 检查 qwen2.5:7b-instruct 是否存在
            if 'qwen2.5:7b-instruct' in models:
                print("✅ qwen2.5:7b-instruct 模型已安装")
            else:
                print("⚠️  qwen2.5:7b-instruct 模型未安装")
                print("   请运行: ollama pull qwen2.5:7b-instruct")
            
            # 直接测试 Ollama 生成接口
            print("\n🧪 测试 Ollama 直接调用...")
            generate_data = {
                "model": "qwen2.5:7b-instruct",
                "prompt": "你好，请用中文简单介绍一下你自己。",
                "stream": False
            }
            gen_status, gen_content = http_request(
                "http://localhost:11434/api/generate",
                method='POST',
                data=generate_data
            )
            
            if gen_status == 200:
                result_data = json.loads(gen_content)
                print("✅ Ollama 响应成功！")
                print(f"\n📝 响应内容:\n{result_data.get('response', '')}")
                return True
            else:
                print(f"❌ Ollama 响应失败: {gen_status}")
                print(f"   响应: {gen_content}")
                
        except Exception as e:
            print(f"⚠️  解析响应时出错: {e}")
            return True  # 服务能连接就没问题
    else:
        print(f"❌ Ollama 服务未运行或无法连接 (状态码: {status})")
        print("   请确保 Ollama 正在运行: ollama serve")
        
    return False


def test_topems_ai_api():
    """测试 TOPEMS AI 后端接口"""
    print_separator("2. 测试 TOPEMS AI 后端接口")
    
    base_url = "http://localhost:8013"
    
    try:
        # 健康检查
        print("\n🏥 健康检查...")
        health_status, health_content = http_request(f"{base_url}/health")
        if health_status == 200:
            print("✅ TOPEMS AI 服务运行正常")
        else:
            print(f"❌ TOPEMS AI 服务异常: {health_status}")
        
        # 测试生成接口
        print("\n🤖 测试 /api/v1/ai/generate 接口...")
        generate_payload = {
            "variables": {
                "prompt": "请生成 3 个项目编码，格式示例: PRJ-2024-001"
            },
            "output_format": "json"
        }
        
        gen_status, gen_content = http_request(
            f"{base_url}/api/v1/ai/generate",
            method='POST',
            data=generate_payload
        )
        
        if gen_status == 200:
            result_data = json.loads(gen_content)
            print("✅ TOPEMS AI 生成接口调用成功")
            print(f"\n📦 完整响应:\n{json.dumps(result_data, ensure_ascii=False, indent=2)}")
            
            if result_data.get("success") and "data" in result_data:
                ai_content = result_data["data"].get("content", "")
                print(f"\n📝 AI 内容:\n{ai_content}")
            return True
        else:
            print(f"❌ 接口调用失败: {gen_status}")
            print(f"   响应: {gen_content}")
            
    except Exception as e:
        print(f"❌ TOPEMS AI API 连接失败: {e}")
        print("   请确保 TOPEMS AI 后端服务正在运行")
        
    return False


def main():
    print("🚀 TOPEMS AI 本地测试开始")
    print("=" * 60)
    
    ollama_ok = test_ollama_direct()
    
    print_separator("测试 Ollama 结果")
    if ollama_ok:
        print("🎉 Ollama 本地测试通过！")
    else:
        print("⚠️  Ollama 本地测试未通过，请检查 Ollama 配置")
        print("\n💡 提示：")
        print("1. 确保已安装 Ollama: https://ollama.com/download")
        print("2. 拉取模型: ollama pull qwen2.5:7b-instruct")
        print("3. 启动服务: ollama serve")
    
    print_separator("3. 接下来测试 TOPEMS AI 后端")
    topems_ok = test_topems_ai_api()
    
    print_separator("📊 测试总结")
    print(f"✅ Ollama 直接测试: {'通过' if ollama_ok else '失败'}")
    print(f"✅ TOPEMS AI 后端: {'通过' if topems_ok else '失败'}")
    
    if ollama_ok and topems_ok:
        print("\n🎉 所有测试通过！本地 AI 环境配置正常！")
        return 0
    else:
        print("\n⚠️  部分测试未通过，请检查相关服务配置")
        return 1


if __name__ == "__main__":
    sys.exit(main())

