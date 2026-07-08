import asyncio
import websockets

async def test():
    print("Connecting to ws://localhost:3000/mes/ws/dashboard...")
    try:
        async with websockets.connect('ws://localhost:3000/mes/ws/dashboard') as ws:
            print("✅ Connected successfully")
            msg = await ws.recv()
            print(f"📩 Received: {msg[:100]}")
            await asyncio.sleep(2)
            print("✅ Test passed - connection is stable")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    asyncio.run(test())
