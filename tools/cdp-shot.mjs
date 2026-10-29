/**
 * tools/cdp-shot.mjs · 移动视口截图（仅本地验收）
 * 用法：node tools/cdp-shot.mjs <输出.png> [宽] [高] ["可选的先执行表达式"]
 * 说明：Edge headless 的最小窗口宽度约 500px，直接 --window-size=390 会得到 492px 视口。
 *       因此这里用 Emulation.setDeviceMetricsOverride 强制 390×844，保证截图与真机一致。
 */
import { writeFileSync } from 'node:fs';

const out = process.argv[2];
const width = Number(process.argv[3] || 390);
const height = Number(process.argv[4] || 844);
const preExpr = process.argv[5] || '';
const port = Number(process.argv[6] || 9222);

if (!out) {
  console.error('缺少输出路径');
  process.exit(1);
}

const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
const page = targets.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
if (!page) {
  console.error('没有可用的页面 target');
  process.exit(1);
}

const ws = new WebSocket(page.webSocketDebuggerUrl);
let seq = 0;
const pending = new Map();

function send(method, params = {}) {
  seq += 1;
  const id = seq;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

ws.addEventListener('message', (event) => {
  const msg = JSON.parse(String(event.data));
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(msg.error.message));
    else resolve(msg.result);
  }
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await new Promise((resolve) => ws.addEventListener('open', resolve));

await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', {
  width,
  height,
  deviceScaleFactor: 1,
  mobile: true
});

if (preExpr) {
  await send('Runtime.evaluate', { expression: preExpr, awaitPromise: true, userGesture: true });
}

await sleep(700);

const shot = await send('Page.captureScreenshot', { format: 'png', fromSurface: true });
writeFileSync(out, Buffer.from(shot.data, 'base64'));
console.log('saved', out, width + 'x' + height);
ws.close();
