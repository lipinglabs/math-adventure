# Level 3 · Orchard Harvest（果园大丰收）

> 10 以内加减法混合判断。3 幕教学 + 10 题（顺序每局打乱），三种题型混排。

| 项 | 值 |
|---|---|
| 关卡文件 | `level-lv03.js` |
| 数据 | `levels_data.js` → `levels[3]` |
| 语音 | `voice/lv03/`（22 条）+ `voice/common/`（4 条） |
| 音色 | `en_female_allison_uranus_bigtts`，`speech_rate = -15` |
| 选项数 | 符号题 2、算式题 3、数字题 3（见铁律 §6.5） |
| 判定 | 10 题首轮全对 = 金星并解锁 L4；有错 = 银星，题号不前进 |

---

## 1. 语音清单（22 条，全部英文）

### 教学（8 条）

| key | 台词 | 时长 |
|---|---|---|
| `t1_a` | Look! Three apples on the tree. | 3.1s |
| `t1_b` | Two more apples fly in. Now, we have more. Let's add! | 5.2s |
| `t1_c` | Three plus two equals five. | 2.7s |
| `t2_a` | Oh no! A strong wind is blowing. | 4.6s |
| `t2_b` | Two apples fall down and roll away. Now, we have less. Let's take away! | 7.1s |
| `t2_c` | Five minus two equals three. | 3.1s |
| `t3_a` | When we add, numbers go up. | 3.1s |
| `t3_b` | When we take away, numbers go down. | 3.6s |

### 题型 A · 点符号（4 题 × 2 条）

| 题 | 题干 | 答对后 |
|---|---|---|
| a1 | Four dogs, and three more run here. Do we add or take away? | Four plus three equals seven. |
| a2 | Six birds, and two fly away. Do we add or take away? | Six minus two equals four. |
| a3 | Five rabbits, and four more hop in. Do we add or take away? | Five plus four equals nine. |
| a4 | Seven fish, and three swim away. Do we add or take away? | Seven minus three equals four. |

### 题型 B · 点算式（3 条）

| key | 台词 |
|---|---|
| `b1_q` | Look at the balloons. Which number sentence matches this? |
| `b2_q` | Look at the birds. Which number sentence matches this? |
| `b3_q` | Look at the apples. Which number sentence matches this? |

### 题型 C · 点结果（3 条）

| key | 台词 |
|---|---|
| `c1_q` | Eight apples on the tree. Three fall down. How many are left? |
| `c2_q` | Five apples on the tree. Four more grow. How many apples now? |
| `c3_q` | Six apples on the tree. Two more grow. How many apples now? |

**答题环节一律不自答**：题干里的问句播完即停，画面留白（铁律 §6.1）。

---

## 2. 三幕教学（点按推进）

### 第一幕 · 3 + 2

1. 树 3 个苹果依次弹入 → `t1_a`
2. 停 1 秒 → `t1_b` 同时两只蓝鸟从左侧叼苹果飞入，把苹果放到树冠第 4、5 个格位后飞走
3. 算式条 `3 + 2 = 5` 逐块弹入 → `t1_c`
4. 播完定格，等点击

### 第二幕 · 5 − 2

1. 树 5 个苹果弹入 → 起风（三条浅蓝风纹循环扫过）→ `t2_a`
2. 风停，停 1 秒 → `t2_b` 同时最右两枚苹果脱枝、下落旋转、滚出屏幕并淡出（格位保留）
3. 算式条 `5 − 2 = 3` → `t2_c` → 定格等点击

### 第三幕 · 加减号

- 左绿 `+`、右红 `−` 两张卡片，各 4 枚小苹果
- `t3_a` 时左卡高亮、4 枚苹果向中央合拢（合起来 = 加法）
- `t3_b` 时右卡高亮、右侧 2 枚苹果上飘淡出（拿走 = 减法）
- 播完定格等点击

---

## 3. 三种题型

| 题型 | 画面 | 交互 | 答对 | 答错 |
|---|---|---|---|---|
| A `sign` | 果园舞台：先 a 只，1.1 秒后 b 只跑入 / 离开 | 绿 `+` / 红 `−` 两个大键 | 播**算式语音**（教学内容）+ 星音，播完进下一题 | 抖动 + `Try again`（同题仅一次）+ 选项换位 |
| B `sentence` | 同上，播放 a − b 或 a + b 的变化 | 3 张算式卡（正确句 + 2 个「成立但不匹配画面」的干扰句） | 星音 + 卡片变绿，680ms 进下一题 | 抖动 + 换位 |
| C `number` | 果园树：a 枚苹果，1.2 秒后 b 枚掉落 / 长出 | 3 个数字键（答案 + 最近的两个干扰值） | 星音 + 星星迸发，680ms 进下一题 | 抖动 + 换位 |

干扰句生成规则（都数学成立、但都不描述当前画面）：

- 减法 `a − b = r` → `a + b = a+b`、`b + r = a`
- 加法 `a + b = r` → `a − b = a−b`、`r − b = a`

例：5 − 2 的三个选项是 `5 − 2 = 3`、`5 + 2 = 7`、`2 + 3 = 5`。

---

## 4. 动画与位置稳定

- 苹果、动物都放在固定格位上（`SPOTS` / `layoutField` 一次算好坐标）；
- 「再来 b 个」只在**预先留空的格位**里生成，不挤动已在场的；
- 「走掉 b 个」只做位移 + 淡出，动画结束 `visibility: hidden`，**占位留在文档流**；
- 因此飞走 / 掉落后，剩余物件坐标零位移（铁律 §5.7）。

---

## 5. 验收结果（2026-10-29）

- 22 条语音全部可解码，合计 93.8 秒，`voice/lv03` 共 796 KB（整关含公共语音约 0.92 MB，低于 1.5 MB 预算）；
- 10 题全对 → `gold`，`unlockedLevel = 4`；
- 三种题型答错：选项集合不变、顺序与答案位置都改变，题号不前进；
- 位置稳定：题型 A 7 只动物、题型 B 5 只气球、题型 C 8 枚苹果，离场前后剩余物件 `dx = dy = 0`；
- 390×844 无横向溢出（舞台 330，卡片行 344）；
- 教学三幕 + 答题 + 结算全程 `document.body.innerText` 无 CJK。
