// Renders scripts/icon-template.html (a warm "glow embraced by an arc" mark
// for 気配) into the app icon / splash / adaptive-icon PNGs via headless
// Chromium. Not part of the app bundle — run manually:
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

  await shot(page, OUT('icon.png'));

  await page.evaluate(() => { document.getElementById('bgRect').style.display = 'none'; });
  await shot(page, OUT('splash-icon.png'), { transparent: true });

  await page.evaluate(() => {
    document.getElementById('mark').setAttribute('transform', 'translate(512 512) scale(0.72) translate(-473 -519)');
  });
  await shot(page, OUT('android-icon-foreground.png'), { transparent: true });

  await page.evaluate(() => {
    document.getElementById('mark').style.display = 'none';
    document.getElementById('bgRect').style.display = 'block';
  });
  await shot(page, OUT('android-icon-background.png'));

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

  await page.evaluate(() => {
    document.getElementById('bgRect').style.display = 'block';
    const mark = document.getElementById('mark');
    mark.style.display = 'block';
    mark.removeAttribute('transform');
    document.getElementById('embrace').setAttribute('stroke', 'url(#embraceGrad)');
    document.getElementById('embrace').setAttribute('opacity', '0.9');
    document.getElementById('orb').setAttribute('fill', 'url(#orbGrad)');
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
