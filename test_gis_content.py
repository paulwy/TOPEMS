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
    page.screenshot(path='/tmp/gis_page_content.png', full_page=True)
    
    # Check for Paper container
    print("\nChecking for GIS page container...")
    try:
        paper_containers = page.locator('.MuiPaper-root')
        paper_count = paper_containers.count()
        print(f"Found {paper_count} Paper container(s)")
        
        # Find the Paper with height >= 500px (the map container)
        for i in range(paper_count):
            paper = paper_containers.nth(i)
            box = paper.bounding_box()
            if box and box['height'] >= 500:
                print(f"\nPaper {i+1}: {box['width']}x{box['height']}px - likely the map container")
                
                # Get inner HTML
                inner_html = paper.inner_html()
                print(f"Inner HTML length: {len(inner_html)} characters")
                
                # Print first 2000 characters of inner HTML
                print("\nFirst 2000 characters of inner HTML:")
                print(inner_html[:2000])
                
                # Check for specific keywords
                print("\nKeyword checks:")
                print(f"  'leaflet': {'✓' if 'leaflet' in inner_html.lower() else '✗'}")
                print(f"  'mapbox': {'✓' if 'mapbox' in inner_html.lower() else '✗'}")
                print(f"  'amap': {'✓' if 'amap' in inner_html.lower() else '✗'}")
                print(f"  'MapView': {'✓' if 'MapView' in inner_html else '✗'}")
                print(f"  'MapContainer': {'✓' if 'MapContainer' in inner_html else '✗'}")
                print(f"  'TileLayer': {'✓' if 'TileLayer' in inner_html else '✗'}")
                print(f"  'offline_tiles': {'✓' if 'offline_tiles' in inner_html else '✗'}")
                
                # Check for any div elements
                divs_in_paper = paper.locator('div').all()
                print(f"\nFound {len(divs_in_paper)} div elements inside Paper")
                
                # Check for any buttons (should have tool buttons)
                buttons_in_paper = paper.locator('button').all()
                print(f"Found {len(buttons_in_paper)} button elements inside Paper")
                
                if len(buttons_in_paper) > 0:
                    print("\nButton texts found:")
                    for j, button in enumerate(buttons_in_paper[:10]):  # Show first 10
                        try:
                            text = button.text_content()
                            if text:
                                print(f"  Button {j+1}: '{text.strip()}'")
                        except:
                            pass
                
                # Check for any SVG icons (should have tool icons)
                svgs_in_paper = paper.locator('svg').all()
                print(f"\nFound {len(svgs_in_paper)} SVG elements inside Paper")
                
                # Check for any images
                imgs_in_paper = paper.locator('img').all()
                print(f"Found {len(imgs_in_paper)} img elements inside Paper")
                
                break  # Only check the first large Paper
    except Exception as e:
        print(f"Error: {e}")
    
    # Check console for errors
    print("\n\nConsole logs:")
    console_messages = []
    page.on("console", lambda msg: console_messages.append(f"{msg.type}: {msg.text}"))
    
    # Reload to capture console
    page.reload()
    page.wait_for_load_state('networkidle')
    time.sleep(2)
    
    if console_messages:
        for msg in console_messages:
            print(f"  {msg}")
    else:
        print("  No console messages")
    
    print("\nScreenshot saved to /tmp/gis_page_content.png")
    browser.close()