import asyncio
import json
import time
import websockets

TEST_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"

async def test_heartbeat_direct():
    print("=== Test 1: Direct connection with heartbeat ===")
    try:
        async with websockets.connect(f'ws://localhost:8030/mes/ws/dashboard?token={TEST_TOKEN}', ping_interval=None) as ws:
            print("✅ Connected directly to backend")
            msg = await ws.recv()
            data = json.loads(msg)
            print(f"📩 Connected message: type={data.get('type')}")
            
            heartbeat_count = 0
            start_time = time.time()
            
            while time.time() - start_time < 65:
                msg = await asyncio.wait_for(ws.recv(), timeout=40)
                data = json.loads(msg)
                if data.get('type') == 'heartbeat':
                    heartbeat_count += 1
                    print(f"💓 Heartbeat #{heartbeat_count} received")
                else:
                    print(f"📩 Received: {msg[:100]}")
            
            elapsed = time.time() - start_time
            print(f"✅ Direct connection test passed! Duration: {elapsed:.1f}s, Heartbeats: {heartbeat_count}")
            return True
    except Exception as e:
        print(f"❌ Direct connection error: {e}")
        return False

async def test_heartbeat_proxy():
    print("\n=== Test 2: Proxy connection with heartbeat ===")
    try:
        async with websockets.connect(f'ws://localhost:3000/mes/ws/dashboard?token={TEST_TOKEN}', ping_interval=None) as ws:
            print("✅ Connected via Vite proxy")
            msg = await ws.recv()
            data = json.loads(msg)
            print(f"📩 Connected message: type={data.get('type')}")
            
            heartbeat_count = 0
            start_time = time.time()
            
            while time.time() - start_time < 65:
                msg = await asyncio.wait_for(ws.recv(), timeout=40)
                data = json.loads(msg)
                if data.get('type') == 'heartbeat':
                    heartbeat_count += 1
                    print(f"💓 Heartbeat #{heartbeat_count} received")
                else:
                    print(f"📩 Received: {msg[:100]}")
            
            elapsed = time.time() - start_time
            print(f"✅ Proxy connection test passed! Duration: {elapsed:.1f}s, Heartbeats: {heartbeat_count}")
            return True
    except Exception as e:
        print(f"❌ Proxy connection error: {e}")
        return False

async def test_reconnection():
    print("\n=== Test 3: Reconnection test ===")
    try:
        async with websockets.connect(f'ws://localhost:3000/mes/ws/dashboard?token={TEST_TOKEN}', ping_interval=None) as ws:
            msg = await ws.recv()
            print("✅ First connection successful")
            
            await ws.close()
            print("🔌 Connection closed by client")
            
        await asyncio.sleep(1)
        
        async with websockets.connect(f'ws://localhost:3000/mes/ws/dashboard?token={TEST_TOKEN}', ping_interval=None) as ws:
            msg = await ws.recv()
            print("✅ Reconnection successful")
            return True
    except Exception as e:
        print(f"❌ Reconnection error: {e}")
        return False

async def main():
    r1 = await test_heartbeat_direct()
    r2 = await test_heartbeat_proxy()
    r3 = await test_reconnection()
    
    print("\n" + "="*60)
    print(f"Direct with heartbeat: {'PASS' if r1 else 'FAIL'}")
    print(f"Proxy with heartbeat: {'PASS' if r2 else 'FAIL'}")
    print(f"Reconnection: {'PASS' if r3 else 'FAIL'}")
    
    if r1 and r2 and r3:
        print("\n🎉 All tests PASSED! WebSocket connection is stable.")
    else:
        print("\n❌ Some tests FAILED!")

if __name__ == "__main__":
    asyncio.run(main())
