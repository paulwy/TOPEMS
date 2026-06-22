from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    
    # Navigate to the plugin marketplace page
    page.goto('http://localhost:3001/iam/plugins')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(3000)  # Wait for any async data to load
    
    # Take a screenshot
    page.screenshot(path='/tmp/plugin_marketplace.png', full_page=True)
    
    # Get page content for debugging
    content = page.content()
    
    # Check for plugin cards or content
    print("Page title:", page.title())
    
    # Look for any plugin-related content
    if "插件" in content:
        print("Found plugin-related content on page")
    
    # Check for the specific plugins we registered
    plugins_found = []
    if "人力资源" in content:
        plugins_found.append("HRM (人力资源管理)")
    if "供应链" in content:
        plugins_found.append("SCM (供应链管理)")
    if "仓储" in content:
        plugins_found.append("WMS (仓储管理)")
    
    if plugins_found:
        print("Plugins found on page:")
        for plugin in plugins_found:
            print(f"  - {plugin}")
    else:
        print("No registered plugins found on page yet")
    
    browser.close()
    print("Screenshot saved to /tmp/plugin_marketplace.png")