# Level 21 · Flash Math（闪电心算 · 退位减法）

> 第三阶段第六关：把借十法从「数小棒」推到「纯数字」，并全部加上 5 秒闪电条。
> 2 幕教学（一捆十根 + 三根与竖式 `13 − 9 = ?` → 解捆、拿走九根、剩四根 → 竖式收起 + 闪电徽标）
> \+ 10 题（纯算式点选 / 气球选结果 / 限时找错误算式），整份打乱。
> 按铁律 §5.17 自动挂载 `bg_21.jpg`；§6.9 补「计时起点」口径。

| 项 | 值 |
|---|---|
| 关卡文件 | `level-lv21.js` |
| 数据 | `levels_data.js` → `levels[21]`（含 `background` + `assets.images`） |
| 背景 | `assets/bg/bg_21.jpg`（48 张照片池中的一张，最长边 1024） |
| 语音 | `voice/lv21/`（14 条）+ `voice/common/`（4 条），关内 66.6 秒 / 429 KB |
| 音色 | `en_female_allison_uranus_bigtts`，`speech_rate = -15` |
| 选项数 | 数字键 3 / 气球 3 / 找错句 3（§6.5） |
| 限时 | 每题 5 秒（`FLASH_MS = 5000`），走过 60% 转红（剩余 < 40%） |
| 判定 | 首轮 10 题全对 = 金星并解锁 22；有错（含超时）= 银星，只到 21 |

---

## 1. 语音清单（14 条，全英文）

### 教学（6 条）

| key | 台词 | 时长 | 配的画面 |
|---|---|---|---|
| `t1_a` | Look! We have thirteen. We need to take away nine. | 3.25s | 一捆十根 + 三根零散，右侧竖式 `13 − 9 = ?` |
| `t1_b` | We don't have enough ones. | 1.52s | 那三根抖两下（个位不够减） |
| `t1_c` | We break the ten. Ten minus nine is one. | 2.18s | 绑带弹飞、十根散成十三根；十位与个位被划掉、补 `0` 与 `13` |
| `t1_d` | One plus three is four. Thirteen minus nine equals four. | 3.40s | 九根飞走、剩四根被领圈框住；结果 4 落进个位列 |
| `t2_a` | Remember, when we take away, we can break the ten. | 2.72s | 竖式 `13 − 9 = 4` 定格 |
| `t2_b` | Now, let's try some quick math! | 1.78s | 闪电徽标亮起并缓慢呼吸 |

> 用户给的两段长句按 §2.5「单句 ≤14 词」各拆成两条（15 词 / 18 词都超限）。
> 教学里没有问句，不需要自问自答；每幕仍以「语音播完 + 定格 + 点击」收尾。

### 答题（8 条）

| key | 台词 | 用于 |
|---|---|---|
| `a1_q` | Fifteen minus eight. Quick, tap the right answer! | 题型 A（15 − 8） |
| `a2_q` | Thirteen minus nine. Quick, tap the right answer! | 题型 A（13 − 9） |
| `a3_q` | Sixteen minus seven. Quick, tap the right answer! | 题型 A（16 − 7） |
| `a4_q` | Fourteen minus six. Quick, tap the right answer! | 题型 A（14 − 6） |
| `b1_q` | Fourteen minus seven. Which balloon? | 题型 B（14 − 7） |
| `b2_q` | Seventeen minus nine. Which balloon? | 题型 B（17 − 9） |
| `b3_q` | Twelve minus eight. Which balloon? | 题型 B（12 − 8） |
| `c_q` | Quick! Find the wrong sentence! | 题型 C（三题共用） |

> 答题环节**绝不补答案**：问句播完即停，5 秒条开始走，画面留白等孩子点。

---

## 2. 教学分镜（2 幕，逐幕定格等点击）

### 第一幕 · 从借十法到纯数字

- 左：`.l21-mat`——一捆（10 根，绑带捆住）压在前 10 个格位上，第 11–13 格是三根零散；右：`.l21-vsum` 竖式 `13 − 9 = ?`（结果格是虚线的问号砖）。
- `t1_a` 播完 → `t1_b` 时三根依次抖一下 → **停 1 秒**。
- `t1_c` 说到「break the ten」时解捆（绑带 420 ms 飞走、十根 22 ms 间隔散开），十位/个位同时被划掉并补 `0` / `13`。
- `t1_d` 时九根依次飞走（62 ms 间隔），剩四根被领圈框住；结果 4 落进个位列（绿色 + 弹跳）。

### 第二幕 · 总结速算规律

- 竖式放大（`--big`：格位 62 × 68、字号 42），划位与结果已就位。
- `t2_a` 播完 → `t2_b` 时金色闪电徽标亮起并缓慢呼吸（只说「quick math」，不提前暴露计时条）。

---

## 3. 答题（10 题，整份打乱，全部限时）

| 型 | 题数 | 玩法 | 选项 |
|---|---|---|---|
| `flash` | 4 | 纯算式 `15 − 8 = ?` + 三个大号数字键 | 3 |
| `balloon` | 3 | 算式卡 `14 − 7`（结果留白）+ 三个写着数字的气球 | 3 |
| `wrong` | 3 | 三句算式，5 秒内点出**不成立**的那一句 | 3 |

- 题目数据：15−8=7 / 13−9=4 / 16−7=9 / 14−6=8；14−7=7 / 17−9=8 / 12−8=4；错句三组错法 +1 / −2 / +2。
- **计时起点（本关新增口径，已写进 §6.9）**：题干语音播完才开始走条，此前进度条呈「待命态」（压暗、不做满格动画）。孩子听完算式仍有完整 5 秒。
- **超时与点错同权**：记一次错、题目原地不动、数字/气球/卡片刻重新排列后**进度条回满**；同一题 `try_again` 只播 1 次。
- **答对瞬间**：进度条立刻 `scaleX(0)` 并转绿（`is-done`）；找错句题型额外翻结果格并定格 1.5 秒（§6.11）。

---

## 4. 关键实现

| 机制 | 做法 |
|---|---|
| 限时器 | `makeTimer(story)`：`arm()` 起 5 秒线性 `scaleX` 动画 + 两个定时器（60% 转红、到点收尾）；`stop()` 一次清干净；`done()` 归零转绿。全关只有一个 `liveTimer`，退关必停 |
| 等待计时 | builder 返回 `{ begin }`，`saySeq(q.voice).then(begin)`；语音被取消（退关/切题）时 `begin` 不会执行 |
| 三种题型 | `flash` / `balloon` / `wrong` 各自 `paint()`，答错后 `Engine.quiz.reshuffle` + 重绘 + 重新计时 |
| 气球 | 纯 SVG（椭圆 + 高光 + 三角结 + 弯线），`l21-float` 缓慢浮动（呼吸类循环动画，§5.3 允许） |
| 竖式借位 | 与 L20 同款：划掉原数字 + 右上补 `0` / `13`，结果只落个位列 |
| 交接 | 只注册 `LEVELS[21]`，未改 `engine.js` / `app.js`（§3.3） |

---

## 5. 验收记录（2026-10-30）

| 项 | 结果 |
|---|---|
| `node --check` | `level-lv21.js` / `levels_data.js` 通过 |
| 教学两幕 | 13 格 + 1 捆 + 3 根 → 解捆 13 根、补 `0`/`13` → 剩 4 根、结果 4 → 第二幕闪电徽标亮起 |
| 待命态 | 计时前 `.l21-timer.is-idle` 存在；`begin` 后清除并回满 |
| 转红 | 走过 60% 时 `is-low` 出现（实测 3.1s、条剩 0.40） |
| 超时 | `is-out` 出现、题目 `render()` 不变、条停在 `scaleX(0)`、数字键仍在、`try_again` 只播 1 次 |
| 重置 | 超时后 1 秒条回满（实测 0.97）、`is-low` 清除 |
| 答对 | 条立刻 `scaleX(0)`、`is-done` 出现、题号前进 |
| 十题全流程 | 390 全对：gold、解锁 22、`try_again` 0 次、零 CJK、`scrollWidth === clientWidth` |
| 背景 | 首屏 0；进关 1 条（blob）；二次 0 条且仍 `is-on`；退关清空；`z-index:-1` / `isolate` / 白纱 0.72 |
| 音频 | 18 条（含 common）全部 `duration > 0`，关内 66.6 秒 |
