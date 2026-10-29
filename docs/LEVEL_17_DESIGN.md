# Level 17 · Corn Basket（小猴子搬玉米 · 进位加法）

> 第三阶段第二关，接着 L16 的凑十，换成「藤筐 + 地上的玉米」。
> 3 幕教学（8 个在筐里 + 5 个在地上 → 搬 2 个凑满 → 拆数链）+ 10 题三种题型。
> 相关铁律：§5.8（十格阵）、§5.15（凑十与满十打包）、§6.8（两段式）、§6.14（听算式选画面 / 拆数链）。

| 项 | 值 |
|---|---|
| 关卡文件 | `level-lv17.js` |
| 数据 | `levels_data.js` → `levels[17]` |
| 语音 | `voice/lv17/`（19 条）+ `voice/common/`（4 条），合计 86.7 秒（关内 74.9 秒 / 586 KB） |
| 音色 | `en_female_allison_uranus_bigtts`，`speech_rate = -15` |
| 选项数 | 拖拽 3 个数字键 / 听算式 3 张图 / 拆数 3 个数字键（§6.5） |
| 判定 | 10 题首轮全对 = 金星；有错 = 银星，不解锁 |

---

## 1. 语音清单（19 条，全部英文）

### 教学（7 条）

| key | 台词 | 时长 | 配的画面 |
|---|---|---|---|
| `t1_a` | Look! The little monkey has eight corn in the basket. | 4.30s | 筐里 8 个玉米 + 地上 5 个 |
| `t1_b` | And five more corn on the ground. | 2.86s | 同上，停 1 秒 |
| `t2_a` | We move two corn to fill the basket. Now we have ten! | 5.47s | 说到 1.86s 时玉米起飞 |
| `t2_b` | And there are three corn left on the ground. | 3.82s | 满十打包盒 + 地上剩 3 个 |
| `t2_c` | Ten plus three equals thirteen. Eight plus five equals thirteen! | 5.21s | 同上 |
| `t3_a` | When we add, we first make a ten, then add the rest. | 5.50s | 数币从 5 飞向 8 |
| `t3_b` | Eight plus five equals thirteen. | 3.12s | 拆数链补齐，最后一行亮起 |

### 答题（12 条）

| key | 台词 | 用于 |
|---|---|---|
| `a1_q` | Seven corn in the basket. Drag some corn to fill the ten-frame. | A（7+6） |
| `a2_q` | Eight corn in the basket. Drag some corn to fill the ten-frame. | A（8+4） |
| `a3_q` | Nine corn in the basket. Drag some corn to fill the ten-frame. | A（9+8） |
| `a4_q` | Six corn in the basket. Drag some corn to fill the ten-frame. | A（6+5） |
| `a_total_q` | How many in total? | A 第二段（凑满后） |
| `b1_q` | Find nine plus three. | B（9+3） |
| `b2_q` | Find eight plus two. | B（8+2） |
| `b3_q` | Find six plus five. | B（6+5） |
| `c1_q` | Eight plus five. We split five into two and three. | C（8+5） |
| `c2_q` | Nine plus six. We split six into one and five. | C（9+6） |
| `c3_q` | Seven plus five. We split five into three and two. | C（7+5） |
| `c_ask_q` | What is the missing number? | C 共用追问 |

---

## 2. 教学分镜

### 第一幕：8 + 5

- 左边藤筐（十格阵）：第 1–8 格有玉米，第 9、10 格空着。
- 右边地上：5 个玉米按 2 列排（2 / 2 / 1）。
- 左下角一只小猴子（纯 SVG）。`t1_a` → `t1_b` → 停 1 秒。

### 第二幕：搬两个凑十

1. `t2_a` 起播。
2. **1.86s**：地上最后两个玉米依次沿弧线飞进第 9、10 格（520ms，中途抬高 30px）；
   每飞一个，小猴子**蹲一下**（`bounce`）。
3. 落定 → 整筐 `.is-full` 发光 + 「咔」→ 230ms 后 `.is-pack`：金边 + 左上角「10」标签弹出。
4. `t2_a` 播完停 1 秒 → `t2_b` → `t2_c` → 定格等点击。

### 第三幕：拆数链

```
8 + 5 = 13
8 + 2 + ? = 13
10 + ? = 13
```

1. 链条弹出时，「2」和「10」两格先藏着。
2. `t3_a` 播到 0.9s：一枚金色的「2」从 5 那格飞向 8 那格（760ms，中途下压再上抬）。
3. 落定：「2」格与「10」格显形（弹出即回弹），260ms 后两个 `?` 同时翻成 **3**。
4. `t3_a` 播完 → `t3_b` → 最后一行亮一圈金边 → 定格等点击。

---

## 3. 题型（10 题整份打乱）

### A · 拖玉米填满筐 → 点总数（4 题）

| 题 | 筐里 | 地上 | 要搬 | 答案 | 三个键 |
|---|---|---|---|---|---|
| 1 | 7 | 6 | 3 | 13 | 12 / 13 / 14 |
| 2 | 8 | 4 | 2 | 12 | 11 / 12 / 13 |
| 3 | 9 | 8 | 1 | 17 | 16 / 17 / 18 |
| 4 | 6 | 5 | 4 | 11 | 10 / 11 / 12 |

- 开场只播 `a1_q…a4_q`，**没有任何数字键**（§6.8）；玉米只能落进空格。
- 筐满了再拖一律弹回、不记错。凑满 → 发光 + 打包 → 播 `a_total_q` → 700ms 后出 3 个键。
- 3.4 秒还没动手：空格脉冲 + 筐角浮出小手。

### B · 听算式，点对应的那筐（3 题）

| 题 | 目标 | 干扰 1 | 干扰 2 | 和 |
|---|---|---|---|---|
| 1 | 9+3（12） | 8+2（10） | 6+5（11） | 12 / 10 / 11 |
| 2 | 8+2（10） | 9+3（12） | 7+4（11） | 10 / 12 / 11 |
| 3 | 6+5（11） | 8+4（12） | 7+6（13） | 11 / 12 / 13 |

- 三张图写死成同一个模板：**小筐（5×2 的迷你十格阵）+ 地上几个玉米**。
- 三组 `(筐, 地)` 两两不同，且**目标和唯一**，所以「算总数」和「听算式」都能指向同一张。
- 点错：卡片摇晃 + `try_again`（每题一次）+ 三张重排；点对：卡片转绿 + 白勾 + 星星。

### C · 拆数链填空（3 题）

| 题 | 链 | 缺的数 | 三个键 |
|---|---|---|---|
| 1 | 8+5=13 / 8+2+?=13 / 10+?=13 | 3 | 2 / 3 / 4 |
| 2 | 9+6=15 / 9+1+?=15 / 10+?=15 | 5 | 4 / 5 / 6 |
| 3 | 7+5=12 / 7+3+?=12 / 10+?=12 | 2 | 1 / 2 / 3 |

- 三个键只含一个正确答案（另一个数字无法让任何一行成立）。
- 答对：两个 `?` 一起翻成同一个数、转绿、回弹，最后一行亮金边，定格 1.1 秒后换题。

---

## 4. 实现要点

| 位置 | 做法 |
|---|---|
| 筐 | `.l17-basket` 藤色渐变 + `repeating-linear-gradient` 编织纹，里面放标准 `.tenframe`（§5.8） |
| 打包 | `.is-pack` 加金边环与「10」标签（左上角，避开右下的地上玉米）；`.tenframe.is-full` 负责发光 |
| 飞行 | `flyArc()` 用两元素中心差算 `dx/dy`，中间关键帧抬 30px 形成抛物线 |
| 拖拽 | 每根玉米一个 `pointerdown`；> 8px 生成 `.l17-ghost`；落点用整筐外扩 14px；命中后幽灵先飞进空格再换本体 |
| 两段式 | `completeFill()` 才播 `a_total_q` 并 `later(paint, 700)`；`state.fillDone` 之前不建键 |
| 听算式 | 三张卡各带 `data-basket / data-ground`，判定比对这两个数；重排用 `Engine.quiz.reshuffle` |
| 拆数链 | 三行 flex，每行一个 `.l17-crow`；两个 `?` 共用一个 `fillBlanks()` |
| 尺寸 | 全部尺寸写在 CSS（`--cell` / `--c`），JS 只写列数，媒体查询才能盖住 |

---

## 5. 验收结果（2026-10-30，本地）

- 教学：第二幕两只玉米入筐后 `.is-full` + `.is-pack` + 「10」标签；第三幕「2」飞向 8 后
  `2`/`10` 显形、两个空同时填 3、最后一行 `is-lit`。
- 题型 A（7+6）：拖 1 个（热区正中）+ 轻点 2 个 → 筐内 10、`.is-pack`、键 `[12,13,14]`；
  被搬走的玉米只隐藏自身，其余格位 `slotShift = 0`。
- 题型 B（9+3）：三张图 `8+2 / 6+5 / 9+3` 乱序；点错一张 → `try_again` 1 次、三张重排、仍是 3 张；
  点对 → 绿框 + 白勾。
- 题型 C（8+5）：3 行、两个空、3 个键含 3；答对后 `.is-filled` 为 2、两处都是「3」、`is-lit` 为真。
- 全对：`gold`、解锁 18；错一题：`silver`、只到 17、`try_again` 播 1 次。
- 布局：390 / 375 都 `scrollWidth === innerWidth`；零 CJK（含 `aria-label`）。
- 地图：Stage 3 变 2 个节点（16 / 17），当前焦点在 17。
- 缓存：清空后首进 693ms 读条（19 个音频 / 586 KB），二次 172ms、`voiceReqs = 0`。
- 语音：23 条（19 关内 + 4 公共）全部可解码，合计 86.7 秒 / 678 KB。
