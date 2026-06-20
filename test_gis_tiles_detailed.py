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
    time.sleep(5)
    
    # Take screenshot
    print("Taking screenshot...")
    page.screenshot(path='/tmp/gis_page_full.png', full_page=True)
    
    # Check page title
    print(f"\nPage title: {page.title()}")
    
    # Check for loading indicators
    print("\nChecking for loading indicators...")
    try:
        loading_spinners = page.locator('.MuiCircularProgress-root')
        spinner_count = loading_spinners.count()
        print(f"Found {spinner_count} loading spinner(s)")
        if spinner_count > 0:
            print("Page might still be loading...")
    except Exception as e:
        print(f"Error checking loading indicators: {e}")
    
    # Check for Paper container (GIS page container)
    print("\nChecking for GIS page container...")
    try:
        paper_containers = page.locator('.MuiPaper-root')
        paper_count = paper_containers.count()
        print(f"Found {paper_count} Paper container(s)")
        
        # Check if there's a Paper with height 500px
        for i in range(paper_count):
            paper = paper_containers.nth(i)
            box = paper.bounding_box()
            if box and box['height'] >= 500:
                print(f"  Paper {i+1}: {box['width']}x{box['height']}px - likely the map container")
                
                # Check what's inside this Paper
                inner_html = paper.inner_html()
                print(f"  Inner HTML length: {len(inner_html)} characters")
                
                # Check for specific elements inside
                has_leaflet = 'leaflet' in inner_html.lower()
                has_mapbox = 'mapbox' in inner_html.lower()
                has_amap = 'amap' in inner_html.lower()
                print(f"  Contains 'leaflet': {has_leaflet}")
                print(f"  Contains 'mapbox': {has_mapbox}")
                print(f"  Contains 'amap': {has_amap}")
    except Exception as e:
        print(f"Error checking Paper containers: {e}")
    
    # Check for Leaflet map container
    print("\nChecking for Leaflet map container...")
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
            
            # Check if MapView component exists
            print("\nChecking for MapView component...")
            try:
                # Look for the container div that should contain the map
                containers = page.locator('div[style*="position: relative"]')
                container_count = containers.count()
                print(f"Found {container_count} div(s) with position: relative")
                
                # Check for any div with minHeight
                min_height_divs = page.locator('div[style*="min-height"]')
                min_height_count = min_height_divs.count()
                print(f"Found {min_height_count} div(s) with min-height")
                
                if min_height_count > 0:
                    for i in range(min_height_count):
                        div = min_height_divs.nth(i)
                        style = div.get_attribute('style')
                        print(f"  Div {i+1} style: {style}")
            except Exception as e:
                print(f"Error checking MapView: {e}")
    except Exception as e:
        print(f"Error checking map container: {e}")
    
    # Check for tile layers
    print("\nChecking for tile layers...")
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
    console_messages = []
    page.on("console", lambda msg: console_messages.append(f"{msg.type}: {msg.text}"))
    
    # Reload page to capture console logs
    page.reload()
    page.wait_for_load_state('networkidle')
    time.sleep(2)
    
    if console_messages:
        for msg in console_messages:
            print(f"  {msg}")
    else:
        print("  No console messages captured")
    
    # Check for network errors
    print("\nNetwork requests:")
    failed_requests = []
    page.on("requestfailed", lambda req: failed_requests.append(f"Failed: {req.url}"))
    
    # Check for specific tile requests
    tile_requests = []
    page.on("request", lambda req: 
        tile_requests.append(req.url) if "offline_tiles" in req.url or "tile" in req.url else None
    )
    
    # Reload again to capture network requests
    page.reload()
    page.wait_for_load_state('networkidle')
    time.sleep(3)
    
    if tile_requests:
        print(f"Tile requests: {len(tile_requests)}")
        for url in tile_requests[:5]:  # Show first 5
            print(f"  {url}")
    else:
        print("No tile requests found")
    
    if failed_requests:
        print(f"Failed requests: {len(failed_requests)}")
        for url in failed_requests[:5]:  # Show first 5
            print(f"  {url}")
    
    print("\nScreenshot saved to /tmp/gis_page_full.png")
    browser.close()