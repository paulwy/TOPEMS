from playwright.sync_api import sync_playwright
import time

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    
    # Navigate to GIS page
    print("Navigating to GIS page...")
    page.goto('http://localhost:3001/bi/gis')
    
    # Wait for page to load
    print("Waiting for page to load...")
    page.wait_for_load_state('networkidle')
    
    # Wait a bit more for map to initialize
    time.sleep(3)
    
    # Take screenshot
    print("Taking screenshot...")
    page.screenshot(path='/tmp/gis_page.png', full_page=True)
    
    # Check for Leaflet map container
    print("Checking for Leaflet map container...")
    try:
        map_container = page.locator('.leaflet-container')
        if map_container.count() > 0:
            print(f"✓ Found {map_container.count()} Leaflet map container(s)")
            
            # Check map container size
            box = map_container.first.bounding_box()
            if box:
                print(f"  Map container size: {box['width']}x{box['height']}px")
                if box['width'] > 0 and box['height'] > 0:
                    print("  ✓ Map container has valid dimensions")
                else:
                    print("  ✗ Map container has zero dimensions!")
        else:
            print("✗ No Leaflet map container found!")
    except Exception as e:
        print(f"Error checking map container: {e}")
    
    # Check for tile layers
    print("Checking for tile layers...")
    try:
        tile_layer = page.locator('.leaflet-tile-layer')
        if tile_layer.count() > 0:
            print(f"✓ Found {tile_layer.count()} tile layer(s)")
            
            # Check for tile images
            tiles = page.locator('.leaflet-tile')
            tile_count = tiles.count()
            print(f"  Found {tile_count} tile images")
            
            if tile_count > 0:
                print("  ✓ Tiles are loaded!")
                
                # Check tile URLs
                first_tile = tiles.first
                tile_src = first_tile.get_attribute('src')
                print(f"  First tile URL: {tile_src}")
            else:
                print("  ✗ No tile images found!")
        else:
            print("✗ No tile layer found!")
    except Exception as e:
        print(f"Error checking tile layers: {e}")
    
    # Check console logs
    print("\nConsole logs:")
    page.on("console", lambda msg: print(f"  {msg.type}: {msg.text}"))
    
    # Get page content for debugging
    print("\nPage structure:")
    html = page.content()
    
    # Check for any error messages
    print("\nChecking for visible error messages...")
    try:
        alerts = page.locator('[role="alert"]')
        if alerts.count() > 0:
            print(f"Found {alerts.count()} alert(s)")
            for i in range(alerts.count()):
                alert_text = alerts.nth(i).text_content()
                print(f"  Alert {i+1}: {alert_text}")
        else:
            print("No visible error alerts")
    except Exception as e:
        print(f"Error checking alerts: {e}")
    
    print("\nScreenshot saved to /tmp/gis_page.png")
    browser.close()