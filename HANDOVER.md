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
| 当前进度 | 骨架 + 引擎 + 进度 + 云存档 + 沙盒 + **L1 Apple Addition / L2 Balloon Take Away 已完成** |

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
   └─ LEVEL_02_DESIGN.md   第二关台词与动画方案（已实现）
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
- 教学第二幕 5 只气球按「上 2 下 3」两排排布，行宽 176 / 268 ≤ 卡片内容宽 308，不再溢出屏幕。

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

---

## 8. 当前进度与下一步

### 已完成

- 仓库、铁律、交接文档；
- 地图屏（3 个节点，1 个可玩 + 2 个占位）、关卡屏、加载遮罩、弹层、轻提示；
- `engine.js`：按关加载 + 加权进度条 + 失败重试、音频池与手势解锁、果冻动画（运动预算 10 / 动画结束销毁）、10 题判定状态机、Three.js 扩展位；
- `progress.js`：星级只升不降、金星才解锁、合并取最高；
- `cloud.js`：Gist 先合并再推送、有限退避、令牌只存本地；
- `sandbox.js`：连点 5 次 + 口令 123，全解锁且不落盘；
- **第一关 Apple Addition**：23 条英文语音、3 幕教学、10 题纯数字按钮、金星 / 银星结算；
- 全英文改造：界面零中文，按钮全部 SVG 图标；
- 素材持久化：Cache Storage `math-adventure-assets-v1`，二次进入不重新下载、不弹读条；
- 语音互斥：`play()` 独占 + 答对瞬间 `stop()`，实测切题时播放中的 audio ≤ 1；
- 应用图标：由 `tools/make_icon.py` 从照片裁上半身生成；
- 结算星效：动态金色 / 银色辉光（光晕呼吸 + 星体微亮 + 高光 + 光点），移除旧静态光芒；
- 运动现实性：消失只隐藏自身、保留占位，其余物件零位移；点数圆点改绝对定位，不再撑高布局。

### 下一步

1. 第 3 关「混合判断」：果园场景，看图判断该用加法还是减法；
2. 题目数据与语音清单按 `docs/CURRICULUM.md` L3 落地；
3. 真机（iOS Safari / Android Chrome）音频与排版复核；
4. 抽空把 L1 的选项 / 结算逻辑与 L2 对齐（已共用 `Engine.quiz` 与 `LevelKit`）。
