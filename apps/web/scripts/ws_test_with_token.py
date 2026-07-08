import asyncio
import websockets

TEST_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"

async def test_direct():
    print("=== Test 1: Direct connection to backend (port 8030) ===")
    try:
        async with websockets.connect(f'ws://localhost:8030/mes/ws/dashboard?token={TEST_TOKEN}') as ws:
            print("✅ Connected directly to backend")
            msg = await ws.recv()
            print(f"📩 Received: {msg[:100]}")
            await asyncio.sleep(2)
            print("✅ Direct connection test passed")
            return True
    except Exception as e:
        print(f"❌ Direct connection error: {e}")
        return False

async def test_via_proxy():
    print("\n=== Test 2: Connection via Vite proxy (port 3000) ===")
    try:
        async with websockets.connect(f'ws://localhost:3000/mes/ws/dashboard?token={TEST_TOKEN}') as ws:
            print("✅ Connected via Vite proxy")
            msg = await ws.recv()
            print(f"📩 Received: {msg[:100]}")
            await asyncio.sleep(2)
            print("✅ Proxy connection test passed")
            return True
    except Exception as e:
        print(f"❌ Proxy connection error: {e}")
        return False

async def test_no_token():
    print("\n=== Test 3: Proxy connection without token ===")
    try:
        async with websockets.connect('ws://localhost:3000/mes/ws/dashboard') as ws:
            print("✅ Connected via Vite proxy (no token)")
            msg = await ws.recv()
            print(f"📩 Received: {msg[:100]}")
            await asyncio.sleep(2)
            print("✅ No-token connection test passed")
            return True
    except Exception as e:
        print(f"❌ No-token connection error: {e}")
        return False

async def main():
    r1 = await test_direct()
    r2 = await test_via_proxy()
    r3 = await test_no_token()
    print("\n" + "="*60)
    print(f"Direct: {'PASS' if r1 else 'FAIL'}")
    print(f"Proxy with token: {'PASS' if r2 else 'FAIL'}")
    print(f"Proxy no token: {'PASS' if r3 else 'FAIL'}")

if __name__ == "__main__":
    asyncio.run(main())
