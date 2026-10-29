# Level 12 · Lightning Math（闪电心算 · 不退位减法）

> 第二阶段（知识点 C 的第 3 遍）：**16 − 4**。同一套「十位不动、只算个位」的知识点，
> 这次把实物完全撤掉，只留数字与 5 秒倒计时。2 幕教学 + 10 题（顺序每局打乱），三种题型混排。
> 限时规则完全沿用 L9（铁律 §6.9）；新增「算式卡 + 气球选答案」这一型。

| 项 | 值 |
|---|---|
| 关卡文件 | `level-lv12.js` |
| 数据 | `levels_data.js` → `levels[12]` |
| 语音 | `voice/lv12/`（16 条）+ `voice/common/`（4 条），合计 72.6 秒（关内 61.1 秒） |
| 音色 | `en_female_allison_uranus_bigtts`，`speech_rate = -15` |
| 选项数 | 纯算式点选 3、气球选答案 3 个、闪电点选 3（见铁律 §6.5） |
| 舞台 | 教学：积木 → 数字砖；答题：数字砖算式 + 数字键或气球 |
| 判定 | 10 题首轮全对 = 金星并解锁 L13；有错 = 银星，题号不前进 |

---

## 1. 语音清单（16 条，全部英文）

### 教学（6 条）

| key | 台词 | 时长 |
|---|---|---|
| `t1_a` | Look at the blocks. One ten and six ones. That's sixteen. | 6.14s |
| `t1_b` | Now, let's look at the numbers. We take away the ones. | 4.54s |
| `t1_b2` | Six minus four equals two. | 3.31s |
| `t1_c` | So, sixteen minus four equals twelve! | 4.06s |
| `t2_a` | Remember, the ten stays the same. | 3.60s |
| `t2_b` | We only take away from the ones. | 3.14s |

> 两幕教学**都没有问句**，所以不涉及「问句悬空」。`t1_b` 与 `t1_b2` 之间、`t2_a` 与 `t2_b` 之间
> 各由代码停 0.26–1 秒：第一段说「看数字、拿走个位」，停顿后第二段才给答案。
> 原本 `t2_a` 是一整句（18 词被校验拦下，也来不及让金色与红色分别对上），拆成两条后高亮才咬得住语音。

### 题型 A · 纯算式点选（4 条）

| key | 台词 | 题目 |
|---|---|---|
| `a1_q` | Seventeen minus three. Tap the right answer. | 17 − 3 |
| `a2_q` | Fourteen minus two. Tap the right answer. | 14 − 2 |
| `a3_q` | Nineteen minus six. Tap the right answer. | 19 − 6 |
| `a4_q` | Sixteen minus five. Tap the right answer. | 16 − 5 |

### 题型 B · 算式卡 + 气球选答案（3 条）

| key | 台词 | 题目 | 三个气球 |
|---|---|---|---|
| `b1_q` | Fifteen minus two. Which balloon has the answer? | 15 − 2 = 13 | 13 / 12 / 14 |
| `b2_q` | Eighteen minus six. Which balloon has the answer? | 18 − 6 = 12 | 13 / 12 / 11 |
| `b3_q` | Thirteen minus two. Which balloon has the answer? | 13 − 2 = 11 | 12 / 11 / 10 |

### 题型 C · 限时闪电（3 条）

| key | 台词 | 题目 |
|---|---|---|
| `c1_q` | Quick! Eighteen minus five equals what? | 18 − 5 = 13 |
| `c2_q` | Quick! Nineteen minus seven equals what? | 19 − 7 = 12 |
| `c3_q` | Quick! Fifteen minus four equals what? | 15 − 4 = 11 |

---

## 2. 教学分镜

### 第一幕：从积木剥离到数字

1. 左侧十块积木（5 × 2）、右侧六块（3 × 2），中间一个 `+`；整组弹入。
2. `t1_a`："Look at the blocks. One ten and six ones. That's sixteen." 停 1 秒。
3. 积木整组缩小淡出（300ms，同一块场地），原地浮现 `1 6 − 4 = ?`——**每个数占两块（十位 / 个位）**，
   这是全关唯一拆位的地方（§6.1：教学拆位、答题整块）。
4. `t1_b`："Now, let's look at the numbers. We take away the ones." 停 1 秒。
5. `t1_b2`："Six minus four equals two." 同时**只有个位的 `6` 与 `4` 转红**并轻弹。
6. `t1_c`："So, sixteen minus four equals twelve!" 结果位填成 `1`（金，没动）+ `2`（绿，新算出）。

### 第二幕：竖式规律

- 竖式 `16 / −4 / —— / 12`（`−4` 对齐个位，十位留虚线空格）。
- `t2_a` "Remember, the ten stays the same." → 两个十位 `1` 转金并 1.1 秒脉动。
- `t2_b` "We only take away from the ones." → `6 / 4 / 2` 转红并轻弹。

---

## 3. 题型

### A · 纯算式点选（4 题）

- 屏幕中央 `17 − 3 = ?`（整块数字砖，不拆位），下方三个数字键。
- 点对：结果位立刻填上答案并转绿，金币 + 星星音，700ms 后进下一题。
- 点错：轻晃 + `try_again`（每题一次）+ 三个键重新排布，停在原题。

### B · 算式卡 + 气球选答案（3 题）

- 上方一张算式卡 `15 − 2 = ▢`（结果位是虚线空格），下方三个气球，数字印在气球肚子上。
- 气球以 3.2 秒周期缓慢上下浮动（`transform`，错开 0.26s 相位）；点对后气球停下、数字转绿，
  算式卡的空格同时填上答案。
- 点错：气球摇一下 + `try_again`，三个数字重排到不同气球上（气球本身不消失、不换位）。
- 按键反馈按 §5.12：`:active` 时 110ms 内 `scale(.94)`。

### C · 限时闪电（3 题）

- 完全复用 L9 的规则（§6.9）：5 秒进度条 `scaleX(1) → scaleX(0)`，剩余 40% 时转暖红。
- 超时：进度条停在 0、条体闪一下、记一次错、1 秒后同一题重新起表。
- 点错：记一次错、三个键重排、进度条立刻重置。
- 点对：立刻停表（`scaleX(0)`）、条体转绿、结果位填上答案。

---

## 4. 实现要点

| 位置 | 做法 |
|---|---|
| 数字砖 | `equation(a, b, { split })`：`split` 时把 `16` 拆成两块，否则整块；`res` 是容器，可放一块或两块 |
| 教学高亮 | 只给 `aTiles` 的最后一块（个位）与 `bTiles` 第一块加 `.is-red`，十位保持原样 |
| 结果填充 | `fillResult()`：拆位模式填「十位金 + 个位绿」，整块模式填一块绿；气球题的空砖同时去掉虚线 |
| 气球 | 内联 SVG（椭圆 + 高光 + 结 + 线），数字用绝对定位压在肚子正中，浮动动画只跑在 `.l12-balloon-art` 上 |
| 5 秒表 | `arm()` / `stopFlashTimer()`：WAAPI 动画 + `setTimeout` 双计时，答对 / 答错 / 超时 / 切题 / 退关全部 cancel |
| 定型 | `askQuestion()` 开头先 `stopFlashTimer()`，避免上一题的定时器把下一题判错 |

---

## 5. 验收结果（2026-10-29）

- 语音 16 条关内 + 4 条公共，全部可解码，合计 **72.6 秒 / 568 KB**。
- 10 题全对 → `gold`，`unlockedLevel = 13`。
- 题型 A：四题分别 17−3=14、14−2=12、19−6=13、16−5=11，结果位依次填上正确答案。
- 题型 B：三组气球 `13,12,14` / `13,12,11` / `12,11,10`，各含正确答案；答对后气球停浮、数字转绿、算式卡填空。
- 题型 C：`18−5=13` / `19−7=12` / `15−4=11`；起表后 0.6 秒 `scaleX(0.873)`，5 秒走完停在 0。
- 超时：题目对象不变、`is-out` = 1、`try_again` 播 1 次，1.4 秒后进度条回到 `scaleX(0.81)` 重新计时。
- 点错：`[14,13,12] → [13,12,14]`（答案 1→0）并重新起表；答对瞬间进度条 `scaleX(0)`、条体 `is-done`。
- 三型答错都是「同题 + 重排 + `try_again` 一次」：A `[13,15,14] → [15,14,13]`（2→1）、
  B `[12,13,14] → [13,12,14]`（1→0）、C 见上。
- 教学：16 块积木 → 算式 `16−4=?` → 个位两个数转红 → 结果 `1`（金）`2`（绿）；竖式 `1|6|_|4|1|2`，十位 2 个金、个位 3 个红。
- 布局：三型 `scrollWidth 390 = innerWidth`；零 CJK（含 `aria-label`）。
- 地图：Stage 2 扩到 9 关后自动变 2 页（5 + 4），第 12 关在第 2 页最上面。
- 缓存：清空后首进 703 ms（16 个音频 / 476 KB，读条出现），二次进入 126 ms、读条不出现。
