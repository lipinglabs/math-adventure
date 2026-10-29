# Level 14 · Match Maker（拖拽算式与答案配对）

> 第二阶段倒数第二关：把「读算式」和「算结果」绑成一个动作——**把算式卡拖到与它相等的数字卡上**。
> 2 幕示范教学 + 10 题（顺序每局打乱），三种题型都在同一条铁律下：**算式卡可拖，数字卡是落点**。
> 交互完全按 §5.9（热区外扩、未命中弹回）与 §5.14（吸附「咔哒」、干扰项纪律）落地。

| 项 | 值 |
|---|---|
| 关卡文件 | `level-lv14.js` |
| 数据 | `levels_data.js` → `levels[14]` |
| 语音 | `voice/lv14/`（12 条）+ `voice/common/`（4 条），合计 60.0 秒（关内 48.2 秒 / 377 KB） |
| 音色 | `en_female_allison_uranus_bigtts`，`speech_rate = -15` |
| 候选数 | 三型都是 **3 个候选**（见铁律 §6.5） |
| 舞台 | 左列 + 右列，两列卡片；算式卡暖白、数字卡金色 |
| 判定 | 10 题首轮全对 = 金星并解锁 L15；有错 = 银星，题号不前进 |

---

## 1. 语音清单（12 条，全部英文）

### 教学（5 条）

| key | 台词 | 时长 | 配的动作 |
|---|---|---|---|
| `t1_a` | Let's match the math sentence to the answer. | 3.34s | 两张列摆好，等 1 秒 |
| `t1_b` | Twelve plus three equals fifteen. They match! | 5.02s | 手把 `12 + 3` 拖到 `15`，吸附发光之后播 |
| `t2_a` | Let's try another one. Eighteen minus five. Which card matches? | 5.95s | 第二幕开场**问句** |
| `t2_b` | The thirteen card! | 2.18s | 停 1 秒后的**自答**（§6.1），同时开始拖 |
| `t2_c` | Eighteen minus five equals thirteen. | 3.60s | 吸附完成后再把等式念一遍 |

> 第二幕的问句 `t2_a` 播完停 **1 秒**，`t2_b` 立刻接上（自答），拖拽动画与自答同时开始；
> `t2_c` 在吸附之后播。三句分开成三个 mp3，停顿由代码 `sleep(1000)` 控制，不靠标点。

### 题型 A · 一张算式拖到正确数字（4 题共用 1 条）

| key | 台词 |
|---|---|
| `a_q` | Match the sentence to the right number. |

| 题目 | 算式 | 三个数字 |
|---|---|---|
| A1 | 14 + 3 | 17 / 18 / 15 |
| A2 | 16 − 4 | 12 / 13 / 11 |
| A3 | 11 + 5 | 16 / 17 / 15 |
| A4 | 18 − 5 | 13 / 14 / 12 |

### 题型 B · 听音挑一张再拖（3 条）

| key | 台词 | 三张算式 | 三个数字 |
|---|---|---|---|
| `b1_q` | Find sixteen minus four. Drag it to the right number. | 16−4 / 11+5 / 18−5 | 12 / 14 / 17 |
| `b2_q` | Find thirteen plus five. Drag it to the right number. | 13+5 / 12+4 / 19−6 | 15 / 18 / 14 |
| `b3_q` | Find sixteen minus five. Drag it to the right number. | 16−5 / 12+3 / 19−7 | 11 / 17 / 13 |

> 干扰算式（`11+5=16`、`18−5=13` 之类）的值**都不在**数字卡上，操作数也都不在——所以「拖错」永远是错的，
> 不会出现「其实也对却判错」的情况（§5.14.6）。

### 题型 C · 反向挑算式（3 条）

| key | 台词 | 左边数字 | 三张算式 |
|---|---|---|---|
| `c1_q` | Which sentence equals eighteen? Drag it here. | 18 | 10+8 ✓ / 12+5 / 19−4 |
| `c2_q` | Which sentence equals fourteen? Drag it here. | 14 | 11+3 ✓ / 16−3 / 12+4 |
| `c3_q` | Which sentence equals sixteen? Drag it here. | 16 | 13+3 ✓ / 18−4 / 11+6 |

> 三张算式里恰好一张等于左边的数字；另外两张既不等，也不拿这个数字当操作数。

---

## 2. 教学分镜

### 第一幕：手把 12 + 3 拖到 15

1. 左列一张算式卡 `12 + 3`，右列三张数字卡 `15 / 16 / 18`（固定顺序，不洗牌），逐张弹入。
2. `t1_a`："Let's match the math sentence to the answer." 停 1 秒。
3. 手（内联 SVG）出现在算式卡右下角，拖着一个克隆卡沿一条略带上抛的路径飞向 `15`（820ms）。
4. 到位：`sfx.tap()` 一声「咔哒」+ 目标卡 `scale(1.14,.82) → scale(.94,1.08) → scale(1)` 挤压回弹，
   目标卡转绿、右上角弹出白色对勾，来源卡淡绿收尾（`.is-used`）。
5. `t1_b`："Twelve plus three equals fifteen. They match!" → 定格等点击。

### 第二幕：18 − 5 拖到 13

1. 同样的两列：`18 − 5` 与 `13 / 14 / 12`。
2. `t2_a` 问句："…Eighteen minus five. Which card matches?" → **停 1 秒**。
3. `t2_b` 自答："The thirteen card!"，同时开始拖拽演示（不等语音播完，视觉与语音一起给答案）。
4. 吸附同第一幕；`t2_c`："Eighteen minus five equals thirteen." → 定格等点击。

---

## 3. 题型

### A · 一张算式 → 三个数字（4 题）

- 左列一张算式卡，右列三张数字卡（顺序每局打乱）。
- 把算式拖到数字上松手；命中判定只看「算式值 === 数字」。
- 答对：吸附 + 双卡发光 + 金币 / 星星音，700ms 后进下一题。
- 答错：两张卡摇一下、数字卡闪一下红圈、`try_again`（每题一次）、卡片回原位，题号不前进。

### B · 听音挑一张（3 题）

- 左列三张算式，右列三个数字；语音点名其中一张（"Find sixteen minus four."）。
- 孩子要先把语音和算式对上，再拖到对应数字。三张算式里只有一张的值在数字卡上。

### C · 反向挑算式（3 题）

- 左边一个放大的数字卡（110×92），右边三张算式卡；拖**算式**（不是数字）到左边。
- 方向仍然是「算式可拖」，孩子不用重新学。

---

## 4. 实现要点

| 位置 | 做法 |
|---|---|
| 一块板三种题型 | `buildBoard(q)` 统一产出「可拖的算式卡 + 作为落点的数字卡」，`pair/listen/reverse` 只是两列内容不同 |
| 判对 | 只比 `valueOf(eq) === Number(num.dataset.value)`，不写题型分支，也不会出现「另一个也对」 |
| 拖拽 | `bindBoard()`：`pointerdown` 记起点 → 位移 > 8px 才造 ghost → `pointerup` 用 §5.9 的 `HIT_PAD=14` 命中 → 同一个 `resolve()` |
| 轻点兜底 | 位移 < 8px 视为轻点：第一下选中（呼吸环），第二下点数字即配对（§5.10.4 的做法） |
| 吸附 | `snapInto()`：ghost 飞 170ms 到目标中心 → `sfx.tap()` + `snapPop()` 三段形变 → ghost 缩没；同时 `markMatched()` 给两张卡上色 |
| 弹回 | `bounceBack()`：320ms 三段，起点 scale(1) → 中段朝原位回移 55% + scale(.86) → 终点 scale(.55) 透明消失 |
| 演示 | `demoDrag()`：克隆卡 + 手一起 `animate()`，路径中点抬高 18px，看起来像「拎起来再放下」 |
| 清理 | `askQuestion()` 开头、`unmount()` 末尾都清一次 `.l14-ghost` / `.l14-hand` |

---

## 5. 验收结果（2026-10-29）

- 语音 12 条关内 + 4 条公共，全部可解码，合计 **60.0 秒 / 469 KB**（关内 48.2 秒 / 377 KB）。
- 热区：目标卡右边界外 **16px** 松手 → 不配对、不记错、ghost 620ms 内清零；
  外 **13px** 松手 → 配对成功（`.is-matched` 1 个 + `.is-check` 1 个 + `.is-used` 1 个）；
  正中松手、轻点算式再轻点数字，三条路径都能配上。
- 错配：拖到错误数字 → `try_again` 播 1 次、`.is-bad` 出现 1 次、题号不动（圆点仍是 2）、`.is-matched` 0 个。
- 三种题型：A `1+3` / B `3+3` / C `3+1` 张卡片；每型都只有一张算式与某个数字相等；
  B 的干扰算式值全部不在数字卡上；C 恰好一张成立、且没有「以目标数开头」的算式。
- 10 题全对 → `gold`，`unlockedLevel = 15`；第 3 题故意配错 → 银星、`unlockedLevel = 14`。
- 布局：390 / 375 宽都 `scrollWidth === innerWidth`；零 CJK（含 `aria-label`）。
- 地图：Stage 2 扩到 11 关后仍为 2 页（6 + 5），第 14 关在第 2 页最上面，标签 `Match Maker`。
- 缓存：清空后首进 705ms（12 个音频 / 377 KB，读条出现），二次进入 124ms、`voiceReqs = 0`。
