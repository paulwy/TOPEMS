import asyncio
import websockets
import argparse
import time
import json

async def test_websocket(url: str, duration: int = 60, token: str = None):
    """Test WebSocket connection stability"""
    full_url = f"{url}?token={token}" if token else url
    
    print(f"📡 Connecting to: {full_url}")
    print(f"⏱️  Test duration: {duration} seconds")
    print("=" * 60)
    
    try:
        async with websockets.connect(full_url) as ws:
            start_time = time.time()
            message_count = 0
            heartbeat_count = 0
            
            print(f"✅ Connected at {time.strftime('%H:%M:%S')}")
            
            async def receive_messages():
                nonlocal message_count, heartbeat_count
                async for message in ws:
                    try:
                        data = json.loads(message)
                        if data.get('type') == 'connected':
                            print(f"📩 Received: connected - {data.get('message')}")
                        message_count += 1
                    except:
                        heartbeat_count += 1
            
            receiver_task = asyncio.create_task(receive_messages())
            
            while time.time() - start_time < duration:
                await asyncio.sleep(1)
                elapsed = int(time.time() - start_time)
                if elapsed % 10 == 0:
                    print(f"⏳ Elapsed: {elapsed}s | Messages: {message_count} | Heartbeats: {heartbeat_count}")
            
            receiver_task.cancel()
            
            elapsed = time.time() - start_time
            print("=" * 60)
            print(f"✅ Test completed successfully!")
            print(f"⏱️  Duration: {elapsed:.1f}s")
            print(f"📩 Messages received: {message_count}")
            print(f"❤️ Heartbeats: {heartbeat_count}")
            
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        return False
    
    return True

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='WebSocket connection tester')
    parser.add_argument('--url', default='ws://localhost:8030/mes/ws/dashboard', help='WebSocket URL')
    parser.add_argument('--duration', type=int, default=60, help='Test duration in seconds')
    parser.add_argument('--token', help='JWT token for authentication')
    
    args = parser.parse_args()
    
    asyncio.run(test_websocket(args.url, args.duration, args.token))