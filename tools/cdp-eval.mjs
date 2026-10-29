/**
 * tools/cdp-eval.mjs · 极简 CDP 求值器（仅用于本地验收，不参与线上）
 * 用法：node tools/cdp-eval.mjs "<js 表达式>" [端口]
 * 前提：已用 --remote-debugging-port 启动 Edge/Chrome 并打开了目标页
 * 依赖：Node 22 内置 WebSocket，无需 npm install
 */

const expr = process.argv[2] || '1+1';
const port = process.argv[3] || 9222;

const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
const page = targets.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
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
