# Level 4 · Ten and Some More（11–19 与十格阵）

> 认识 11–19：一个满十 + 零散个位。3 幕教学 + 10 题（顺序每局打乱），三种题型混排。

| 项 | 值 |
|---|---|
| 关卡文件 | `level-lv04.js` |
| 数据 | `levels_data.js` → `levels[4]` |
| 语音 | `voice/lv04/`（16 条）+ `voice/common/`（4 条） |
| 音色 | `en_female_allison_uranus_bigtts`，`speech_rate = -15` |
| 选项数 | 识数 3、匹配 3、拖拽无选项（见铁律 §6.5） |
| 十格阵 | 严格 2 行 × 5 列，左上 → 右下填充（铁律 §5.8） |
| 判定 | 10 题首轮全对 = 金星并解锁 L5；有错 = 银星，题号不前进 |

---

## 1. 语音清单（16 条，全部英文）

### 教学（6 条）

| key | 台词 | 时长 |
|---|---|---|
| `t1_a` | Let's count! We have one, two, three... | 5.2s |
| `t1_b` | Look! Ten apples fill the box. This is a ten. | 5.0s |
| `t2_a` | Ten apples, and three more apples. How many in total? | 4.7s |
| `t2_b` | One, two, three... thirteen! One ten and three ones make thirteen. | 7.8s |
| `t3_a` | Here is one ten. Add six more. What number is it? | 4.1s |
| `t3_b` | One ten and six ones make sixteen. | 3.6s |

### 题型 A · 看十格阵点数字（4 条）

| key | 台词 |
|---|---|
| `a1_q` | Look at the ten-frame. How many apples in total? |
| `a2_q` | Here is a full ten-frame. How many apples altogether? |
| `a3_q` | Count them all. How many apples do you see? |
| `a4_q` | A ten-frame and some more apples. How many in all? |

### 题型 B · 听数字选十格阵（3 条）

| key | 台词 |
|---|---|
| `b1_q` | Find the number fifteen. |
| `b2_q` | Find the number twelve. |
| `b3_q` | Find the number eighteen. |

### 题型 C · 拖拽凑数（3 条）

| key | 台词 |
|---|---|
| `c1_q` | Put fifteen apples in the boxes. |
| `c2_q` | Put thirteen apples in the boxes. |
| `c3_q` | Put seventeen apples in the boxes. |

**答题环节一律不自答**（铁律 §6.1）。

---

## 2. 三幕教学（点按推进）

### 第一幕 · 满十

1. 左侧空十格阵 + 右侧 3 个散苹果 → `t1_a`（数这 3 个）
2. 停 1 秒 → `t1_b` 同时 10 个苹果从右侧斜向飞入十格阵，逐格落位（每格 85 ms）
3. 全部落位后格子发光呼吸，强调「这一整块就是一个十」→ 定格等点击

### 第二幕 · 认识 13

1. 满十的十格阵 + 右侧 3 个散苹果 → `t2_a`（问句）
2. 停 1 秒 → `t2_b` 同时大数字 `13` 弹入屏幕中央，三枚散苹果依次弹跳
3. 播完定格等点击

### 第三幕 · 凑一凑

1. 左满十、右空十格阵 → `t3_a`（问句）
2. 停 1 秒 → `t3_b` 同时 6 个苹果从左侧飞入右框，随后大数字 `16` 弹入
3. 播完定格等点击

---

## 3. 三种题型

| 题型 | 画面 | 交互 | 答对 | 答错 |
|---|---|---|---|---|
| A `count` | 满十十格阵 +「+」+ 零散苹果行 | 3 个数字键（答案 ±2/±4 取值） | 星音 + 十格阵发光，680 ms 进下一题 | 抖动 + `Try again`（同题一次）+ 换位 |
| B `pick` | 三张选项卡，每张「满十阵 + 部分填充阵」 | 点选与所听数字相符的一张 | 卡片变绿 + 星音 | 抖动 + 换位 |
| C `build` | 左满十阵 + 右空阵 + 下方虚线苹果堆 | 从苹果堆拖拽苹果到右阵（拖到框里或轻点苹果堆都会放一个；点右阵也能放） | 放够目标数自动完成：双阵发光 + 大数字，520 ms 后进下一题 | 无错误态（凑数任务） |

**凑数规则**：目标数 N = 10 + 个位；左阵预置满十（「一个十」），孩子只需拖 `N − 10` 个（2–8 个），
这正是「一个十 + 零散个位」的表征，也避免让 3–6 岁孩子重复拖 15 次。

---

## 4. 动画与实现要点

- 十格阵由 `makeFrame()` 生成固定 10 个 `.tf-cell`，`fillFrame()` 按左上→右下填格；
- 飞入动画用 Web Animations 在格子内部做 `translate + scale`，**不改变布局**；
- 大数字 `13 / 16` 用独立元素弹入，退场时整块 DOM 随题目重建销毁；
- 拖拽用 Pointer Events：`pointerdown` 在苹果堆上生成跟随指针的 ghost（`position: fixed`），
  `pointerup` 命中右阵才落子；拖到别处 ghost 淡出、不落子；`pointermove` 位移 < 6px 视为轻点，也算取一个。

---

## 5. 验收结果（2026-10-29）

- 16 条语音全部可解码，合计 60.5 秒，`voice/lv04` 共 516 KB（整关含公共语音约 0.63 MB）；
- 十格阵实测 `grid-template-columns: 38px ×5`、2 行，填充数 10 / 6 正确；
- 10 题全对 → `gold`，`unlockedLevel = 5`；
- 答错：识数题 3 个数字、匹配题 3 张卡，集合不变、顺序改变，题号不前进；
- 拖拽：模拟指针拖到右阵命中即落子，ghost 正常创建与销毁；达到目标数自动结算；
- 390×844 无横向溢出（两框并排 346、选项卡 304）；
- 教学三幕 + 答题 + 结算全程 `document.body.innerText` 无 CJK。
