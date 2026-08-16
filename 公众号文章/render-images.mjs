// 将 static/src/*.html 渲染为公众号配图 PNG（2x 高清）
// 用法: node render-images.mjs
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const dir = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(dir, 'static', 'src');
const out = path.join(dir, 'static');

const jobs = [
  { html: 'cover.html', png: 'cover-fullstack-roadmap.png', width: 900, height: 383 },
  { html: 'roadmap-stages.html', png: 'roadmap-stages.png', width: 1080 },
  { html: 'chapter-anatomy.html', png: 'chapter-anatomy.png', width: 1080 },
  { html: 'feedback-loop.html', png: 'feedback-loop.png', width: 1080 },
];

let browser;
try { browser = await chromium.launch({ channel: 'chrome' }); }
catch { browser = await chromium.launch(); }

for (const job of jobs) {
  const page = await browser.newPage({ deviceScaleFactor: 2, viewport: { width: job.width, height: job.height ?? 800 } });
  await page.goto('file://' + path.join(src, job.html));
  await page.waitForTimeout(150);
  const target = job.height ? page.locator('body') : page.locator('body');
  await target.screenshot({ path: path.join(out, job.png) });
  await page.close();
  console.log('✓', job.png);
}
await browser.close();
