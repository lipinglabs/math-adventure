# Level 9 · Quick Tap（快速点选 · 不进位加法，纯数字）

> 到这个阶段，积木和车库都退场，屏幕上只剩算式。孩子要在三个数字里一下点中答案；
> 第三型还带 5 秒倒计时，逼出「一看就答」的熟练度。
> 2 幕教学 + 10 题（顺序每局打乱），三种题型混排。

| 项 | 值 |
|---|---|
| 关卡文件 | `level-lv09.js` |
| 数据 | `levels_data.js` → `levels[9]` |
| 语音 | `voice/lv09/`（12 条）+ `voice/common/`（4 条），合计 61.1 秒（关内 49.3 秒） |
| 音色 | `en_female_allison_uranus_bigtts`，`speech_rate = -15` |
| 选项数 | 纯算式 3、找错句 3 句、闪电题 3（见铁律 §6.5） |
| 按键 | 按下 90ms 内响应：`translateY(5px) scale(.96)` + 投影压扁（铁律 §5.12） |
| 限时 | 5 秒进度条，超时与答错同权、原地重做（铁律 §6.9） |
| 判定 | 10 题首轮全对 = 金星并解锁 L10；有错 = 银星，题号不前进 |

---

## 1. 语音清单（12 条，全部英文）

### 教学（4 条）

| key | 台词 | 时长 |
|---|---|---|
| `t1_a` | Look at the blocks. One ten and three ones. That's thirteen. | 6.62s |
| `t1_b` | Now, we see the numbers. Ten plus three equals thirteen. | 5.71s |
| `t2_a` | Let's add the ones. Two plus five equals seven. | 5.23s |
| `t2_b` | One ten and seven ones make seventeen. | 4.06s |

> 两幕教学**都没有问句**（台词按要求给定），因此不涉及「问句悬空」。
> `t1_a` 与 `t1_b` 之间、`t2_a` 与结果之间各由代码停 1 秒，是「先看积木、再看数字」的演示节拍。

### 题型 A · 纯数字点选（4 条）

| key | 台词 | 题目 |
|---|---|---|
| `a1_q` | Fourteen plus three. Tap the right answer. | 14 + 3 |
| `a2_q` | Eleven plus five. Tap the right answer. | 11 + 5 |
| `a3_q` | Thirteen plus five. Tap the right answer. | 13 + 5 |
| `a4_q` | Twelve plus seven. Tap the right answer. | 12 + 7 |

### 题型 B · 找错误算式（1 条共用）

| key | 台词 | 用于 |
|---|---|---|
| `find_wrong` | Find the wrong number sentence. | 三题共用 |

### 题型 C · 限时闪电点选（3 条）

| key | 台词 | 题目 |
|---|---|---|
| `c1_q` | Quick! Eleven plus six equals what? | 11 + 6 |
| `c2_q` | Quick! Thirteen plus six equals what? | 13 + 6 |
| `c3_q` | Quick! Fourteen plus four equals what? | 14 + 4 |

> 答题环节**绝不自动补答案**，题干播完画面留白。

---

## 2. 教学分镜

### 第一幕：从具象到数字

- 画面：左边 10 块积木（5×2，一个十）+ 加号 + 右边 3 块积木。
- 积木一块块落座，配 `t1_a`（「Look at the blocks. One ten and three ones. That's thirteen.」）。
- 停 1 秒 → 积木原地化开（320 ms 缩放淡出），**同一格位**里浮出纯算式 `10 + 3 = 13`，
  配 `t1_b`（「Now, we see the numbers. Ten plus three equals thirteen.」）。
- 播完定格，点屏幕进入第二幕。

### 第二幕：个位加法速算

- 画面：`12 + 5 = ?`。
- `t2_a`（「Let's add the ones. Two plus five equals seven.」）→ 个位的 `2` 和 `5` 同时转金闪烁、各弹一下；
  0.9 秒后算式上方浮出工作小条 `2 + 5 = 7`。
- 停 1 秒 → 结果格从 `?` 变成 `17`：十位 `1` 是金色（不动的那颗），个位 `7` 是绿色（刚算出的）。
- `t2_b`（「One ten and seven ones make seventeen.」）播完定格，点屏幕 → `common/ready` → 进答题。

---

## 3. 题型

### A · 纯数字点选（4 题）

屏幕中央一个算式 `14 + 3 = ?`，下方 3 个大号数字键。点对了结果格立刻填上答案并转绿。

### B · 找错误算式（3 题）

三张卡各一句算式，其中**恰好一句**是错的（`a + b ≠ shown`）。听「Find the wrong number sentence.」
找出错的那句。点对了整卡转绿；点错记一次错并重新洗牌三句。

### C · 限时闪电点选（3 题）

算式上方一条 5 秒进度条（剩 40% 起转暖红），下方 3 个数字键。
**超时或点错都原地重做**：进度条归零后重新起表，题目不换。

---

## 4. 实现要点

- 教学第一幕的「积木 → 算式」用**同一个 grid 格位**（`.l9-stage > * { grid-area: 1/1 }`）叠放，
  切换只做 `visibility` 与透明度，容器高度不变，绝不会把画面顶动（§5.7）。
  注意工作小条 `.l9-bubble` 必须排除在这条规则外，否则它会以**内容区**为基准、贴到算式上。
- 数字按「数」拆块：教学第二幕把 `12` 拆成 `1` `2` 两块（要单独高亮十位）；
  题目里 `14` 是一整块（孩子要一眼读出「十四」，不是「一 四」）。
- 倒计时用 WAAPI 直接动 `transform: scaleX(1) → scaleX(0)`（5 秒 linear），
  同时挂一个 `setTimeout` 做超时判定；答对 / 答错 / 超时 / 切题都调 `stopTimer()`（cancel + clearTimeout）。
- 超时复用 `wrong()`：记一次错、每题只播一次 `try_again`，1 秒后 `arm()` 重新起表。
- 点错时先 `locked = true` 挡住连点，420 ms 后重排选项并重新起表。
- 找错句每题的三句在构建时就算好 `a + b !== shown` 的那一句，
  洗牌只换顺序，不换内容（`reshuffle(list, bad, keyOf)`）。
- 按键反馈：`.l9-key` / `.l9-card` 的 `transition` 统一 90 ms，`:active` 里 `translateY(5px) scale(.96)` 并压掉投影（§5.12）。

---

## 5. 验收结果（2026-10-29）

- 16 条音频（12 关内 + 4 公共）全部 `decodeAudioData` 成功，合计 **61.1 秒 / 478 KB**（关内 49.3 秒，预算 1.5 MB）；
- 10 题全对 → `result-star--gold`，`Progress.summary().unlockedLevel = 10`；
- 四道纯算式题实测：`14+3`、`11+5`、`13+5`、`12+7` 点对后结果格分别变成 `17 / 16 / 18 / 19`；
- 三道找错句实测：三组分别 `[13+4=16, 12+5=17, 11+3=14]`、`[12+5=17, 14+3=18, 11+7=18]`、`[12+6=19, 11+5=16, 13+6=19]`，每组恰好一句错；
- 找错句点错实测：点中正确句子 → 题目不变、三句重排（顺序变化）、`try_again` 播 1 次；
- 闪电题超时实测：5.3 秒后题目对象不变、`.is-out` = 1、`try_again` 播 1 次、选项与顺序都不变；再过 1 秒进度条回到 `scaleX(1)` 并重新计时；
- 闪电题点错实测：`[18,16,17]` → `[18,17,16]`（答案位置 2 → 1）、进度条重新起表、题目不换；
- 闪电题答对实测：进度条立刻 `scaleX(0)`；
- 三种题型 `scrollWidth === 390`；全流程 `innerText` 与 `aria-label` / `title` / `alt` 无 CJK，`lang = en`；
- 地图 9 个节点：最小间距 6px、最低标签底边 767px vs 底部提示 779px、最高圆盘顶 92px（地图框顶 76px）；
- 素材缓存：清空 Cache Storage 后首进 691 ms 并显示读条（12 个请求 / 386 KB），二次进入 124 ms、读条不出现。
