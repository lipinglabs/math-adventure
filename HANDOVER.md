# HANDOVER.md · 交接文档

> 接手顺序：先读 `PROJECT_MATH_RULES.md` 全文，再读本文件。
> 本文件回答「环境长什么样、密钥在哪、怎么推送、怎么验收」。最后更新：2026-10-29（v2 全英文）。

---

## 0. 一分钟速览

| 项目 | 值 |
|---|---|
| 名称 | Math Adventure（math-adventure） |
| 定位 | 3–6 岁幼儿数学启蒙游戏，纯静态网页，**全英文** |
| 仓库 | `lipinglabs/math-adventure`（public） |
| 线上地址 | https://lipinglabs.github.io/math-adventure/ |
| 部署 | GitHub Pages（源 `main` 分支根目录 `/`），推送后 30–60 秒自动重建 |
| 技术形态 | 原生 HTML / CSS / JS，无框架、无构建、无 npm 运行时依赖 |
| 当前进度 | 骨架 + 引擎 + 进度 + 云存档 + 沙盒 + **L1–L12 已完成**（地图已改为 5 大阶段分页） |

---

## 1. 账号与推送

- `gh` 已登录，`gh api user` 返回 `lipinglabs`（配置文件名里仍是旧名 `kh4tzjsjfy-eng`，同一账号）。
- 令牌 scope：`repo`（缺少 `read:org`，不影响本项目）。
- **`git push` 被本机网络/代理拦截（SSL 握手失败），禁止尝试。**

### 推送方式（唯一）

```bash
python tools/push_via_api.py "提交说明"
python tools/push_via_api.py "提交说明" --dry-run   # 只看清单，不推送
```

脚本行为：
1. 递归收集仓库文件，自动排除 `.git/`、`config/secrets.local.json`、`.shots/`、`.edge-profile/`、`tmp/`、`__pycache__/`。
2. 逐个 `POST /git/blobs` → `POST /git/trees`（带 `base_tree`）→ `POST /git/commits` → `PATCH /git/refs/heads/main`。
3. 仓库完全为空时，Git Data API 会返回 `409 Git Repository is empty`；脚本先用 Contents API 写入 `README.md` 制造首个提交，再继续后续流程。
4. 推送前会打印文件清单与体积；**若清单里出现 `secret` / `.local.json` 会直接中止**。

### 部署

- Pages 已开启，源 `main` / 根目录，构建约 30–60 秒。
- 查看构建：`gh api repos/lipinglabs/math-adventure/pages/builds/latest`。
- 核验线上要加 `?cb=<时间戳>` 绕过缓存。

---

## 2. 密钥

> 本文件以及仓库内任何文件都**不得出现完整密钥**。

| 名称 | 用途 | 存放位置 |
|---|---|---|
| `DOUBAO_API_KEY` | 豆包语音合成 2.0（仅构建期） | ① 环境变量 `DOUBAO_API_KEY`；② 本机 `config/secrets.local.json`（已 gitignore） |
| GitHub 令牌 | API 推送 | `gh` CLI 本地凭据 |
| Gist 令牌 | 云存档 | 用户设备 `localStorage`，键 `math-adventure.cloud.v1` |

- 本地密钥文件已就位，内容形如 `{"doubaoApiKey": "62a2…"}`（前缀仅用于核对）。
- `tools/gen_tts.py` 的读取顺序：环境变量 → 本地配置文件；两处都没有则直接退出并提示。
- 页面运行时**不读取任何密钥**，也不请求任何第三方接口。

---

## 3. 目录结构

```
math-adventure/
├─ index.html              骨架：地图屏 / 关卡屏 / 加载遮罩 / 弹层
├─ style.css               全部样式（果冻 / 粘土 + 关卡层）
├─ levels_data.js          地图坐标 + 关卡配置 + 题目数据（纯数据）
├─ engine.js               资源加载 / 进度条 / 音频池 / 动画 / 判定 / 弹层 / 3D 扩展位
├─ progress.js             进度、星级、解锁、合并
├─ cloud.js                Gist 云存档
├─ sandbox.js              连点 5 次 + 口令 123 的开发者后门
├─ app.js                  启动、地图渲染、路由、云存档面板
├─ level-lv01.js           第一关 Apple Addition：3 幕教学 + 10 题
├─ level-lv02.js           第二关 Balloon Take Away：3 幕教学 + 10 题（题目打乱）
├─ level-lv03.js           第三关 Orchard Harvest：3 幕教学 + 10 题（sign / sentence / number 三型）
├─ level-lv04.js           第四关 Ten and Some More：十格阵教学 + 10 题（count / pick / build 三型）
├─ level-lv05.js           第五关 Cookie Party：发饼干场景教学 + 10 题（give / count / pick 三型）
├─ level-lv06.js           第六关 Number Link：2 幕连线教学 + 10 题（link / fill 两型）
├─ level-lv07.js           第七关 Block Build：3 幕积木教学 + 10 题（count / pick / solve 三型）
├─ level-lv08.js           第八关 Car Garage：3 幕车库教学 + 10 题（drag / pick / touch 三型）
├─ level-lv09.js           第九关 Quick Tap：2 幕纯数字教学 + 10 题（tap / wrong / flash 三型）
├─ level-lv10.js           第十关 Bird Branch：3 幕树枝教学 + 10 题（fly / branch / take 三型）
├─ level-lv11.js           第十一关 Candy Share：3 幕糖果教学 + 10 题（take / group / wrong 三型）
├─ level-lv12.js           第十二关 Lightning Math：2 幕纯数字教学 + 10 题（calc / balloon / flash 三型）
├─ level-kit.js            关卡共用：金星 / 银星结算页
├─ manifest.json           Web App 清单（名称 / 图标 / 立屏打开）
├─ icons/                  应用图标：512 / 192 / 180 / 32 / maskable
├─ PROJECT_MATH_RULES.md   项目铁律（最高约束）
├─ HANDOVER.md             本文件
├─ config/
│  └─ secrets.local.json   本机密钥（gitignored，永不提交）
├─ voice/
│  ├─ common/              4 条公共语音（ready / try_again / gold / silver）
│  ├─ lv01/                19 条第一关语音
│  ├─ lv02/                19 条第二关语音
│  ├─ lv03/                22 条第三关语音（8 教学 + 8 符号题 + 3 算式题 + 3 结果题）
│  ├─ lv04/                16 条第四关语音（6 教学 + 4 识数 + 3 匹配 + 3 凑数）
│  ├─ lv05/                17 条第五关语音（7 教学 + 4 发饼干 + 3 识数 + 3 选动物）
│  ├─ lv06/                16 条第六关语音（3 教学 + 4 数字连线 + 4 听音连线 + 5 看图选数）
│  ├─ lv07/                22 条第七关语音（7 教学 + 8 看积木 + 3 选组合 + 4 横式填空）
│  ├─ lv08/                22 条第八关语音（8 教学 + 8 拖车题 + 3 选车库 + 3 横式点数字）
│  ├─ lv09/                12 条第九关语音（4 教学 + 4 纯算式 + 1 找错句 + 3 闪电题）
│  ├─ lv10/                17 条第十关语音（6 教学 + 4 飞走题 + 1 共用问句 + 3 选树枝 + 3 消除题）
│  ├─ lv11/                15 条第十一关语音（6 教学 + 4 拖糖题 + 1 共用问句 + 3 选糖果组 + 1 找错句）
│  ├─ lv12/                16 条第十二关语音（6 教学 + 4 纯算式 + 3 气球题 + 3 闪电题）
│  └─ lines/               台词清单 JSON（生成脚本的输入）
├─ tools/
│  ├─ gen_tts.py           豆包 TTS 批量生成（--probe 试听 / --dry-run 校验）
│  ├─ push_via_api.py      Git Data API 推送
│  ├─ cdp-eval.mjs         本地验收：390×844 视口下执行表达式
│  ├─ cdp-shot.mjs         本地验收：移动视口截图
│  └─ cdp-reload.mjs       本地验收：关缓存硬刷新
└─ docs/
   ├─ CURRICULUM.md        全游戏大纲：5 阶段 48 关（唯一事实来源）
   ├─ LEVEL_01_DESIGN.md   第一关台词与动画方案（已实现）
   ├─ LEVEL_02_DESIGN.md   第二关台词与动画方案（已实现）
   ├─ LEVEL_03_DESIGN.md   第三关台词与动画方案（已实现）
   └─ LEVEL_04_DESIGN.md   第四关台词与动画方案（已实现）
```

---

## 4. 本地运行

```bash
cd math-adventure
python -m http.server 8765 --bind 127.0.0.1
# 浏览器打开 http://127.0.0.1:8765/index.html
```

不要用 `file://` 直接打开：`localStorage` 在部分浏览器会抛 `SecurityError`，云存档无法验证。

### 验收参数（不影响正常入口）

| URL | 效果 |
|---|---|
| `index.html?quick=1` | 跳过三幕教学，直接进题（验收 10 题与结算用） |
| `index.html?demo=loader` | 进入关卡时额外伪造 12 个素材，便于观察进度条 |
| `index.html?demo=fail` | 伪造一个加载失败，验证「重新加载」按钮 |

---

## 5. 语音生成流程（全英文）

1. 编辑台词清单：`voice/lines/lv01.json`（English only，禁止中文字符与阿拉伯数字）。
2. 先校验，不花钱：

```bash
python tools/gen_tts.py voice/lines/lv01.json --out voice/lv01 --dry-run
```

3. 确认无误后生成（音色固定 Allison，语速 -15）：

```bash
python tools/gen_tts.py voice/lines/common.json --out voice/common
python tools/gen_tts.py voice/lines/lv01.json --out voice/lv01
```

4. 把生成的文件名写进 `levels_data.js` 对应关卡的 `assets.audio`。
5. 单条试听（不写清单）：

```bash
python tools/gen_tts.py --probe --text "One plus one equals two." --lang en --mood teach --out tmp/probe.mp3
```

**注意**：已存在的 mp3 默认跳过；重做必须 `--force`，单条用 `--only`。豆包输出有随机性，同一句两次生成结果不同，不要反复重跑。

---

## 6. 验收命令

```bash
# 语法
for f in *.js; do node --check "$f"; done

# 启动带调试端口的浏览器（后台）
"C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" \
  --headless=new --disable-gpu --remote-debugging-port=9222 \
  --user-data-dir=.edge-profile --window-size=390,844 \
  "http://127.0.0.1:8765/index.html?quick=1"

# 改动脚本/样式后必须硬刷新（否则测的是缓存）
node tools/cdp-reload.mjs

# 零中文断言（含 aria-label / placeholder）
node tools/cdp-eval.mjs "(()=>{const c=/[\u3400-\u9fff\u3000-\u303f\uff00-\uffef]/;const bad=[];document.querySelectorAll('[aria-label],[placeholder]').forEach(e=>['aria-label','placeholder'].forEach(a=>{const v=e.getAttribute(a);if(v&&c.test(v))bad.push(a+':'+v)}));return JSON.stringify({body:c.test(document.body.innerText),bad});})()"

# 音频全解码
node tools/cdp-eval.mjs "(async()=>{const f=['common/ready','common/try_again','common/gold','common/silver','lv01/t1_a','lv01/t1_b','lv01/t1_c','lv01/t1_d','lv01/t2_a','lv01/t2_b','lv01/t2_c','lv01/t2_d','lv01/t3_a','lv01/q1','lv01/q2','lv01/q3','lv01/q4','lv01/q5','lv01/q6','lv01/q7','lv01/q8','lv01/q9','lv01/q10'];const bad=[];for(const k of f){const d=await new Promise(r=>{const a=new Audio();a.onloadedmetadata=()=>r(a.duration);a.onerror=()=>r(0);a.src='voice/'+k+'.mp3';setTimeout(()=>r(-1),6000)});if(!(d>0))bad.push(k)}return JSON.stringify({total:f.length,bad});})()"

# 截图
node tools/cdp-shot.mjs .shots/map.png 390 844
```

已通过的验收项（2026-10-29）：

- `node --check` 全部脚本通过；
- 23 条 mp3 全部可解码，总时长 79.9 秒；
- 全流程 `document.body.innerText` 与 `aria-label` / `placeholder` 均不含 CJK；
- 390×844 下地图 / 教学 / 答题 / 结算 / 加载 / 弹层无溢出、无重叠；
- 10 题全对 → `gold` 且 `unlockedLevel = 2`；错一题 → `silver` 且 `unlockedLevel = 1`；
- 每题 4 个选项；连续答错时，整体顺序与正确答案位置每次都改变，选项集合不变；
- L2 教学实测：问句结束后 **1.10 秒**接答案语音，问答闭环成立；
- L2 十题全对 → `gold`，`unlockedLevel = 3`；
- 银星 → 金星可升级，金星不会被银星降级；
- 合并函数：`unlockedLevel` 取最大、星级取最高、`cleared` 取并集；
- 沙盒口令错误时弹层不关闭；口令正确后全解锁且 `localStorage` 不被改写；
- 无效 Gist 令牌返回英文错误提示，且不残留令牌；
- 冷缓存首次进入：`downloaded = 23`、读条出现一次；二次进入：`downloaded = 0`、读条不出现；
- 答题瞬间旧语音立即停止：答对后 300ms 播放中的 audio 为 0，下一题开始后为 1；
- 位置稳定（§5.7）：L2 答题飞走气球前后，全部 `slot` 坐标 `dx = dy = 0`；教学第二幕飞走上排两只后，下排三个仍在 `61/153/245 × 458`；
- L3 三种题型各验一次：7 只动物 / 5 只气球 / 8 枚苹果离场后，剩余物件 `dx = dy = 0`；
- L3 22 条语音全部可解码（合计 93.8 秒），十题全对 `gold`、`unlockedLevel = 4`；
- L3 答错后：符号题 2 个、算式题 3 个、数字题 3 个，选项集合不变、顺序与答案位置都变；
- L4 22 条语音可解码（合计 60.5 秒）；十格阵实测 2 行 × 5 列，左上先填；
- L4 十题全对 `gold`、`unlockedLevel = 5`；拖拽（Pointer）命中右阵才落子，点框兜底可用；
- 教学第二幕 5 只气球按「上 2 下 3」两排排布，行宽 176 / 268 ≤ 卡片内容宽 308，不再溢出屏幕；
- L5 21 条语音（17 关内 + 4 公共）全部可解码，合计 71.2 秒；十题全对 `gold`、`unlockedLevel = 6`；
- L5 四道发饼干题实测盒内 10 块、盘上 6 / 3 / 8 / 2 块，`is-packed` / `is-ready` 均触发；
- L5 拖拽热区实测：目标右边界外 **13px** 落子、外 **16px** 不落子，ghost 全部清理；
- L5 地图 5 节点：最低标签底边 764px、底部提示顶边 779px，留白 15px，无重叠。
- L6 20 条语音（16 关内 + 4 公共）全部可解码，合计 72.7 秒 / 569KB；十题全对 `gold`、`unlockedLevel = 7`；
- L6 连线一笔画出：拖动中临时虚线恰好 1 条，落手后残留 `lines = 1`、`is-on = 1`、`linked = 2`；
- L6 连错：红线 `badDrawn = 1`，560ms 后 `lines = 0` / `linked = 0` / `done = 0`，`try_again` 播 1 次、题目不前进；
- L6 连线热区实测：目标卡右边界外 **13px** 连得上、外 **16px** 连不上（`armed = 0`）；两下轻点同样能连；
- L6 看图选数答错重排 `[19,18,16] → [16,19,18]`，答案位置 0 → 1，题目不前进；
- L6 地图 6 节点（`y = 526 / 433 / 340 / 247 / 154 / 61`）：最低标签底边 772px、底部提示顶边 779px，无重叠；
- L7 26 条语音（22 关内 + 4 公共）全部可解码，合计 78.8 秒 / 617KB；十题全对 `gold`、`unlockedLevel = 8`；
- L7 四道看积木题：场上积木数 4 / 2 / 3 / 6，答案键 16 / 15 / 18 / 19 均在选项中；三道选组合题卡片零散数互不相同；
- L7 三道横式题：拖拽中 ghost 恰好 1 个，松手后空位填入 17 / 18 / 19 并自动进下一题；
- L7 空格热区：外 **13px** 能落入、外 **16px** 弹回（ghost 320ms 后从 DOM 移除、题号不前进）；
- L7 答错重排：横式 `[17,16,18] → [16,17,18]`（答案 0→1）、数字键 `[15,18,16] → [16,18,15]`（答案 2→0）、积木卡 `[2,8,5] → [5,8,2]`（答案 0→2）；
- L7 位置稳定：新积木落位前后，原有 4 块积木与那一捆的坐标 `dx = dy = 0`；
- L7 地图 7 节点：最小间距 11px、最低标签底边 769px vs 底部提示顶边 779px、最高圆盘顶 91px（地图框顶 76px）；
- L7 缓存：清空后首进 692ms（22 个请求 / 525KB，读条出现），二次进入 195ms、读条不出现；
- L8 26 条语音（22 关内 + 4 公共）全部可解码，合计 90.8 秒 / 711KB；十题全对 `gold`、`unlockedLevel = 9`；
- L8 四道拖车题：初始车位 3/4/1/6 辆、车道 2/3/5/2 辆，拖完（拖拽 + 轻点两条路径）后为 5/7/6/8 辆；
- L8 车库热区：个位车库右边界外 **13px** 能落入（车位 +1、车道 −1）、外 **16px** 不落子且 ghost 清空；
- L8 答错重排：数字键 `[14,16,15] → [15,14,16]`（答案 2→0）、车库卡 `[1x3,2x4,2x3] → [2x3,2x4,1x3]`（答案 2→0）、横式 `[18,17,16] → [17,18,16]`（答案 1→0）；
- L8 位置稳定：车辆落位前后已停 3 辆 `dx = dy = 0`，十位车库与整栋楼 `0/0`；托盘预留高度后不再被顶起；
- L8 地图 8 节点：最小间距 10px、最低标签底边 771px vs 提示 779px、最高圆盘顶 87px（框顶 76px）；
- L8 缓存：清空后首进 677ms（22 个请求 / 619KB，读条出现），二次进入 186ms、读条不出现；
- L9 16 条语音（12 关内 + 4 公共）全部可解码，合计 61.1 秒 / 478KB；十题全对 `gold`、`unlockedLevel = 10`；
- L9 四道纯算式题点对后结果格变成 17 / 16 / 18 / 19；三道找错句每组恰好一句错，点错会重排且不跳题；
- L9 闪电题超时：5.3 秒后题目不变、`is-out` = 1、`try_again` 播 1 次，再 1 秒进度条 `scaleX(1)` 重新计时；
- L9 闪电题点错：`[18,16,17] → [18,17,16]`（答案 2→1）并重新起表；答对后进度条立刻 `scaleX(0)`；
- L9 地图 9 节点：最小间距 6px、最低标签底边 767px vs 提示 779px、最高圆盘顶 92px（框顶 76px）；
- L9 缓存：清空后首进 691ms（12 个请求 / 386KB，读条出现），二次进入 124ms、读条不出现；
- L10 21 条语音（17 关内 + 4 公共）全部可解码，合计 72.5 秒 / 567KB；十题全对 `gold`、`unlockedLevel = 11`；
- L10 四道飞走题：16→12、17→12、18→15、15→11（`gone` 分别为 4/5/3/4），选项都含正确答案；
- L10 三道树枝题：三张卡鸟数 `17,15,18` / `16,19,14` / `15,17,13`，各有一张等于听到的总数；
- L10 三道消除题：19 点 6 只剩 13、17 点 4 只剩 13、18 点 7 只剩 11；顶部圆点灭 6/4/7 颗，0.42 秒后才出选项；
- L10 位置稳定：点掉 3 只后全部 19 只鸟与 19 个格位坐标 `dx = dy = 0`，树枝与整棵树 `0/0`，此时仍未出选项；
- L10 答错重排：飞走题 `[12,14,13] → [14,12,13]`（0→1）、树枝卡 `[7,8,5] → [5,7,8]`（1→2）、消除题 `[11,14,13] → [11,13,14]`（2→1），三型都停原题、`try_again` 各 1 次；
- L10 缓存：清空后首进 678ms（17 个请求 / 475KB，读条出现），二次进入 167ms、读条不出现；
- 地图分页：Stage 1 = 3 节点 1 页、Stage 2 = 7 节点 2 页（4+3）；滑动 40px 不翻页、200px 翻一页、末页左滑不动；打完 L3 自动滑到 Stage 2，重打 L1 不被拽走；首/末阶段按钮 `disabled`；
- L11 19 条语音（15 关内 + 4 公共）全部可解码，合计 69.9 秒 / 547KB；十题全对 `gold`、`unlockedLevel = 12`；
- L11 四道拖糖题：零散 7 / 8 / 6 / 9 颗，拖完盘里 4 / 5 / 2 / 4 颗，拖动中 ghost 1 个、松手后 0 个；
- L11 盘热区：盘右边界外 **13px** 落得进、外 **16px** 弹回（ghost 清空、零散组不变、无 `try_again`）；轻点糖果同样落盘；
- L11 三道选组题：三张卡总数 `15,18,16` / `17,16,18` / `16,15,14`，各有一张等于听到的总数；
- L11 三道找错句：每组恰好一句 `a − b ≠ shown`；点「正确句」记错并重排、无对勾；点错句后 `16-4=11 → 16-4=12`、卡片转绿 + 1 个对勾、定格 1.5 秒再进下一题；
- L11 位置稳定：拖走 2 颗后 7 颗糖与 7 个格位 `dx = dy = 0`，整行与盒子 `0/0`，此时仍未出选项；
- L11 答错重排：数字键 `[12,13,14] → [14,12,13]`（1→2）、组合 `[5,8,6] → [6,8,5]`（2→0）、句子 `14-2=12 | 16-4=11 | 15-3=12 → 16-4=11 | 14-2=12 | 15-3=12`；
- L11 缓存：清空后首进 676ms（15 个请求 / 455KB，读条出现），二次进入 145ms、读条不出现；
- 地图分页：Stage 2 扩到 8 节点后自动变成 2 页（4+4），总页数 `[3,4,4]`；
- L12 20 条语音（16 关内 + 4 公共）全部可解码，合计 72.6 秒 / 568KB；十题全对 `gold`、`unlockedLevel = 13`；
- L12 闪电题进度条：起表 0.6 秒后 `scaleX(0.873)`，5 秒走完停在 0；超时后题目不变、`is-out` = 1、`try_again` 1 次、1.4 秒后重新起表；
- L12 闪电点错：`[14,13,12] → [13,12,14]`（1→0）并重新起表；答对瞬间 `scaleX(0)` 且条体 `is-done`；
- L12 三型答错：A `[13,15,14] → [15,14,13]`（2→1）、B `[12,13,14] → [13,12,14]`（1→0）、C 见上，三型都停原题、`try_again` 各 1 次；
- L12 气球题答对：气球 `is-right` 1 个、数字转绿、算式卡空格填上答案（空白砖移除）；
- L12 教学：16 块积木 → `16−4=?`（拆成 1|6 两块）→ 个位 6/4 转红 → 结果 1 金 2 绿；竖式 `1|6|_|4|1|2`（十位金 2、个位红 3）；
- L12 缓存：清空后首进 703ms（16 个请求 / 476KB，读条出现），二次进入 126ms、读条不出现；
- 地图分页：Stage 2 扩到 9 节点后变成 2 页（5+4），总页数 `[3,5,4]`；滑动 40px 不翻页、200px 翻一页；

- L5 提交机制：放 3 块不判对；补齐到正好 16 块仍不判对；按对勾才进下一题；放 18 块（超量 2）提交 → 判错同题、`try_again` 1 次、出现「拿回」手势；拿回一块 18→17 且其余 17 块 `dx = dy = 0`；回到 16 块提交 → 判对；
- L5 十题全流程：4 道 give 全部 `noAuto = true`（放满也不自动判对），提交后 `gold`；
- L4 提交机制：放 2 个不判对；放满 5 个也不判对；放到上限 8 个提交 → 判错同题 + 「拿回」手势；拿回 8→7 且其余苹果 `dx = dy = 0`；回到 5 个提交 → 判对；
- L4 十题全流程：3 道 build 全部 `noAuto = true`，提交后 `gold`；
- L4 / L5 拖拽回归：ghost 恰好 1 个、松手落子 +1、轻点饼干堆也 +1、ghost 全部清理；

---

## 7. 已知坑（都是实测踩过的）

1. **Edge headless 最小窗口宽度约 500 px**：`--window-size=390,844` 实际得到 492 px 视口，右侧元素会被裁掉。截图与求值都必须用 `Emulation.setDeviceMetricsOverride`（三个 cdp 工具已封装）。
2. **CDP 的 Emulation 覆盖随连接关闭而失效**：换一个工具连接就要重新设置，否则会出现「量出来 492、截图 390」的口径不一致。
3. **浏览器会缓存 JS/CSS**：改完必须 `node tools/cdp-reload.mjs`（内部 `Network.setCacheDisabled` + `Page.reload({ignoreCache:true})`），否则测的是旧版本。
4. **Allison 只支持英文**：用她读中文会返回空音频（`code` 正常但无 `data` 帧）。本项目已全面英文，不再需要任何中文音色。
5. **`context_texts` 放错位置会被静默忽略**：必须在 `additions` 的 JSON 字符串里。
6. **iOS 音频元素数量上限**：一次创建几十个 `<audio>` 后会静默失声。`engine.js` 限 40 个并在退关释放。
7. **`git push` 一定失败**，不要浪费时间去试代理。
8. **`--dump-dom` 不会等异步渲染完成**，验证交互要用 CDP。
9. **Cache Storage 只在 https / localhost 生效**：`file://` 下会退化为每次网络加载；换素材时务必把 `engine.js` 里的 `CACHE_NAME` 版本号 +1，否则旧缓存会继续命中。
10. **图标来自真实照片**：`tools/make_icon.py` 的 `--box` 控制裁剪范围，换照片时重跑一次即可。
11. **CSS 类名与 JS 加的类必须逐字对上**：L6 连线变绿写成 `.l6-line--on`、JS 加的是 `is-on`，结果「连对了却还是浅蓝」，肉眼很难发现，靠断言 `is-on` 的数量才抓到。
12. **绝对定位的 SVG 会盖住卡片**：连线 `svg` 必须 `z-index: 0`、两列卡片 `position: relative; z-index: 1`，否则线会从卡面上糊过去。
13. **`justify-content: space-between` 只有一个子元素时会贴左**：单卡（教学第二幕）要另加 `.l6-board--single` 用 `gap` 居中，不能指望 space-between。
14. **`getBoundingClientRect()` 会把入场动画的缩放算进去**：测「位置稳定」必须等 `popIn` 结束（约 600ms）再取基准，否则会误判成 reflow。
15. **CSS 阴影色要和底色拉开明度**：落影用和背景同色系的浅棕（`rgba(226,201,166,.5)`）在奶油底上几乎看不见，换成 `rgba(150,108,66,.55)` 才有「放在桌面上」的效果。
16. **对象字面量里 `{ [动态键]: 0, ...同名键: 2 }` 会被后面的字面量覆盖**：验收脚本按题型排序时踩过，改成先建常量对象再 `obj[type] = 0`。
17. **「先建好格子、再往里塞东西」必须走同一个入口**：L8 车库直接 `slot.appendChild()` 塞初始车辆，绕过了 `fill()` 的计数，结果新车叠进已占车位、车位总数对不上；所有入位都要经过 `fill()`。
18. **选项迟一步出现会把场景顶上去**：数字键晚于拖拽出现时，托盘瞬间撑高 39px，车库整块位移；给 `.lv-tray` 预留 `min-height` 即可（§6.8）。
19. **`.lv-story` 是 flex 居中容器**：它的可用高度一变，里面所有内容都会跟着重排；任何「后出现」的元素都要么预留高度、要么绝对定位。
20. **网格容器里的绝对定位子元素，基准是「网格区域」而不是 padding box**：L9 的工作小条被 `.l9-stage > *` 的 `grid-area` 接管，`top: 0` 落到了内容区顶；用 `:not(.l9-bubble)` 把它排除掉才对准。
21. **`position: absolute` 的父级忘了 `position: relative`**：小条会一路找上 `.lv-story`，跑到整个故事区最顶上。
22. **多位数拆成两块砖就变「一 四」**：题目里的 `14` 必须是一整块，只有教学要高亮十位时才拆成 `1`+`2`。
23. **容器高度不会因为物件飞走而变小**：占位还在，所以把绿环画在容器上会圈进一大片空地。领圈 / 徽标必须按「剩余物件的实际包围盒」用绝对定位去贴（`unionOf()` + `ringRound()`）。
24. **多只物件同时离场，完成判定不能看「剩余数量 === 0」**：先落地的那只回调里就会看到 0，于是提前宣布全体完成（L10 出现「还有 2 只在飞就出选项」）。改成 `cleared += 1; if (cleared >= need)`。
25. **十位阵型的列数要显式传**：`branchOf(10)` 用了默认 3 列，10 只被排成 3+3+3+1，「一捆十」直接散掉；十位一律 `cols: 5`。
26. **WAAPI 动画结束后 `cancel()` 会回落到内联样式**：竖式横线先写 `scaleX(0)` 再播动画，播完 cancel 又变回 0，横线永远不出现；要把终态写进内联样式再播。
27. **滑动的速度判定要加最小位移**：只看 `speed > 0.45px/ms` 时，40px 的快甩也会翻页；补一条「位移 > 48px」的下限。
28. **「放到目标数就自动判对」等于没有题目**：L4 凑数、L5 发饼干原来都是 `placed >= need` 直接 `correct()`，孩子只要一直点/拖就能过。改成「放置 → 按确认键」，并把上限提到目标 +3、点已放物件可 LIFO 拿回（§6.10）。
29. **同一项目里两个 `bindDrag` 签名不一样**：L4 是 `bindDrag(pile, target, onDrop)`（函数），L5 是 `bindDrag(pile, zone, { onDrop, onMiss })`（对象）。照抄另一关的调用会变成「拖动松手时报 onDrop is not a function」，且只在真拖拽时才炸。
30. **模块里没有 `remove()` 却调用了它**：L4 原本只有 `node.parentNode.removeChild(node)` 的写法，新代码里用了 `remove(node)` → 动画结束回调抛 ReferenceError（被 Promise 吞掉），物件永远删不掉、只留下 `placed` 少了一个的错账。加一个统一的 `remove()` 辅助函数即可。
31. **「一盒 + 零散」并排会超宽**：十格盒 5 列 + 零散 3 列，cell 稍大一点（40 + 44）整行就是 384px，超过 390 视口的 358 可用宽 → 右侧被切。要么把 cell 压到 34 / 38（346px），要么给容器 `max-width: 100%` 兜底；改尺寸必须量 `getBoundingClientRect()`，别靠肉眼。
32. **`.l11-*` 的糖果尺寸来自 `--cell`**：`candy()` 不传 size 时就继承父级 `--cell`，一旦某个容器忘了 `setProperty('--cell')`，糖果会掉回 30px 默认值，整排看起来「缩水」。
33. **改正演示不能挤在 700ms 里**：找错句的翻格 + 对勾至少要 1.4 秒才看得清；`correct()` 加了 `holdMs` 参数，C 型传 1500，其余仍是 700（§6.11）。
34. **静帧截图会撞上切题瞬间**：`cdp-shot` 固定等 700ms，验收脚本里若先 `sleep(760)` 再截，正好落在下一题 popIn 的中间帧；把脚本里的等待调到 340ms 才落在定格窗口内。
35. **`gen_tts.py --only` 一次只认一个 key**：传两个 `--only` 只生成最后那个，另一个会沿用旧 mp3（台词已改却仍是旧音频）。要么分两次跑，要么整份 `--force`。
36. **教学里「16」整块就没法只染个位**：要讲位值必须拆成 `1`|`6` 两块；但题目里必须整块，否则孩子读成「一 六」。同一关里两种写法要分清楚（§6.1）。
37. **一条长语音没法同时对齐两处高亮**：`t2_a` 原句把「十位不变」和「只减个位」说在一起，金色与红色只能等整句播完才亮；拆成 `t2_a` / `t2_b` 两条后各自咬住一处。
38. **`App.openLevel()` 是异步的**：验收脚本里在关卡内再次调用它，紧接着读 DOM 会读到旧题目；要么先 `exitLevel()`，要么重新加载页面再跑。


---

## 8. 当前进度与下一步

### 已完成

- 仓库、铁律、交接文档；
- 地图屏（**5 大阶段分页 + 左右滑动**，一页 ≤6 个节点、底部 `◀ ▶` 切阶段、进阶自动翻页）、关卡屏、加载遮罩、弹层、轻提示；
- `engine.js`：按关加载 + 加权进度条 + 失败重试、音频池与手势解锁、果冻动画（运动预算 10 / 动画结束销毁）、10 题判定状态机、Three.js 扩展位；
- `progress.js`：星级只升不降、金星才解锁、合并取最高；
- `cloud.js`：Gist 先合并再推送、有限退避、令牌只存本地；
- `sandbox.js`：连点 5 次 + 口令 123，全解锁且不落盘；
- **第一关 Apple Addition**：23 条英文语音、3 幕教学、10 题纯数字按钮、金星 / 银星结算；
- **第二关 Balloon Take Away**：气球减法，3 幕教学 + 10 题打乱；
- **第三关 Orchard Harvest**：10 以内加减混合，3 幕教学 + 选符号 / 选算式 / 选结果三型；
- **第四关 Ten and Some More**：十格阵认识 11–19，3 幕教学 + 看阵识数 / 听数选阵 / 拖拽凑数三型（凑数需按对勾提交，§6.10）；
- **第五关 Cookie Party**：发饼干场景，3 幕教学 + 听数字拖饼干 / 看盒点数字 / 选小动物三型（发饼干需按对勾提交，§6.10）；
- **第六关 Number Link**：2 幕连线教学 + 数字连阵图 / 听音连数字 / 看图选数三型，连线一笔画出（§5.10）；
- **第七关 Block Build**：3 幕积木教学 + 看积木点总数 / 听算式选组合 / 横式拖数字填空三型，落地挤压回弹（§5.11）；
- **第八关 Car Garage**：3 幕车库教学 + 拖车进库再点总数 / 听算式选车库 / 横式点数字三型，两段式题目（§6.8）；
- **第九关 Quick Tap**：2 幕纯数字教学 + 看算式点答案 / 找错误算式 / 5 秒闪电点选三型，按键反馈与限时题（§5.12、§6.9）；
- **第十关 Bird Branch**：3 幕树枝教学 + 看鸟飞走点剩余 / 听总数选树枝 / 点掉指定数量再点剩余三型，不退位减法（§5.13 分阶段地图同批落地）；
- **第十一关 Candy Share**：3 幕糖果教学 + 拖糖进盘再点剩余 / 听总数选糖果组 / 找错误算式三型，答对后把错句改成正确算式演示一遍（§6.11）；
- **第十二关 Lightning Math**：2 幕纯数字教学 + 纯算式点选 / 气球选答案 / 5 秒闪电心算三型，教学拆位、答题整块（§6.1）；
- 全英文改造：界面零中文，按钮全部 SVG 图标；
- 素材持久化：Cache Storage `math-adventure-assets-v1`，二次进入不重新下载、不弹读条；
- 语音互斥：`play()` 独占 + 答对瞬间 `stop()`，实测切题时播放中的 audio ≤ 1；
- 应用图标：由 `tools/make_icon.py` 从照片裁上半身生成；
- 结算星效：动态金色 / 银色辉光（光晕呼吸 + 星体微亮 + 高光 + 光点），移除旧静态光芒；
- 运动现实性：消失只隐藏自身、保留占位，其余物件零位移；点数圆点改绝对定位，不再撑高布局。

### 下一步

1. 第 13 关起（知识点 C 收尾 / 知识点 D 进位加法），按 `docs/CURRICULUM.md` 落地；
2. 真机（iOS Safari / Android Chrome）音频与排版复核；
3. 抽空把 L1 的选项 / 结算逻辑与 L2 对齐（已共用 `Engine.quiz` 与 `LevelKit`）；
4. 阶段 3–5 目前没有关卡，`map.stages` 里已经登记；等做到 L16 起，地图会自动多出第 3 阶段的分页，不需要改 `app.js`。
