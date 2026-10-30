# Level 19 · Break the Ten（破十法 · 退位减法）

> 第三阶段第四关：个位不够减，就把那一捆十解开。
> 3 幕教学（一捆十根 + 三根 / 解绳散成十三根、拿走九根 / 竖式里 13 拆成 10 和 3）
> \+ 10 题（破十拖走 / 听算式点过程 / 找错误算式），整份打乱。
> 本关同时是**关卡背景图**的首个使用者（铁律 §5.16）。

| 项 | 值 |
|---|---|
| 关卡文件 | `level-lv19.js` |
| 数据 | `levels_data.js` → `levels[19]`（含 `background`） |
| 背景 | `assets/bg/bg_19.jpg`（960 × 1317，148 KB，本地静态） |
| 语音 | `voice/lv19/`（15 条）+ `voice/common/`（4 条），关内 59.6 秒 / 466 KB |
| 音色 | `en_female_allison_uranus_bigtts`，`speech_rate = -15` |
| 选项数 | 点选 3 / 过程卡 3 / 找错句 3（§6.5） |
| 判定 | 首轮 10 题全对 = 金星并解锁 20；有错 = 银星，只到 19 |

---

## 1. 语音清单（15 条，全英文）

### 教学（6 条）

| key | 台词 | 时长 | 配的画面 |
|---|---|---|---|
| `t1_a` | Look! One ten and three ones make thirteen. Now, let's take away nine. | 6.46s | 一捆十根 + 三根零散 |
| `t2_a` | We don't have enough ones. So, we break the ten into ten ones. | 5.66s | 绑带弹飞、十根散开 |
| `t2_b` | Now we have thirteen ones. Take away nine, and one is left. | 7.10s | 九根依次飞走，剩四根 |
| `t2_c` | So, thirteen minus nine equals four! | 3.34s | 剩余四根被领圈框住 |
| `t3_a` | When we don't have enough ones, we break the ten. | 4.06s | 竖式出现，13 拆成 10 和 3 |
| `t3_b` | Thirteen minus nine equals four. | 3.12s | 10 − 9 = 1、1 + 3 = 4、结果落 4 |

> 用户给的长句按 §2.5「单句 ≤14 词」拆成 `t2_a / t2_b / t2_c` 与 `t3_a / t3_b`。
> 教学里没有问句，因此不需要自问自答；每幕仍以「语音播完 + 定格 + 点击」收尾。

### 答题（9 条）

| key | 台词 | 用于 |
|---|---|---|
| `a1_q` | Fifteen minus eight. Break the ten and take away eight. | 题型 A（15 − 8） |
| `a2_q` | Twelve minus nine. Break the ten and take away nine. | 题型 A（12 − 9） |
| `a3_q` | Sixteen minus seven. Break the ten and take away seven. | 题型 A（16 − 7） |
| `a4_q` | Fourteen minus six. Break the ten and take away six. | 题型 A（14 − 6） |
| `a_left_q` | How many are left? | 题型 A 拿够之后（共用） |
| `b1_q` | Find fourteen minus eight. | 题型 B |
| `b2_q` | Find thirteen minus seven. | 题型 B |
| `b3_q` | Find twelve minus nine. | 题型 B |
| `c_q` | Find the wrong number sentence. | 题型 C（共用） |

---

## 2. 教学分镜

### 第一幕：认识 13

- 桌上（`.l19-mat`）左边一捆**十根**小棒，绑着珊瑚色绑带；隔 18px 缝，右边**三根**零散。
- 小棒是纯 CSS 画的：11 × 126，竹节用两道 1.5px 高光 / 暗线。
- 语音 `t1_a` 播完停 1 秒，等点击。

### 第二幕：破十

1. `t2_a` 说到「So, we break the ten…」时（2.6 s）绑带**弹飞**（下坠 30px、旋转 28°、淡出 440ms）。
2. 160 ms 后整捆淡出，十根按 24 ms 间隔从原位「散」出来（`opacity` + `translateY` 过渡，无重排）。
3. 停 1 秒，`t2_b` 说到「Take away nine」时（2.9 s），前九根依次向上飞走（每根错 68 ms，位移 −92px、旋转 ±20°）。
4. `t2_c` 同时给剩余四根套上**绿色领圈**（按实际包围盒算，§5.7.7），四根依次轻弹。

### 第三幕：竖式与拆分

```
   1  3
−     9
────────
      4
```

- 十位 / 个位两列，减号**右对齐塞进十位列**、紧贴个位（§5.15.6）；结果只在个位落 4 并转绿。
- 竖式下方三行依次亮起：`13 = 10 + 3` → `10 − 9 = 1` → `1 + 3 = 4`。
- 语音 `t3_a` 说到「we break the ten」时才亮第一行（1.9 s），`t3_b` 期间亮后两行并落结果。

---

## 3. 题型（10 题整份打乱）

### 题型 A · 破十拖走（4 题）

| 题 | 捆里 | 零散 | 拿走 | 剩 |
|---|---|---|---|---|
| 1 | 10 | 5 | 8 | 7 |
| 2 | 10 | 2 | 9 | 3 |
| 3 | 10 | 6 | 7 | 9 |
| 4 | 10 | 4 | 6 | 8 |

1. 开局只有一个**扎着绑带**的捆，**没有任何数字键**（§6.8）。
2. 点那捆 → 绑带弹飞、十根散开；这时才允许拿。
3. 拖走或轻点任意一根 → 向上飞走并隐藏自身；其余小棒与格位**一动不动**（§5.7）。
4. 拿够 b 根 → 播 `How many are left?`，同时出 3 个数字键；再想多拿无效。
5. 点对 → 金星进度 +1，700 ms 后下一题；点错只重排。

### 题型 B · 听算式点破十过程（3 题）

每张卡是两行：

```
10 − 8 = 2
   ↓
2 + 4 = 6
```

- 三张卡的 `(减数, 个位)` 两两不同，**答案也互不相同**，所以「听懂算式」和「算出来」指向同一张。
- 语音点名一道题（如 `Find fourteen minus eight.`），孩子点对应过程卡。
- 点错只重排三张、题号不动，`try_again` 每题一次。

### 题型 C · 找错误算式（3 题）

| 题 | 三句 | 错在哪 |
|---|---|---|
| 1 | 12−7=5 / **15−9=7** / 16−8=8 | 真值 6（差 +1） |
| 2 | 14−8=6 / **13−6=9** / 17−9=8 | 真值 7（差 +2） |
| 3 | 11−8=3 / **15−7=6** / 14−5=9 | 真值 8（差 −2） |

- 三句都退位、都成立除了一句；错法分别是 +1 / +2 / −2，不能靠「差 1」猜。
- 点对：卡片转绿 + 白勾，随后**只把结果格**翻一下改成正确答案（§6.11），定格 1.5 秒。
- 点错：摇晃 + `try_again` + 三句重排。

---

## 4. 背景图（§5.16）

| 项 | 做法 |
|---|---|
| 文件 | `assets/bg/bg_19.jpg`（960 × 1317，JPEG q82，148 KB） |
| 挂载 | `levels_data.js`：`background: 'assets/bg/bg_19.jpg'` + `assets.images: ['assets/bg/bg_19.jpg']` |
| 加载 | `Engine.loadLevel` 把图片当普通素材：Cache Storage 命中 → blob URL；未命中才下载 |
| 显示 | `app.js` 把 blob URL 写到 `#level-bg`，`is-on` 淡入 560ms |
| 可读性 | 层上叠奶油薄纱（顶部 0.74 / 中部 0.44 / 底部 0.8） |
| 清理 | `exitLevel()` 先摘 `is-on` 再清 `background-image`；`releaseLevel()` 撤销 blob |

画面：暖奶油色墙面 + 浅木地板，左下一只藤篮、右侧两盆绿植，中间大片留白；无文字、无人物。
原始 PNG 水印在导出时裁掉（下边 8.5%），只保留干净 JPEG。

---

## 5. 实现要点

| 位置 | 做法 |
|---|---|
| 固定格位 | `makeRow(count, openFrom)` 一次性建满 `a` 个 15×132 的格位；前 10 根先 `is-hidden` |
| 解绳 | `breakBundle()`：绑带 CSS 动画 → 捆淡出 → 十根按 `--d` 延迟从隐藏态过渡出来 |
| 拿走 | `.is-away` 只跑 CSS keyframes（`--dx / --rot / --d`），520ms 后加 `.is-gone`（`visibility:hidden`） |
| 计数 | `state.removed += 1`，到 `b` 才 `ask()`；`askShown` 之后不再接受拿取 |
| 拖拽 | `pointerdown` 造 ghost（`position:fixed`），`pointermove` 跟随，`pointerup` 一律算拿走 |
| 领圈 | `ringAround(mat, slots)` 取剩余小棒的包围盒，绝对定位覆盖层 |
| 过程卡 | `processCard([a,b])` 现算 `10−b` 与 `(10−b)+(a−10)`，不在数据里写死 |
| 找错句 | `s.a - s.b !== s.shown` 判定；翻结果格用 `is-flip → is-fixed` |

---

## 6. 验收结果（2026-10-30）

- 语音 15 条关内 + 4 条公共，全部可解码；关内合计 **59.6 秒 / 466 KB**，加背景共 **614 KB**（≤1.5 MB）。
- 题型 A（15−8）：开局 0 个数字键；点捆后 15 根；拖走 1 根 + 轻点 7 根 → 出 3 个键且含 7；
  再点多余小棒无效（仍 8 根已拿）；剩余小棒与全部格位 **位移 0**。
- 题型 B：3 张卡、`(减数,个位)` 三组互不相同；点错后重排且**答案位置必变**，`try_again` 1 次。
- 题型 C：三题各一句不成立；点对后结果格翻成 6 / 7 / 8，0.7 秒仍在、1.6 秒后换题。
- 全对 → `gold`、`unlockedLevel = 20`；错一处 → `silver`、只到 19。
- 背景：首次进入 `bgReqs = 1`（148 KB）+ 15 个音频（466 KB），读条 676 ms；
  二次进入 `bgReqs = 0`、`voiceReqs = 0`、149 ms、无读条，`.level-bg` 仍 `is-on`。
- L18 进入时背景层为空；退关后 `.level-bg` 无 `is-on`、`backgroundImage` 为空。
- 390 / 375 宽都 `scrollWidth === innerWidth`；零 CJK（含 `aria-label`）。
- 地图 Stage 3 变 4 个节点（16–19），第 19 关标签 `Break the Ten`。
