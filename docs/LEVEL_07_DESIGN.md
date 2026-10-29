# Level 7 · Block Build（积木堆叠 · 不进位加法）

> 从「认识 11–19」走到「在 11–19 上再加几」：一捆积木永远是 10（十位不动），
> 只把零散的那几块加起来。3 幕教学 + 10 题（顺序每局打乱），三种题型混排。

| 项 | 值 |
|---|---|
| 关卡文件 | `level-lv07.js` |
| 数据 | `levels_data.js` → `levels[7]` |
| 语音 | `voice/lv07/`（22 条）+ `voice/common/`（4 条），合计 78.8 秒 |
| 音色 | `en_female_allison_uranus_bigtts`，`speech_rate = -15` |
| 选项数 | 看积木点总数 3、听算式选组合 3 组、横式填空 3（见铁律 §6.5） |
| 积木 | 一捆 = 10 块（5 列 × 2 行）+ 扎带绳结；零散块最多 9（3 列 × 3 行格位） |
| 拖拽 | 数字键拖进空格，热区外扩 `HIT_PAD = 14px`、未命中 320 ms 三段弹回、点按兜底（铁律 §5.9） |
| 判定 | 10 题首轮全对 = 金星并解锁 L8；有错 = 银星，题号不前进 |

---

## 1. 语音清单（22 条，全部英文）

### 教学（7 条）

| key | 台词 | 时长 |
|---|---|---|
| `t1_a` | Look! Here is one ten and two ones. That's twelve. | 5.21s |
| `t1_b` | Now, three more blocks come. | 2.66s |
| `t2_a` | We add the ones first. | 2.40s |
| `t2_b` | Two ones plus three ones equals five ones. | 4.99s |
| `t2_c` | So, twelve plus three equals fifteen! One ten and five ones. | 7.37s |
| `t3_a` | When we add, the ten stays the same. | 4.27s |
| `t3_b` | We only add the ones together. | 3.14s |

> 三幕教学**都没有问句**（台词按要求给定），因此不涉及「问句悬空」。
> `t1_a` 与 `t1_b` 之间、`t2_a` 与 `t2_b` 之间各由代码 `await sleep(1000)` 停一拍，
> 是「先描述、再动作」的演示节拍，不是自问自答。

### 题型 A · 看积木点总数（7 条 + 1 条共用）

| key | 台词 | 题目 |
|---|---|---|
| `a1_a` | There are fourteen blocks. | 14 + 2 |
| `a1_b` | Two more blocks come. | |
| `a2_a` | There are twelve blocks. | 12 + 3 |
| `a2_b` | Three more blocks come. | |
| `a3_a` | There are thirteen blocks. | 13 + 5 |
| `a3_b` | Five more blocks come. | |
| `a4_a` | There are sixteen blocks. | 16 + 3 |
| `how_many` | How many in total? | 四题共用 |

> 第四题的「Three more blocks come.」直接复用 `a2_b`（同一句话只花一次钱，铁律 §2.5）。
> `a*_a` 与 `a*_b` 是两条独立 mp3：说完第一句先把已有积木摆好，第二句开始时才让新积木飞进来。

### 题型 B · 听算式选组合（3 条）

| key | 台词 | 目标 |
|---|---|---|
| `b1_q` | Find ten plus two. | 12 |
| `b2_q` | Find ten plus six. | 16 |
| `b3_q` | Find ten plus seven. | 17 |

### 题型 C · 横式填空（3 条 + 1 条共用）

| key | 台词 | 答案 |
|---|---|---|
| `c1_q` | Solve thirteen plus four. | 17 |
| `c2_q` | Solve twelve plus six. | 18 |
| `c3_q` | Solve fourteen plus five. | 19 |
| `put_num` | Put the number in the box. | 三题共用 |

> 答题环节**绝不自动补答案**，题干播完画面留白。

---

## 2. 教学分镜

### 第一幕：认识 12 + 3 的构成

- 画面：左侧一捆积木（10 块，扎带 + 绳结）先落座，右侧个位区依次落下 2 块零散积木。
- `t1_a`（「Look! Here is one ten and two ones. That's twelve.」）播完 → 停 1 秒。
- `t1_b`（「Now, three more blocks come.」）起播的同时，3 块**珊瑚色**新积木从右上方依次飞入个位区空位（间隔 170 ms），
  每块落地都做「压扁 → 回弹 → 归位」的三段形变（`scale(1.16,.74) → scale(.94,1.08) → scale(1)`）。
- 播完定格，点屏幕任意位置进入第二幕。

### 第二幕：个位相加，十位不动

- 画面：同一盘面（一捆 + 2 块木色 + 3 块珊瑚色），新积木在个位区里换色，方便孩子分清「原来的」和「新来的」。
- `t2_a`（「We add the ones first.」）时个位区浮出薄荷色虚线环，十位那一捆**一动不动**。
- `t2_b`（「Two ones plus three ones equals five ones.」）时按语音节奏先把 2 块木色弹一下、再把 3 块珊瑚色弹一下，
  最后 5 块一起弹，个位区转成实心绿环并在上方浮出「5」的数字徽标。
- `t2_c`（「So, twelve plus three equals fifteen! One ten and five ones.」）播完定格，点屏幕进入第三幕。

### 第三幕：竖式，十位保持不动

- 画面：左侧仍是那一捆积木，右侧出现竖式 `12 / +3 / —— / 15`（+3 对齐个位，十位留一个虚线空格）。
- 竖式先只露出 `12`、`+3` 与横线（和行 `opacity: 0` 占位，不重排）。
- `t3_a`（「When we add, the ten stays the same.」）→ 十位那两颗 `1` 变金色并脉动，左边那一捆积木同时套上金色呼吸环。
- `t3_b`（「We only add the ones together.」）→ 个位的 `2` 与 `3` 变薄荷绿，1.5 秒后和行淡入，`15` 弹出来。
- 播完定格，点屏幕 → `common/ready` → 进答题。

---

## 3. 题型

### A · 看积木点总数（4 题）

一捆 10 块 + `ones` 块零散，配 `a*_a`；随后 `add` 块珊瑚色积木飞入个位区空位，配 `a*_b`；
最后 `how_many` 提问，下方 3 个数字键。答案 = `10 + ones + add`。

### B · 听算式选组合（3 题）

竖排 3 张积木卡，每张是「一捆 + n 块」。听到「Find ten plus five.」点对应的那张。
三张卡的零散数互不相同，答错后整组重新洗牌（只换上下顺序，不换内容）。

### C · 横式填空（3 题）

上方横式 `13 + 4 = ▢`，`▢` 是带 `?` 的虚线空位；中间一行是「一捆 + 3 块 + 一小盘 4 块」的实物模型；
下方 3 个数字键。把数字**拖进**空位（或直接点一下数字键）即作答，答案 = `a + b`。

---

## 4. 实现要点

- 积木三件套：`bundle()` 生成 10 块（`grid-template-columns: repeat(5, var(--cube))`）+ `::before` 扎带 + `::after` 绳结；
  `bench({ ones, capacity, cube })` 生成「一捆 + 加号 + 个位区」；`loose(n)` 生成散落的一小堆。
- **格位先定好、再放积木**：个位区一开始就按 `capacity` 建好固定格子（`.l7-slot`），新积木只是填进下一个空格，
  因而「原有积木坐标零位移」（铁律 §5.7 验收 `dx = dy = 0`）。
- 落地动画 `land(node, delay)`：节点**已经在最终格位**，只用 `transform` 从右上方飞入 → 触地压扁 → 回弹 → 归位，
  `transform-origin: 50% 100%`（底边为支点，压扁才像踩在地上）。
- 教学第二幕的「合并」不移动任何积木：只把个位区换成绿环 + 弹跳 + 「5」徽标，避免为了合并而重排。
- 竖式的空格子用 `border: 2px dashed` 画出，让「+3 为什么偏右」一眼可读；和行用 `opacity: 0` 占位而不是 `display: none`，
  出现时不会把上面的行挤动。
- 题型 C 的拖拽：`pointerdown` 复制一个 `.l7-ghost`（`position: fixed`，`translate(-50%,-50%)`），跟随指针；
  松手时 `slotHit(x, y)` 先看 `elementFromPoint` 命中的是不是空位，再按「四边外扩 `HIT_PAD`」兜底。
  未命中 → 三段弹回后从 DOM 移除，**不落子、不算答错**；命中但数字错 → 空位 `is-bad` 抖一下、记一次错、重排数字键。
- 数字键同时支持「拖」和「点」：位移 < 8px 视为点按，两条路径都走同一个 `resolve(value, key)`。
- 语音链 `saySeq(keys)` 带 token，新链启动即让旧链作废；题型 A 的三段语音由 `buildCountQuestion().speak()` 内部串起来，
  保证「新积木飞入」和「Two more blocks come.」同步。

---

## 5. 验收结果（2026-10-29）

- 26 条音频（22 关内 + 4 公共）全部 `decodeAudioData` 成功，合计 **78.8 秒 / 617 KB**（预算 1.5 MB）；
- 10 题全对 → `result-star--gold`，`Progress.summary().unlockedLevel = 8`；
- 四道看积木题实测：`blocks` 分别为 4 / 2 / 3 / 6，答案键 `16 / 15 / 18 / 19` 均在选项里；
- 三道选组合题实测：卡片零散数 `[8,5,2] / [6,9,4] / [3,7,8]`，目标卡均在；
- 三道横式题实测：拖拽中 `.l7-ghost` 恰好 1 个、松手后空位填上 `17 / 18 / 19`，随后自动进下一题；
- 热区实测：空位右边界外 **13px** 拖进去能落子、外 **16px** 不落子（ghost 320 ms 后从 DOM 移除、数字键与题目都不变）；
- 答错实测（题型 C）：空位 `is-bad` = 1、未填数、`try_again` 播 1 次、题目不前进，数字键 `[17,16,18]` → `[16,17,18]`（答案位置 0 → 1）；
- 答错实测（题型 A / B）：数字键 `[15,18,16]` → `[16,18,15]`（答案位置 2 → 0）、卡片 `[2,8,5]` → `[5,8,2]`（答案位置 0 → 2），题目都不前进；
- 位置稳定实测：新积木落位前后，原有 4 块积木与那一捆的坐标 `dx = dy = 0`；
- 教学三幕实测：第一幕 12 块 → 15 块（3 块珊瑚色）；第二幕个位区 `.is-joined` = 1、徽标为「5」；第三幕竖式 `1|2 / 3 / 1|5`，十位 2 格高亮；
- 390×844 无横向溢出：三种题型 `scrollWidth === 390`；
- 全流程 `document.body.innerText` 与 `aria-label` / `title` / `alt` 均无 CJK，`documentElement.lang = 'en'`；
- 地图 7 个节点：最小间距 11px、最低节点标签底边 769px vs 底部提示顶边 779px、最高节点圆盘顶 91px（地图框顶 76px）；
- 素材缓存：清空 Cache Storage 后首进 692 ms 并显示读条（22 个请求 / 525 KB），二次进入 195 ms、读条不出现。
