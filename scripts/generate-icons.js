// Renders scripts/icon-template.html (an inline SVG "wave + moon" mark for 凪)
// into the app icon / splash / adaptive-icon PNGs via headless Chromium.
// Not part of the app bundle — a one-off asset generator, run manually:
//   node scripts/generate-icons.js
'use strict';
const path = require('path');
const { chromium } = require('playwright');

const TEMPLATE = 'file://' + path.join(__dirname, 'icon-template.html');
const OUT = (name) => path.join(__dirname, '..', 'assets', name);
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

async function shot(page, file, { size = 1024, transparent = false } = {}) {
  await page.setViewportSize({ width: size, height: size });
  await page.screenshot({ path: file, omitBackground: transparent });
  console.log('wrote', path.relative(process.cwd(), file));
}

async function main() {
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
  const page = await browser.newContext({ viewport: { width: 1024, height: 1024 } }).then((c) => c.newPage());
  await page.goto(TEMPLATE, { waitUntil: 'load' });

  // 1. Full app icon (background + mark), 1024x1024, opaque — iOS/App Store/web.
  await shot(page, OUT('icon.png'));

  // 2. Splash mark: transparent background, mark only. app.json's splash
  //    backgroundColor (#0F1614) shows behind it.
  await page.evaluate(() => { document.getElementById('bgRect').style.display = 'none'; });
  await shot(page, OUT('splash-icon.png'), { transparent: true });

  // 3. Android adaptive icon foreground: mark only, shrunk + centered into the
  //    ~66% "safe zone" so circular/squircle launcher masks don't clip it.
  await page.evaluate(() => {
    document.getElementById('mark').setAttribute('transform', 'translate(512 512) scale(0.72) translate(-512 -509)');
  });
  await shot(page, OUT('android-icon-foreground.png'), { transparent: true });

  // 4. Android adaptive icon background layer: gradient only, no mark.
  await page.evaluate(() => {
    document.getElementById('mark').style.display = 'none';
    document.getElementById('bgRect').style.display = 'block';
  });
  await shot(page, OUT('android-icon-background.png'));

  // 5. Android themed/monochrome icon: single-color silhouette, transparent bg.
  await page.evaluate(() => {
    document.getElementById('bgRect').style.display = 'none';
    const mark = document.getElementById('mark');
    mark.style.display = 'block';
    mark.querySelectorAll('circle, path').forEach((el) => {
      el.setAttribute('fill', el.tagName === 'path' ? 'none' : '#FFFFFF');
      if (el.tagName === 'path') el.setAttribute('stroke', '#FFFFFF');
      el.removeAttribute('opacity');
    });
  });
  await shot(page, OUT('android-icon-monochrome.png'), { transparent: true });

  // 6. Favicon: full icon rendered small and crisp (SVG scales natively).
  await page.evaluate(() => {
    document.getElementById('bgRect').style.display = 'block';
    const mark = document.getElementById('mark');
    mark.style.display = 'block';
    mark.removeAttribute('transform');
    mark.querySelectorAll('#moon').forEach((el) => el.setAttribute('fill', 'url(#moonGrad)'));
    mark.querySelectorAll('#waveBack').forEach((el) => { el.setAttribute('stroke', 'url(#waveMid)'); el.setAttribute('opacity', '0.55'); });
    mark.querySelectorAll('#waveFront').forEach((el) => el.setAttribute('stroke', 'url(#waveTop)'));
    document.getElementById('art').setAttribute('width', '256');
    document.getElementById('art').setAttribute('height', '256');
  });
  await shot(page, OUT('favicon.png'), { size: 256 });

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
