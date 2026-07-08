import asyncio
import websockets
import time
import sys

async def test_websocket(url, test_duration=60, token=None):
    if token:
        url = f"{url}?token={token}"
    
    print(f"Testing WebSocket connection to: {url}")
    print(f"Test duration: {test_duration} seconds")
    print("=" * 60)
    
    try:
        async with websockets.connect(url) as ws:
            print(f"✅ Connected successfully at {time.strftime('%H:%M:%S')}")
            
            message_count = 0
            start_time = time.time()
            
            async for message in ws:
                elapsed = time.time() - start_time
                message_count += 1
                print(f"📩 [{time.strftime('%H:%M:%S')}] Received message #{message_count}: {message[:100]}...")
                
                if elapsed >= test_duration:
                    break
            
            duration = time.time() - start_time
            print("=" * 60)
            print(f"✅ Test completed successfully")
            print(f"   - Duration: {duration:.2f} seconds")
            print(f"   - Messages received: {message_count}")
            print(f"   - Connection remained stable!")
            return True
            
    except websockets.exceptions.ConnectionClosed as e:
        duration = time.time() - start_time
        print(f"❌ Connection closed unexpectedly after {duration:.2f} seconds")
        print(f"   Error: {e}")
        return False
    except Exception as e:
        print(f"❌ Failed to connect or unexpected error: {e}")
        return False

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Test MES Dashboard WebSocket connection")
    parser.add_argument("--url", default="ws://localhost:3000/mes/ws/dashboard", help="WebSocket URL")
    parser.add_argument("--duration", type=int, default=60, help="Test duration in seconds")
    parser.add_argument("--token", help="JWT token for authentication")
    
    args = parser.parse_args()
    
    success = asyncio.run(test_websocket(args.url, args.duration, args.token))
    sys.exit(0 if success else 1)