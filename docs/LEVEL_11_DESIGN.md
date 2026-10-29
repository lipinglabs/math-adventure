# Level 11 · Candy Share（分糖果 · 不退位减法）

> 第二阶段（知识点 C 的第 2 遍）：**18 − 5**。一整盒十颗不动，只从散落的个位糖果里拿走几颗。
> 3 幕教学 + 10 题（顺序每局打乱），三种题型混排；题型 C 是新的「找错句 + 改正演示」。

| 项 | 值 |
|---|---|
| 关卡文件 | `level-lv11.js` |
| 数据 | `levels_data.js` → `levels[11]` |
| 语音 | `voice/lv11/`（15 条）+ `voice/common/`（4 条），合计 69.9 秒（关内 58.1 秒） |
| 音色 | `en_female_allison_uranus_bigtts`，`speech_rate = -15` |
| 选项数 | 拖糖进盘再点剩余 3、听总数选糖果组 3 组、找错误算式 3 句（见铁律 §6.5） |
| 舞台 | 透明十格盒（2 × 5，固定 10 颗）+ 零散糖果（3 列向上堆叠）+ 椭圆盘（按 b 预建固定格位） |
| 判定 | 10 题首轮全对 = 金星并解锁 L12；有错 = 银星，题号不前进 |

---

## 1. 语音清单（15 条，全部英文）

### 教学（6 条）

| key | 台词 | 时长 |
|---|---|---|
| `t1_a` | Look at the candies. One full box of ten, and eight outside. That's eighteen. | 7.10s |
| `t2_a` | Let's take away five candies from the ones. | 3.79s |
| `t2_b` | Eight minus five equals three. | 2.66s |
| `t2_c` | So, eighteen minus five equals thirteen! | 3.79s |
| `t3_a` | When we take away, the box of ten stays the same. | 4.54s |
| `t3_b` | We only take away the ones. | 2.64s |

> 三幕教学**都没有问句**，所以不涉及「问句悬空」。`t1_a` 之后、`t2_a` 与 `t2_b` 之间各由代码停 1 秒，
> 是「先看拿走、再说算式」的节拍。

### 题型 A · 拖走指定颗数，再点剩下几颗（4 条 + 1 条共用问句）

| key | 台词 | 题目 |
|---|---|---|
| `a1_a` | There are seventeen candies. Take away four candies from the ones. | 17 − 4 |
| `a2_a` | There are eighteen candies. Take away five candies from the ones. | 18 − 5 |
| `a3_a` | There are sixteen candies. Take away two candies from the ones. | 16 − 2 |
| `a4_a` | There are nineteen candies. Take away four candies from the ones. | 19 − 4 |
| `how_many` | How many candies are left? | A 的收尾问句 |

> 题干与问句**拆成两条**：`a*_a` 一边念一边提示可以拖，等最后一颗落进盘里 0.42 秒后才播 `how_many`。

### 题型 B · 听总数，点出对应的那一组（3 条）

| key | 台词 | 目标 | 三张卡的零散颗数 |
|---|---|---|---|
| `b1_q` | Find the group that shows sixteen. | 10 + 6 | 8 / 6 / 5 |
| `b2_q` | Find the group that shows eighteen. | 10 + 8 | 8 / 7 / 6 |
| `b3_q` | Find the group that shows fourteen. | 10 + 4 | 5 / 4 / 6 |

### 题型 C · 找出错误的算式（1 条共用）

| key | 台词 |
|---|---|
| `find_wrong` | Find the wrong number sentence. |

三组句子（每组恰好一句错）：

| 组 | 三句 | 错的那句 |
|---|---|---|
| 1 | 15 − 3 = 12 / 16 − 4 = 11 / 14 − 2 = 12 | 16 − 4 = 11（应为 12） |
| 2 | 17 − 5 = 12 / 13 − 2 = 10 / 18 − 6 = 12 | 13 − 2 = 10（应为 11） |
| 3 | 19 − 7 = 12 / 15 − 4 = 12 / 16 − 3 = 13 | 15 − 4 = 12（应为 11） |

> 三句的错法各不相同（差 1 / 差 1 / 差 1 但数值不同），不能靠「看起来差不多」猜出来。

---

## 2. 教学分镜

### 第一幕：认识 18

- 透明十格盒（2 × 5）整组弹入，里面 10 颗糖；右侧零散 8 颗（3 列向上堆，最后一排 2 颗）。
- `t1_a`："Look at the candies. One full box of ten, and eight outside. That's eighteen."
- 语音结束后盒子加金边（`is-full`，§5.8 的「满十」强化），10 颗糖依次轻弹一下；停 1 秒。

### 第二幕：拿走 5 颗

- 同一套场景 + 右下方一个空盘（5 个固定格位，虚线边）。
- 一只半透明小手从零散糖滑向盘（2.6 秒循环，只是示意，不代替操作）。
- `t2_a`："Let's take away five candies from the ones." 从最上面一颗开始，每 190 ms 拿走一颗：
  糖本体淡出、格位留在原位（§5.7），盘里对应格位落下一颗，做「压扁 → 回弹」的 Q 弹落位（§5.11）。
- 停 1 秒后自答：`t2_b` "Eight minus five equals three."，同时绿环只圈住剩下的 3 颗、上方浮出「3」徽标。
- `t2_c`："So, eighteen minus five equals thirteen!"

### 第三幕：竖式规律

- 左边一小盒 10 颗，右边竖式 `18 / −5 / —— / 13`（`−5` 对齐个位，十位留虚线空格）。
- `t3_a` "When we take away, the box of ten stays the same." → 整盒套金环，两个十位 `1` 变金。
- `t3_b` "We only take away the ones." → 8 / 5 / 3 转绿并轻弹。

---

## 3. 题型

### A · 拖糖进盘，再点剩下几颗（4 题）

- 一盒 10 颗 + `a − 10` 颗零散（6–9 颗），下方一个盘（格位数 = `b`），盘上方一排 `b` 个小圆点。
- `a*_a` 播完才给零散组套绿虚线环、盘上方浮出小手；**拖糖阶段不判分、不出选项**（§6.8 两段式）。
- 拖拽按 §5.9：盘矩形四边各外扩 `HIT_PAD = 14px`；轻点糖果（位移 < 8px）同样落盘；
  落在热区外 → 320 ms 三段弹回、不落盘、不算错。
- 全部 `b` 颗落盘后：圆点淡出、盘转绿实线、绿环收在剩余的糖上，0.42 秒后播 `how_many` 并出 3 个数字键。
- 答错 → 重排数字键、停在原题；已经拖走的糖不会回去（动作已完成，问的是结果）。

### B · 听总数，点出对应的那一组（3 题）

- 三张卡竖排，每张「一盒 10 颗 + n 颗零散」，只差一两颗，必须真的数。
- 点错 → 摇晃 + 重排三张卡（错的那张不再是原位置），停在原题。

### C · 找出错误的算式（3 题）

- 三张卡各一句 `a − b = shown`，其中恰好一句不成立。
- 点中「正确的那两句」→ 记一次错、重排，题号不前进。
- 点中错句 → 卡片转绿 + 右上角对勾；0.26 秒后**只把结果格**翻成正确答案（`rotateX(88deg)`），
  落地轻弹，题面其它数字不动；定 1.5 秒后进下一题（§6.11）。

---

## 4. 实现要点

| 位置 | 做法 |
|---|---|
| 十格盒 | `candyBox()`：`.l11-grid` 固定 `repeat(5, var(--cell))` + `grid-auto-rows`，10 颗各有固定格位 |
| 零散糖 | `looseGroup()`：`column-reverse` 从下往上堆，每颗 `slot` 固定；拿走只加 `.is-gone`（`visibility: hidden`） |
| 盘子 | `plate()`：按 `b` 预建 `b` 个固定格位，落糖只填空位，盘不会长大（§5.7） |
| 落盘 | `dropIntoPlate()`：先入格位，再播 `translateY(-26px) scale(1.16,.74) → scale(.94,1.08) → 1`（§5.11） |
| 拖拽 | `bindCandyDrag()`：ghost 跟随手指（`translate(-50%,-50%)`），松手判热区；未命中三段弹回；`unmount()` 兜底清理 |
| 领圈 | `unionOf()` 取「还在场的糖」的实际包围盒，绿环用绝对定位贴上去，不圈空出来的上半截（§5.7 第 7 条） |
| 找错句 | 结果格 `is-flip` 翻一下再写新值 + `is-fixed` 转绿；对勾 `.l11-tick` 绝对定位在卡片右上 |
| 定格 | `correct(node, holdMs)`：B / A 型 700 ms，C 型 1500 ms（§6.11） |

---

## 5. 验收结果（2026-10-29）

- 语音 15 条关内 + 4 条公共，全部可解码，合计 **69.9 秒 / 547 KB**。
- 10 题全对 → `gold`，`unlockedLevel = 12`。
- 题型 A：初始零散 7 / 8 / 6 / 9 颗，拖完后盘里 4 / 5 / 2 / 4 颗，剩余糖与格位坐标 `dx = dy = 0`，
  拖动中 ghost 恰好 1 个、松手后 0 个。
- 热区：盘右边界外 **13px** 落得进、外 **16px** 弹回（ghost 清空、零散组不减少、不播 `try_again`）；
  轻点糖果同样落盘。
- 答错重排：数字键 `[12,13,14] → [14,12,13]`（答案 1→2）、组合 `[5,8,6] → [6,8,5]`（2→0）、
  句子 `14-2=12 | 16-4=11 | 15-3=12 → 16-4=11 | 14-2=12 | 15-3=12`；三型都停原题、`try_again` 各 1 次。
- 找错句：点「正确的那两句」记错且无对勾；点中错句后 `16-4=11 → 16-4=12`，卡片 `is-right` + 1 个对勾。
- 布局：三种题型 `scrollWidth 390 = innerWidth`；教学第一幕整行 346 px（22–368），零 CJK（含 `aria-label`）。
- 缓存：清空后首进 676 ms（15 个音频 / 455 KB，读条出现），二次进入 145 ms、读条不出现。
