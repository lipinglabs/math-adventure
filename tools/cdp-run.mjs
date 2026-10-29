/**
 * tools/cdp-run.mjs · 把一段脚本文件注入页面执行（仅本地验收）
 * 用法：node tools/cdp-run.mjs <脚本.js> [端口] [宽] [高]
 * 说明：cdp-eval 只接受单行表达式，长流程验收写在 txt/ 下的 .js 里更好维护。
 *       脚本内容按「表达式」求值，最后一行若是 return 的写法请包在 (async()=>{...})() 里。
 */

import { readFileSync } from 'node:fs';

const file = process.argv[2];
const port = Number(process.argv[3] || 9222);
const vw = Number(process.argv[4] || 390);
const vh = Number(process.argv[5] || 844);

if (!file) {
  console.error('缺少脚本路径');
  process.exit(1);
}

const expr = readFileSync(file, 'utf8');

const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
const pages = targets.filter((t) => t.type === 'page' && t.webSocketDebuggerUrl);
const page = pages.find((t) => /^https?:/.test(t.url)) || pages[0];
if (!page) {
  console.error('没有可用的页面 target');
  process.exit(1);
}

const ws = new WebSocket(page.webSocketDebuggerUrl, { perMessageDeflate: false });
let id = 0;
const pending = new Map();

function send(method, params = {}) {
  id += 1;
  const msgId = id;
  ws.send(JSON.stringify({ id: msgId, method, params }));
  return new Promise((resolve, reject) => pending.set(msgId, { resolve, reject }));
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

await new Promise((resolve) => ws.addEventListener('open', resolve));

await send('Emulation.setDeviceMetricsOverride', {
  width: vw,
  height: vh,
  deviceScaleFactor: 1,
  mobile: true
});

const result = await send('Runtime.evaluate', {
  expression: expr,
  returnByValue: true,
  awaitPromise: true,
  userGesture: true
});

if (result.exceptionDetails) {
  console.error(JSON.stringify(result.exceptionDetails, null, 2));
  process.exit(2);
}

console.log(typeof result.result.value === 'string'
  ? result.result.value
  : JSON.stringify(result.result.value, null, 2));

ws.close();
