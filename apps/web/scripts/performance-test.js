import { chromium } from 'playwright';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  let performanceLog = [];
  
  page.on('console', msg => {
    const text = msg.text();
    console.log('Console:', msg.type(), text);
    if (text.includes('TOPEMS Performance')) {
      try {
        const startIndex = text.indexOf('{');
        const endIndex = text.lastIndexOf('}') + 1;
        const jsonStr = text.substring(startIndex, endIndex);
        const parsed = JSON.parse(jsonStr);
        performanceLog.push(parsed);
      } catch (e) {
        console.log('Failed to parse performance log:', e);
      }
    }
  });
  page.on('pageerror', err => {
    console.log('Page error:', err.message);
  });

  await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
  
  await page.waitForTimeout(8000);
  
  const pageContent = await page.content();
  console.log('Page content length:', pageContent.length);
  
  const metrics = await page.evaluate(async () => {
    return new Promise((resolve) => {
      const paintEntries = performance.getEntriesByType('paint');
      const navEntries = performance.getEntriesByType('navigation');
      
      let fpTime = null;
      let fcpTime = null;
      paintEntries.forEach(entry => {
        if (entry.name === 'first-paint') fpTime = entry.startTime;
        if (entry.name === 'first-contentful-paint') fcpTime = entry.startTime;
      });
      
      let ttiTime = null;
      if (navEntries.length > 0) {
        ttiTime = navEntries[0].domContentLoadedEventEnd - navEntries[0].navigationStart;
      }
      
      let lcpTime = null;
      let clsScore = 0;
      let fidTime = null;
      let observersReady = 0;
      
      const checkReady = () => {
        observersReady++;
        if (observersReady >= 3) {
          resolve({ fp: fpTime, fcp: fcpTime, lcp: lcpTime, tti: ttiTime, cls: clsScore, fid: fidTime });
        }
      };
      
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        if (entries.length > 0) {
          lcpTime = entries[entries.length - 1].startTime;
        }
        checkReady();
      });
      
      try {
        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
      } catch (e) {
        checkReady();
      }
      
      const clsObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (!entry.hadRecentInput) {
            clsScore += entry.value;
          }
        });
        checkReady();
      });
      
      try {
        clsObserver.observe({ type: 'layout-shift', buffered: true });
      } catch (e) {
        checkReady();
      }
      
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        if (entries.length > 0) {
          fidTime = entries[0].processingStart - entries[0].startTime;
        }
        checkReady();
      });
      
      try {
        fidObserver.observe({ type: 'first-input', buffered: true });
      } catch (e) {
        checkReady();
      }
      
      setTimeout(() => {
        resolve({ fp: fpTime, fcp: fcpTime, lcp: lcpTime, tti: ttiTime, cls: clsScore, fid: fidTime });
      }, 5000);
    });
  });

  console.log('\n=== Performance Metrics ===');
  console.log('First Paint (FP):', metrics.fp ? `${metrics.fp.toFixed(2)}ms` : 'Not available');
  console.log('First Contentful Paint (FCP):', metrics.fcp ? `${metrics.fcp.toFixed(2)}ms` : 'Not available');
  console.log('Largest Contentful Paint (LCP):', metrics.lcp ? `${metrics.lcp.toFixed(2)}ms` : 'Not available');
  console.log('Time to Interactive (TTI):', metrics.tti ? `${metrics.tti.toFixed(2)}ms` : 'Not available');
  console.log('First Input Delay (FID):', metrics.fid ? `${metrics.fid.toFixed(2)}ms` : 'Not available');
  console.log('Cumulative Layout Shift (CLS):', metrics.cls !== undefined ? metrics.cls.toFixed(3) : 'Not available');
  
  console.log('\n=== Page Performance Log ===');
  if (performanceLog.length > 0) {
    const latest = performanceLog[performanceLog.length - 1];
    console.log('URL:', latest.url);
    console.log('Device:', latest.deviceType);
    console.log('Connection:', latest.connectionType);
    if (latest.metrics) {
      console.log('Detailed Metrics:');
      console.log('  LCP:', latest.metrics.lcp ? `${latest.metrics.lcp}ms` : 'N/A');
      console.log('  FID:', latest.metrics.fid ? `${latest.metrics.fid}ms` : 'N/A');
      console.log('  TTI:', latest.metrics.tti ? `${latest.metrics.tti}s` : 'N/A');
      console.log('  FCP:', latest.metrics.fcp ? `${latest.metrics.fcp}ms` : 'N/A');
      console.log('  CLS:', latest.metrics.cls !== undefined ? latest.metrics.cls : 'N/A');
      console.log('  TBT:', latest.metrics.tbt ? `${latest.metrics.tbt}ms` : 'N/A');
    }
  }

  await browser.close();
}

run().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});