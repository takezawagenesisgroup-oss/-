// Renders scripts/icon-template.html (a "running trail + voice waves" mark for 隣)
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

  // 2. Splash mark: transparent background, mark only.
  await page.evaluate(() => { document.getElementById('bgRect').style.display = 'none'; });
  await shot(page, OUT('splash-icon.png'), { transparent: true });

  // 3. Android adaptive icon foreground: mark only, shrunk + centered into the
  //    ~66% "safe zone" so circular/squircle launcher masks don't clip it.
  //    Mark bounding box is off-center (roughly x:[148,985] y:[372,800]),
  //    so translate its center to canvas center before scaling down.
  await page.evaluate(() => {
    document.getElementById('mark').setAttribute(
      'transform',
      'translate(512 512) scale(0.72) translate(-566.5 -586)'
    );
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
    mark.querySelectorAll('path, circle').forEach((el) => {
      if (el.tagName === 'path') {
        el.setAttribute('fill', 'none');
        el.setAttribute('stroke', '#FFFFFF');
      } else {
        el.setAttribute('fill', '#FFFFFF');
      }
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
    document.getElementById('trail').setAttribute('stroke', 'url(#pathGrad)');
    document.getElementById('wave1').setAttribute('stroke', 'url(#waveGrad)');
    document.getElementById('wave1').setAttribute('opacity', '0.95');
    document.getElementById('wave2').setAttribute('stroke', 'url(#waveGrad)');
    document.getElementById('wave2').setAttribute('opacity', '0.68');
    document.getElementById('wave3').setAttribute('stroke', 'url(#waveGrad)');
    document.getElementById('wave3').setAttribute('opacity', '0.4');
    document.getElementById('dot').setAttribute('fill', 'url(#dotGrad)');
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
