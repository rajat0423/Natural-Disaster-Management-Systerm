import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const puppeteer = require('../frontend/node_modules/puppeteer-core');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function run() {
  console.log('Launching Chrome to inspect map visibility...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-web-security',
      '--use-gl=angle',
      '--use-angle=d3d11',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
      '--window-size=1536,864'
    ],
    defaultViewport: { width: 1536, height: 864 }
  });

  const page = await browser.newPage();

  const consoleLogs = [];
  page.on('console', msg => {
    consoleLogs.push({ type: msg.type(), text: msg.text() });
    if (msg.type() === 'error' || msg.type() === 'warning') {
      console.log(`[PAGE ${msg.type().toUpperCase()}]:`, msg.text());
    }
  });

  page.on('pageerror', err => {
    console.log('[PAGE EXCEPTION]:', err.message);
  });

  console.log('Navigating to http://127.0.0.1:5173/map...');
  await page.goto('http://127.0.0.1:5173/map', { waitUntil: 'networkidle0', timeout: 30000 });
  await new Promise(r => setTimeout(r, 4000));

  const state = await page.evaluate(() => {
    const v = window.__DRAS_CESIUM_VIEWER__;
    const leafletMap = window.__DRAS_MAP__;
    
    // Check Leaflet DOM
    const leafletContainer = document.querySelector('.leaflet-container');
    const leafletRect = leafletContainer ? leafletContainer.getBoundingClientRect() : null;
    
    // Check Cesium DOM
    const cesiumWidget = document.querySelector('.cesium-widget');
    const cesiumCanvas = document.querySelector('.cesium-widget canvas');
    const cesiumRect = cesiumCanvas ? cesiumCanvas.getBoundingClientRect() : null;

    // Check containers
    const mapWrap = document.querySelector('[data-map-container]') || document.querySelector('.map-container');
    
    return {
      hasCesiumViewer: !!v,
      hasLeafletMap: !!leafletMap,
      leafletRect: leafletRect ? { w: leafletRect.width, h: leafletRect.height, top: leafletRect.top } : null,
      cesiumRect: cesiumRect ? { w: cesiumRect.width, h: cesiumRect.height, top: cesiumRect.top } : null,
      bodyText: document.body.innerText.slice(0, 300),
      currentUrl: window.location.href,
      modeSwitcher: document.querySelector('[data-view-mode]')?.innerText || null
    };
  });

  console.log('DOM & Map State:', JSON.stringify(state, null, 2));

  await page.screenshot({ path: 'scripts/map_debug_screenshot.png' });
  console.log('Screenshot saved to scripts/map_debug_screenshot.png');

  await browser.close();
}

run().catch(err => {
  console.error('Diagnostic error:', err);
  process.exit(1);
});
