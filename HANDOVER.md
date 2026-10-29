# HANDOVER.md · 交接文档

> 接手顺序：先读 `PROJECT_MATH_RULES.md` 全文，再读本文件。
> 本文件回答「环境长什么样、密钥在哪、怎么推送、怎么验收」。最后更新：2026-10-29。

---

## 0. 一分钟速览

| 项目 | 值 |
|---|---|
| 名称 | 数学冒险（math-adventure） |
| 定位 | 3–6 岁幼儿数学启蒙游戏，纯静态网页 |
| 仓库 | `lipinglabs/math-adventure`（public） |
| 部署 | 暂未开启 GitHub Pages，本地静态服务器预览 |
| 技术形态 | 原生 HTML / CSS / JS，无框架、无构建、无 npm 运行时依赖 |
| 当前进度 | 骨架 + 引擎 + 进度 + 云存档 + 沙盒；**第一关台词与分镜待确认** |

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
1. 递归收集仓库文件，自动排除 `.git/`、`.gitignore` 中列出的路径、`config/secrets.local.json`、`.shots/`、`.edge-profile/`、`tmp/`、`__pycache__/`。
2. 逐个 `POST /git/blobs` → `POST /git/trees`（带 `base_tree`）→ `POST /git/commits` → `PATCH /git/refs/heads/main`。
3. 空仓库首次提交时自动切换为「无 base_tree、无 parents、新建 ref」。
4. 推送前会打印文件清单与体积；**若清单里出现 `secrets` 字样会直接中止**。

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
├─ style.css               全部样式（果冻 / 粘土）
├─ levels_data.js          地图坐标 + 关卡配置 + 素材清单（纯数据）
├─ engine.js               资源加载 / 进度条 / 音频池 / 动画 / 判定 / 弹层 / 3D 扩展位
├─ progress.js             进度、星级、解锁、合并
├─ cloud.js                Gist 云存档
├─ sandbox.js              连点 5 次 + 口令 123 的开发者后门
├─ app.js                  启动、地图渲染、路由、云存档面板
├─ PROJECT_MATH_RULES.md   项目铁律（最高约束）
├─ HANDOVER.md             本文件
├─ config/
│  └─ secrets.local.json   本机密钥（gitignored，永不提交）
├─ voice/
│  ├─ common/              跨关共用语音（鼓励 / 金星 / 银星 / 未开放提示）
│  ├─ lv01/                第一关语音（待台词确认后生成）
│  └─ lines/               台词清单 JSON（生成脚本的输入）
├─ tools/
│  ├─ gen_tts.py           豆包 TTS 批量生成（支持 --probe 试听、--dry-run 校验）
│  ├─ push_via_api.py      Git Data API 推送
│  ├─ cdp-eval.mjs         本地验收：在页面里执行表达式
│  └─ cdp-shot.mjs         本地验收：390×844 移动视口截图
└─ docs/
   └─ LEVEL_01_DESIGN.md   第一关台词与动画方案（待确认稿）
```

---

## 4. 本地运行

```bash
cd math-adventure
python -m http.server 8765 --bind 127.0.0.1
# 浏览器打开 http://127.0.0.1:8765/index.html
```

不要用 `file://` 直接打开：`localStorage` 在部分浏览器会抛 `SecurityError`，云存档无法验证。

### 演示参数（仅用于验收，不影响正常入口）

| URL | 效果 |
|---|---|
| `index.html?demo=loader` | 自动进入第一关，用 12 个假素材演示进度条 |
| `index.html?demo=fail` | 演示加载失败与「重新加载」按钮 |

---

## 5. 语音生成流程

1. 编辑台词清单：`voice/lines/lv01.json`（格式见文件内注释）。
2. 先校验，不花钱：

```bash
python tools/gen_tts.py voice/lines/lv01.json --out voice/lv01 --dry-run
```

3. 确认无误后生成：

```bash
python tools/gen_tts.py voice/lines/lv01.json --out voice/lv01
python tools/gen_tts.py voice/lines/common.json --out voice/common
```

4. 把生成的文件名写进 `levels_data.js` 对应关卡的 `assets.audio`。
5. 单条试听（不写清单）：

```bash
python tools/gen_tts.py --probe --text "一加一等于二" --lang zh --mood teach --out tmp/probe.mp3
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
  "http://127.0.0.1:8765/index.html"

# 在页面里断言（示例：沙盒开关）
node tools/cdp-eval.mjs "Sandbox.open(); document.getElementById('sandbox-pin').value='123'; [...document.querySelectorAll('.modal-actions .btn')].find(b=>b.textContent==='进入').click(); JSON.stringify({sandbox:Sandbox.active(), unlocked:Progress.read().unlockedLevel, ls:localStorage.getItem('math-adventure.progress.v1')})"

# 移动视口截图
node tools/cdp-shot.mjs .shots/map.png 390 844
```

已通过的验收项（2026-10-29）：

- `node --check` 全部脚本通过；
- 390×844 地图 / 加载遮罩 / 关卡占位 / 云存档面板截图无重叠；
- 10 题全对返回 `gold`，中途错一题返回 `silver` 且题号不前进；
- 银星 → 金星可升级并推进解锁线，金星不会被银星降级；
- 合并函数：`unlockedLevel` 取最大、星级取最高、`cleared` 取并集；
- 沙盒口令错误时弹层不关闭；口令正确后全解锁且 `localStorage` 仍为 `null`；
- 无效 Gist 令牌返回中文错误提示，且不会残留令牌。

---

## 7. 已知坑（都是实测踩过的）

1. **Edge headless 最小窗口宽度约 500 px**：直接 `--window-size=390,844` 得到的是 492 px 视口，右侧元素会被裁掉。截图必须用 `Emulation.setDeviceMetricsOverride`（`tools/cdp-shot.mjs` 已封装）。
2. **Allison 读中文返回空音频**：`code` 正常但没有 `data` 帧。中文必须用 `zh_female_xiaoxue_uranus_bigtts`。
3. **`context_texts` 放错位置会被静默忽略**：必须在 `additions` 的 JSON 字符串里。
4. **iOS 音频元素数量上限**：一次创建几十个 `<audio>` 后会静默失声。`engine.js` 限 40 个并在退关释放。
5. **`git push` 一定失败**，不要浪费时间去试代理。
6. **`--dump-dom` 不会等异步渲染完成**，验证交互要用 CDP。

---

## 8. 当前进度与下一步

### 已完成（Day 1）

- 仓库创建、铁律与交接文档落地；
- 模块化骨架：地图屏（3 个节点，1 个可玩 + 2 个占位）、关卡屏、加载遮罩、弹层、轻提示；
- `engine.js`：按关加载 + 加权进度条 + 失败重试、音频池与手势解锁、果冻动画（运动预算 10 / 动画结束销毁）、10 题判定状态机、Three.js 扩展位；
- `progress.js`：星级只升不降、金星才解锁、合并取最高；
- `cloud.js`：Gist 先合并再推送、有限退避、令牌只存本地；
- `sandbox.js`：连点 5 次 + 口令 123，全解锁且不落盘；
- 豆包 TTS 工具链与本地密钥落盘，中文样音已通过语音识别验证。

### 待确认（阻塞下一步）

见 `docs/LEVEL_01_DESIGN.md` 的「待确认项」，核心是音色选择与台词文案。

### 确认后要做的

1. 生成 `voice/common/` 与 `voice/lv01/` 共 22 条语音；
2. 新建 `level-lv01.js`，实现 3 幕教学 + 10 题；
3. 接入结算页（金星 / 银星两套文案与动效）；
4. 按 `PROJECT_MATH_RULES.md §8` 跑完整验收；
5. 通过 `push_via_api.py` 推送。
